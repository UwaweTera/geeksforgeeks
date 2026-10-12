import { Router } from 'express'
import { pool } from '../db/pool.js'
import { requireAdmin, requireAuth } from '../middleware/auth.js'
import { mapUser } from '../utils/map.js'

export const adminRouter = Router()

adminRouter.use(requireAuth, requireAdmin)

adminRouter.get('/stats', async (_req, res) => {
  const [[users]] = await pool.query('SELECT COUNT(*) AS count FROM users')
  const [[courses]] = await pool.query('SELECT COUNT(*) AS count FROM courses')
  const [[problems]] = await pool.query('SELECT COUNT(*) AS count FROM problems')
  const [[articles]] = await pool.query('SELECT COUNT(*) AS count FROM articles')
  const [[submissions]] = await pool.query('SELECT COUNT(*) AS count FROM submissions')
  const [[jobs]] = await pool.query('SELECT COUNT(*) AS count FROM jobs')
  const [[enrollments]] = await pool.query('SELECT COUNT(*) AS count FROM enrollments')
  const [[certificates]] = await pool.query('SELECT COUNT(*) AS count FROM certificates')
  res.json({
    users: users.count,
    courses: courses.count,
    problems: problems.count,
    articles: articles.count,
    submissions: submissions.count,
    jobs: jobs.count,
    enrollments: enrollments.count,
    certificates: certificates.count,
  })
})

adminRouter.get('/users', async (_req, res) => {
  const [rows] = await pool.query('SELECT * FROM users ORDER BY created_at DESC')
  res.json({ users: rows.map(mapUser) })
})
