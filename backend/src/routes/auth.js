import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { pool } from '../db/pool.js'
import { requireAuth, signToken } from '../middleware/auth.js'
import { googleProfile } from '../utils/google.js'
import { makeOtp, sendOtpEmail } from '../utils/mailer.js'
import { mapUser } from '../utils/map.js'
import { isValidWhatsApp, normalizePhone } from '../utils/whatsapp.js'

export const authRouter = Router()

async function storeOtp(email, purpose) {
  const otp = makeOtp()
  await pool.query('REPLACE INTO reset_tokens (email, otp) VALUES (?, ?)', [`${purpose}:${email}`, otp])
  return otp
}

async function readOtp(email, purpose) {
  const [rows] = await pool.query('SELECT otp, created_at FROM reset_tokens WHERE email = ?', [`${purpose}:${email}`])
  const row = rows[0]
  if (!row) return null
  const ageMs = Date.now() - new Date(row.created_at).getTime()
  if (Number.isNaN(ageMs) || ageMs > 10 * 60 * 1000) {
    await clearOtp(email, purpose)
    return null
  }
  return row
}

async function clearOtp(email, purpose) {
  await pool.query('DELETE FROM reset_tokens WHERE email = ?', [`${purpose}:${email}`])
}

async function sendAndStore(email, name, purpose) {
  const otp = await storeOtp(email, purpose)
  await sendOtpEmail({ to: email, name, otp, purpose })
}

authRouter.post('/register', async (req, res) => {
  try {
    const { name, email, password, country, university, education, skillLevel } = req.body || {}
    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email, and password are required.' })
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email])
    if (existing.length) return res.status(409).json({ message: 'An account with that email already exists.' })
    const id = `u-${Date.now()}`
    const passwordHash = await bcrypt.hash(password, 10)
    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, country, university, education, skill_level, interests, email_verified, xp, streak, created_at)
       VALUES (?, ?, ?, ?, 'student', ?, ?, ?, ?, ?, 0, 0, 0, ?)`,
      [id, name, email, passwordHash, country || '', university || '', education || '', skillLevel || 'Beginner', JSON.stringify([]), new Date().toISOString().slice(0, 10)],
    )
    await sendAndStore(email, name, 'verify')
    res.status(201).json({ message: 'Account created. Check your email for the OTP.', email })
  } catch (error) {
    res.status(500).json({ message: error.message || 'Could not register.' })
  }
})

authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {}
    const identity = String(email || '').trim()
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE email = ? OR name = ? OR email = ?',
      [identity, identity, `${identity.replace(/\s+/g, '').toLowerCase()}@users.local`],
    )
    const user = rows[0]
    if (!user || !(await bcrypt.compare(password || '', user.password_hash))) {
      return res.status(401).json({ message: 'Invalid email or password.' })
    }
    if (!user.email_verified) {
      await sendAndStore(user.email, user.name, 'verify')
      return res.json({ needsVerification: true, email: user.email, message: 'We emailed a verification code.' })
    }
    if (user.two_factor) {
      await sendAndStore(user.email, user.name, '2fa')
      return res.json({ twoFactor: true, email: user.email, message: 'We emailed a sign-in code.' })
    }
    res.json({ token: signToken(user), user: mapUser(user) })
  } catch (error) {
    res.status(500).json({ message: error.message || 'Could not sign in.' })
  }
})

authRouter.post('/google', async (req, res) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({ message: 'Set GOOGLE_CLIENT_ID in backend/.env' })
    }
    const profile = await googleProfile(req.body || {})
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [profile.email])
    let user = rows[0]
    if (!user) {
      const id = `u-google-${Date.now()}`
      const passwordHash = await bcrypt.hash(randomUUID(), 10)
      await pool.query(
        `INSERT INTO users (id, name, email, password_hash, role, interests, google_sub, email_verified, xp, streak, created_at)
         VALUES (?, ?, ?, ?, 'student', ?, ?, 1, 0, 0, ?)`,
        [id, profile.name, profile.email, passwordHash, JSON.stringify(['Google']), profile.sub || null, new Date().toISOString().slice(0, 10)],
      )
      const [fresh] = await pool.query('SELECT * FROM users WHERE id = ?', [id])
      user = fresh[0]
    } else if (!user.email_verified && profile.verified) {
      await pool.query('UPDATE users SET email_verified = 1 WHERE id = ?', [user.id])
      user.email_verified = 1
    }
    if (profile.sub && !user.google_sub) {
      await pool.query('UPDATE users SET google_sub = ? WHERE id = ?', [profile.sub, user.id])
      user.google_sub = profile.sub
    }
    res.json({ token: signToken(user), user: mapUser(user) })
  } catch (error) {
    res.status(401).json({ message: error.message || 'Google sign-in failed.' })
  }
})

authRouter.post('/verify-email', async (req, res) => {
  try {
    const { email, otp } = req.body || {}
    const row = await readOtp(email, 'verify')
    if (!row || row.otp !== String(otp || '').trim()) {
      return res.status(400).json({ message: 'Incorrect or expired OTP.' })
    }
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email])
    if (!rows[0]) return res.status(404).json({ message: 'Account not found.' })
    await pool.query('UPDATE users SET email_verified = 1 WHERE email = ?', [email])
    await clearOtp(email, 'verify')
    const [fresh] = await pool.query('SELECT * FROM users WHERE email = ?', [email])
    res.json({ token: signToken(fresh[0]), user: mapUser(fresh[0]) })
  } catch (error) {
    res.status(500).json({ message: error.message || 'Could not verify email.' })
  }
})

authRouter.post('/forgot', async (req, res) => {
  try {
    const { email } = req.body || {}
    const [rows] = await pool.query('SELECT id, name FROM users WHERE email = ?', [email])
    if (!rows.length) return res.status(404).json({ message: 'No account found for that email.' })
    await sendAndStore(email, rows[0].name, 'reset')
    res.json({ message: 'OTP sent to your email.' })
  } catch (error) {
    res.status(500).json({ message: error.message || 'Could not send OTP.' })
  }
})

authRouter.post('/otp', async (req, res) => {
  const { email, otp, purpose = 'reset' } = req.body || {}
  const row = await readOtp(email, purpose)
  if (!row || row.otp !== String(otp || '').trim()) {
    return res.status(400).json({ message: 'Incorrect or expired OTP.' })
  }
  res.json({ ok: true })
})

authRouter.post('/resend-otp', async (req, res) => {
  try {
    const { email, purpose = 'verify' } = req.body || {}
    const [rows] = await pool.query('SELECT name FROM users WHERE email = ?', [email])
    if (!rows[0]) return res.status(404).json({ message: 'Account not found.' })
    await sendAndStore(email, rows[0].name, purpose)
    res.json({ message: 'A new code was sent to your email.' })
  } catch (error) {
    res.status(500).json({ message: error.message || 'Could not resend OTP.' })
  }
})

authRouter.post('/reset', async (req, res) => {
  try {
    const { email, password, otp } = req.body || {}
    if (!password) return res.status(400).json({ message: 'Password required.' })
    const row = await readOtp(email, 'reset')
    if (!row || row.otp !== String(otp || '').trim()) {
      return res.status(400).json({ message: 'Incorrect or expired OTP.' })
    }
    const hash = await bcrypt.hash(password, 10)
    await pool.query('UPDATE users SET password_hash = ? WHERE email = ?', [hash, email])
    await clearOtp(email, 'reset')
    res.json({ message: 'Password updated.' })
  } catch (error) {
    res.status(500).json({ message: error.message || 'Could not reset password.' })
  }
})

authRouter.post('/two-factor', async (req, res) => {
  try {
    const { email, otp } = req.body || {}
    const row = await readOtp(email, '2fa')
    if (!row || row.otp !== String(otp || '').trim()) {
      return res.status(400).json({ message: 'Incorrect or expired OTP.' })
    }
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email])
    if (!rows[0]) return res.status(404).json({ message: 'Account not found.' })
    await clearOtp(email, '2fa')
    res.json({ token: signToken(rows[0]), user: mapUser(rows[0]) })
  } catch (error) {
    res.status(500).json({ message: error.message || 'Could not complete sign-in.' })
  }
})

authRouter.get('/me', requireAuth, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id])
  if (!rows[0]) return res.status(404).json({ message: 'User not found.' })
  res.json({ user: mapUser(rows[0]) })
})

authRouter.patch('/me', requireAuth, async (req, res) => {
  const allowed = ['name', 'bio', 'country', 'university', 'github', 'linkedin', 'website']
  const fields = []
  const values = []
  for (const key of allowed) {
    if (req.body?.[key] != null) {
      fields.push(`${key} = ?`)
      values.push(req.body[key])
    }
  }
  if (req.body?.phone != null) {
    fields.push('phone = ?')
    values.push(normalizePhone(req.body.phone))
  }
  if (req.body?.whatsappOptIn != null) {
    fields.push('whatsapp_opt_in = ?')
    values.push(req.body.whatsappOptIn ? 1 : 0)
  }
  if (req.body?.twoFactor != null) {
    fields.push('two_factor = ?')
    values.push(req.body.twoFactor ? 1 : 0)
  }
  if (req.body?.skillLevel) {
    fields.push('skill_level = ?')
    values.push(req.body.skillLevel)
  }
  if (!fields.length) return res.json({ ok: true })
  values.push(req.user.id)
  await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values)
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id])
  res.json({ user: mapUser(rows[0]) })
})
