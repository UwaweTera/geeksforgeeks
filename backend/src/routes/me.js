import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import { pool } from '../db/pool.js'
import { requireAuth } from '../middleware/auth.js'
import { sendEnrollmentCoach } from '../utils/studyCoach.js'
import { isValidWhatsApp, normalizePhone } from '../utils/whatsapp.js'

export const meRouter = Router()

meRouter.use(requireAuth)

meRouter.get('/dashboard', async (req, res) => {
  const userId = req.user.id
  const [[user]] = await pool.query('SELECT xp, streak FROM users WHERE id = ?', [userId])
  const [solved] = await pool.query('SELECT problem_id FROM problem_progress WHERE user_id = ? AND solved = 1', [userId])
  const [attempted] = await pool.query('SELECT problem_id FROM problem_progress WHERE user_id = ?', [userId])
  const [enrollments] = await pool.query(
    `SELECT course_id, status, progress FROM enrollments
     WHERE user_id = ? AND payment_status = 'paid'`,
    [userId],
  )
  const [certificates] = await pool.query(
    'SELECT id, course_id AS courseId, course_title AS courseTitle, issued_at AS issuedAt FROM certificates WHERE user_id = ? ORDER BY issued_at DESC',
    [userId],
  )
  const [bookmarks] = await pool.query('SELECT item_id FROM bookmarks WHERE user_id = ?', [userId])
  const [submissions] = await pool.query(
    'SELECT id, problem_id AS problemId, language, status, runtime, memory, created_at AS at FROM submissions WHERE user_id = ? ORDER BY created_at DESC LIMIT 40',
    [userId],
  )
  res.json({
    xp: user?.xp ?? 0,
    streak: user?.streak ?? 0,
    solved: solved.map((r) => r.problem_id),
    attempted: attempted.map((r) => r.problem_id),
    enrollments: enrollments.map((r) => r.course_id),
    courseProgress: enrollments.map((r) => ({
      id: r.course_id,
      status: r.status || 'in_progress',
      progress: Number(r.progress || 0),
    })),
    certificates,
    bookmarks: bookmarks.map((r) => r.item_id),
    submissions,
  })
})

meRouter.post('/bookmarks', async (req, res) => {
  const itemId = req.body?.id
  if (!itemId) return res.status(400).json({ message: 'Missing id.' })
  const [existing] = await pool.query('SELECT item_id FROM bookmarks WHERE user_id = ? AND item_id = ?', [req.user.id, itemId])
  if (existing.length) {
    await pool.query('DELETE FROM bookmarks WHERE user_id = ? AND item_id = ?', [req.user.id, itemId])
    return res.json({ saved: false })
  }
  await pool.query('INSERT INTO bookmarks (user_id, item_id) VALUES (?, ?)', [req.user.id, itemId])
  res.json({ saved: true })
})

meRouter.post('/enroll', async (req, res) => {
  const courseId = req.body?.courseId
  if (!courseId) return res.status(400).json({ message: 'Missing courseId.' })

  const phoneNorm = req.body?.phone != null ? normalizePhone(req.body.phone) : ''
  const wantsWhatsApp = req.body?.whatsappOptIn !== false
  if (wantsWhatsApp && phoneNorm && !isValidWhatsApp(phoneNorm)) {
    return res.status(400).json({ message: 'Enter a valid WhatsApp number with country code.' })
  }
  if (phoneNorm) {
    await pool.query(
      'UPDATE users SET phone = ?, whatsapp_opt_in = ? WHERE id = ?',
      [phoneNorm, wantsWhatsApp && isValidWhatsApp(phoneNorm) ? 1 : 0, req.user.id],
    )
  }

  const amount = String(req.body?.amount || '').trim()
  const method = String(req.body?.paymentMethod || '').trim()
  const cardLast4 = String(req.body?.cardLast4 || '').replace(/\D/g, '').slice(-4)
  if (!amount || !method) {
    return res.status(400).json({ message: 'Payment amount and method are required to enroll.' })
  }

  await pool.query(
    `INSERT INTO enrollments (user_id, course_id, status, progress, payment_status, payment_method, amount, paid_at)
     VALUES (?, ?, 'in_progress', 0, 'paid', ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       status = 'in_progress',
       payment_status = 'paid',
       payment_method = VALUES(payment_method),
       amount = VALUES(amount),
       paid_at = NOW()`,
    [req.user.id, courseId, method, amount],
  )

  await pool.query(
    `INSERT INTO course_payments (id, user_id, course_id, amount, method, status, card_last4)
     VALUES (?, ?, ?, ?, ?, 'paid', ?)`,
    [randomUUID(), req.user.id, courseId, amount, method, cardLast4],
  )

  const [[user]] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id])
  const [[course]] = await pool.query('SELECT id, slug, title FROM courses WHERE id = ? OR slug = ?', [courseId, courseId])
  sendEnrollmentCoach(user, course).catch((error) => console.warn('[study-coach] enroll failed:', error.message))

  res.json({ enrolled: true, paymentStatus: 'paid' })
})

meRouter.post('/progress', async (req, res) => {
  const { problemId, solved } = req.body || {}
  if (!problemId) return res.status(400).json({ message: 'Missing problemId.' })
  await pool.query(
    `INSERT INTO problem_progress (user_id, problem_id, attempted, solved)
     VALUES (?, ?, 1, ?)
     ON DUPLICATE KEY UPDATE attempted = 1, solved = GREATEST(solved, ?)`,
    [req.user.id, problemId, solved ? 1 : 0, solved ? 1 : 0],
  )
  if (solved) await pool.query('UPDATE users SET xp = xp + 25 WHERE id = ?', [req.user.id])
  res.json({ ok: true })
})

meRouter.post('/submissions', async (req, res) => {
  const row = req.body || {}
  const id = row.id || `s-${Date.now()}`
  await pool.query(
    'INSERT INTO submissions (id, user_id, problem_id, language, status, runtime, memory) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, req.user.id, row.problemId, row.language, row.status, row.runtime, row.memory],
  )
  await pool.query(
    `INSERT INTO problem_progress (user_id, problem_id, attempted, solved)
     VALUES (?, ?, 1, ?)
     ON DUPLICATE KEY UPDATE attempted = 1, solved = GREATEST(solved, ?)`,
    [req.user.id, row.problemId, row.status === 'Accepted' ? 1 : 0, row.status === 'Accepted' ? 1 : 0],
  )
  if (row.status === 'Accepted') {
    await pool.query('UPDATE users SET xp = xp + 25 WHERE id = ?', [req.user.id])
  }
  res.status(201).json({ id })
})

meRouter.post('/potd', async (req, res) => {
  const today = new Date().toISOString().slice(0, 10)
  const [[user]] = await pool.query('SELECT last_potd, streak FROM users WHERE id = ?', [req.user.id])
  const nextStreak = user.last_potd === today ? user.streak : (user.streak || 0) + 1
  await pool.query('UPDATE users SET last_potd = ?, streak = ?, xp = xp + 15 WHERE id = ?', [today, nextStreak, req.user.id])
  res.json({ streak: nextStreak })
})

meRouter.post('/xp', async (req, res) => {
  const n = Number(req.body?.n || 0)
  await pool.query('UPDATE users SET xp = xp + ? WHERE id = ?', [n, req.user.id])
  res.json({ ok: true })
})

meRouter.get('/alerts', async (req, res) => {
  const [rows] = await pool.query(
    `SELECT id, kind, title, body, course_id AS courseId, channel, created_at AS createdAt, read_at AS readAt
     FROM study_alerts
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 20`,
    [req.user.id],
  )
  res.json({ alerts: rows })
})

meRouter.post('/alerts/read', async (req, res) => {
  const id = req.body?.id
  if (id) {
    await pool.query('UPDATE study_alerts SET read_at = NOW() WHERE id = ? AND user_id = ?', [id, req.user.id])
  } else {
    await pool.query('UPDATE study_alerts SET read_at = NOW() WHERE user_id = ? AND read_at IS NULL', [req.user.id])
  }
  res.json({ ok: true })
})
