import 'dotenv/config'
import { sendWhatsApp } from '../src/utils/whatsapp.js'

const phone = '250787879364'
const key = String(process.env.CALLMEBOT_APIKEY || '').trim()
console.log('Key length:', key.length, 'key preview:', key ? `${key.slice(0, 2)}…` : '(empty)')

const text = [
  '*GeekPath test*',
  '',
  'Hi! This is a test WhatsApp from GeeksforGeeks.',
  'There is a new coming course you can study.',
  'Open: http://localhost:8080/courses',
].join('\n')

const result = await sendWhatsApp({ phone, text })
console.log('Result:', result)
process.exit(result?.sent ? 0 : 2)
