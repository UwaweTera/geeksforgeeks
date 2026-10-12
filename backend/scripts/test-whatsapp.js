import 'dotenv/config'
import { pool } from '../src/db/pool.js'
import { sendWhatsApp, isValidWhatsApp, normalizePhone } from '../src/utils/whatsapp.js'
import { buildCoachMessage } from '../src/utils/studyCoach.js'

const providerReady = Boolean(
  process.env.WHATSAPP_TOKEN || process.env.TWILIO_ACCOUNT_SID || process.env.CALLMEBOT_APIKEY,
)
console.log('CALLMEBOT_APIKEY set:', Boolean(process.env.CALLMEBOT_APIKEY), process.env.CALLMEBOT_APIKEY ? `(len=${String(process.env.CALLMEBOT_APIKEY).length})` : '')
console.log('Provider ready:', providerReady)

const [students] = await pool.query(
  `SELECT DISTINCT
     u.id, u.name, u.email, u.phone, u.whatsapp_opt_in,
     e.course_id, e.payment_status, e.progress
   FROM users u
   INNER JOIN enrollments e ON e.user_id = u.id
   WHERE u.phone IS NOT NULL AND TRIM(u.phone) != ''
   ORDER BY e.progress DESC, u.name`,
)

console.log('\nStudents with phone + enrollment:')
if (!students.length) {
  console.log('  (none found)')
  process.exit(1)
}
for (const s of students) {
  console.log(`  - ${s.name} | ${s.email} | phone=${s.phone} | optIn=${s.whatsapp_opt_in} | course=${s.course_id} | progress=${s.progress}% | paid=${s.payment_status}`)
}

const target = students.find((s) => isValidWhatsApp(s.phone)) || students[0]
console.log(`\nSending test WhatsApp to: ${target.name} (${normalizePhone(target.phone)})`)

const msg = buildCoachMessage('course', target, {
  title: 'Test: new course you can study',
  level: 'Beginner',
  slug: 'system-design',
  id: 'system-design',
})

const text = `*${msg.title}*\n\n${msg.body}\n\n(This is a GeekPath test message.)`
const result = await sendWhatsApp({ phone: target.phone, text })
console.log('Result:', result)

if (result?.sent) {
  console.log('OK — check WhatsApp on that phone.')
} else {
  console.log('FAILED — WhatsApp was not delivered. Fix CALLMEBOT_APIKEY (real key from the bot), restart, and use the same phone that activated CallMeBot.')
}

await pool.end()
process.exit(result?.sent ? 0 : 2)
