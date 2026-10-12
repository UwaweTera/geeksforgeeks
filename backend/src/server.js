import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import { initDatabase, listTables } from './db/init.js'
import { adminRouter } from './routes/admin.js'
import { authRouter } from './routes/auth.js'
import { catalogRouter } from './routes/catalog.js'
import { leadsRouter } from './routes/leads.js'
import { learnRouter } from './routes/learn.js'
import { meRouter } from './routes/me.js'
import { startStudyCoach } from './utils/studyCoach.js'

dotenv.config()

const app = express()
const port = Number(process.env.PORT || 4000)

app.use(cors({
  origin: [process.env.FRONTEND_URL, 'http://localhost:8080', 'http://127.0.0.1:8080', 'http://localhost:5173', 'http://localhost:5174'].filter(Boolean),
  credentials: true,
}))
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', async (_req, res) => {
  try {
    const tables = await listTables()
    res.json({
      ok: true,
      service: 'geekpath-api',
      database: process.env.DB_NAME || 'geekpath',
      tables: tables.map((row) => row.name),
      google: Boolean(process.env.GOOGLE_CLIENT_ID),
      brevo: Boolean(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL),
      whatsapp: Boolean(process.env.WHATSAPP_TOKEN || process.env.TWILIO_ACCOUNT_SID || process.env.CALLMEBOT_APIKEY),
    })
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message })
  }
})

app.use('/api/auth', authRouter)
app.use('/api/catalog', catalogRouter)
app.use('/api/me', meRouter)
app.use('/api/learn', learnRouter)
app.use('/api/leads', leadsRouter)
app.use('/api/admin', adminRouter)

app.use((error, _req, res, _next) => {
  console.error(error)
  res.status(500).json({ message: 'Server error. Check MySQL and try again.' })
})

const start = async () => {
  try {
    await initDatabase()
    app.listen(port, () => {
      console.log(`GeekPath API running on http://localhost:${port}`)
      startStudyCoach()
    })
  } catch (error) {
    console.error('Could not start API. Install MySQL, start the service, then set DB_USER and DB_PASSWORD in backend/.env')
    console.error(error)
    process.exit(1)
  }
}

start()
