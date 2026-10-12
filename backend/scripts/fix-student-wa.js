import 'dotenv/config'
import { pool } from '../src/db/pool.js'

await pool.query(
  `UPDATE enrollments
   SET payment_status = 'paid', paid_at = COALESCE(paid_at, NOW())
   WHERE user_id IN (SELECT id FROM users WHERE email = 'ntagandaelisa12@gmail.com')`,
)

const [rows] = await pool.query(
  `SELECT u.name, u.phone, u.whatsapp_opt_in, e.course_id, e.payment_status, e.progress
   FROM users u
   JOIN enrollments e ON e.user_id = u.id
   WHERE u.email = 'ntagandaelisa12@gmail.com'`,
)
console.log(rows)
const key = String(process.env.CALLMEBOT_APIKEY || '').trim()
console.log('CALLMEBOT_APIKEY ready:', Boolean(key && key !== '123123'), 'len=', key.length)
process.exit(0)
