import dotenv from 'dotenv'

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '')
}

function reloadEnv() {
  // Pick up .env edits without requiring a full process restart
  dotenv.config({ override: true })
}

export function normalizePhone(raw) {
  let digits = digitsOnly(raw)
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.length === 10 && digits.startsWith('07')) digits = `250${digits.slice(1)}`
  if (digits.length === 9 && digits.startsWith('7')) digits = `250${digits}`
  return digits
}

export function isValidWhatsApp(raw) {
  const digits = normalizePhone(raw)
  return digits.length >= 10 && digits.length <= 15
}

async function sendMeta({ to, text }) {
  const token = process.env.WHATSAPP_TOKEN
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID
  if (!token || !phoneId) return { skipped: true, reason: 'meta-not-configured' }

  const response = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { preview_url: true, body: text },
    }),
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`WhatsApp Cloud API: ${body}`)
  }
  return { sent: true, provider: 'meta' }
}

async function sendTwilio({ to, text }) {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const auth = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_WHATSAPP_FROM
  if (!sid || !auth || !from) return { skipped: true, reason: 'twilio-not-configured' }

  const params = new URLSearchParams({
    From: from.startsWith('whatsapp:') ? from : `whatsapp:${from}`,
    To: `whatsapp:+${to}`,
    Body: text,
  })
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${auth}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Twilio WhatsApp: ${body}`)
  }
  return { sent: true, provider: 'twilio' }
}

async function sendCallMeBot({ to, text }) {
  const key = String(process.env.CALLMEBOT_APIKEY || '').trim()
  if (!key || key === '123123' || key.toLowerCase() === 'your_key_here') {
    return { skipped: true, reason: 'callmebot-not-configured' }
  }
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(to)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(key)}`
  const response = await fetch(url)
  const body = await response.text()
  const lower = body.toLowerCase()
  const failed =
    lower.includes('apikey is invalid')
    || lower.includes('api key is invalid')
    || lower.includes('invalid apikey')
    || lower.includes('<b>error')
    || (response.status >= 400 && !lower.includes('message queued') && !lower.includes('message sent'))
  if (failed) {
    throw new Error(`CallMeBot rejected key/phone: ${body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 180)}`)
  }
  return { sent: true, provider: 'callmebot', detail: body.replace(/<[^>]+>/g, ' ').trim().slice(0, 200) }
}

export async function sendWhatsApp({ phone, text }) {
  reloadEnv()
  const to = normalizePhone(phone)
  if (!isValidWhatsApp(to)) return { skipped: true, reason: 'invalid-phone' }

  // Twilio first (trial can message joined students); then Meta; then CallMeBot
  const providers = [sendTwilio, sendMeta, sendCallMeBot]
  let lastSkip = 'not-configured'
  for (const provider of providers) {
    try {
      const result = await provider({ to, text })
      if (result?.sent) return result
      lastSkip = result?.reason || lastSkip
    } catch (error) {
      lastSkip = error.message || lastSkip
      console.warn('[whatsapp]', error.message)
    }
  }
  return { skipped: true, reason: lastSkip }
}
