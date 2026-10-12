import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import { pool } from '../db/pool.js'
import { requireAuth } from '../middleware/auth.js'
import { expandCourse, groupedModules, publicItem } from '../utils/curriculum.js'
import { mapCourse } from '../utils/map.js'
import { sendCertificateEmail } from '../utils/mailer.js'

export const learnRouter = Router()

async function loadCourse(param) {
  const [rows] = await pool.query('SELECT * FROM courses WHERE id = ? OR slug = ?', [param, param])
  return rows[0] ? mapCourse(rows[0]) : null
}

async function requirePaidEnrollment(userId, courseId) {
  const [[row]] = await pool.query(
    'SELECT payment_status FROM enrollments WHERE user_id = ? AND course_id = ?',
    [userId, courseId],
  )
  if (!row || row.payment_status !== 'paid') {
    const err = new Error('Payment required to access this course.')
    err.status = 402
    throw err
  }
}

async function completedSet(userId, courseId) {
  const [rows] = await pool.query(
    'SELECT lesson_id FROM lesson_progress WHERE user_id = ? AND course_id = ? AND completed = 1',
    [userId, courseId],
  )
  return new Set(rows.map((row) => row.lesson_id))
}

function certificateId(course, userId) {
  const tag = String(course.tag || 'CRS').replace(/[^A-Z0-9]/gi, '').slice(0, 6).toUpperCase() || 'CRS'
  const tail = String(userId).replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase() || 'STUDENT'
  return `GFG-${new Date().getFullYear()}-${tag}-${tail}`
}

async function issueCertificate(user, course) {
  const [[existing]] = await pool.query(
    'SELECT * FROM certificates WHERE user_id = ? AND course_id = ?',
    [user.id, course.id],
  )
  if (existing) return existing
  const id = certificateId(course, user.id)
  const issuedAt = new Date().toISOString().slice(0, 10)
  const [[profile]] = await pool.query('SELECT name FROM users WHERE id = ?', [user.id])
  try {
    await pool.query(
      'INSERT INTO certificates (id, user_id, course_id, student_name, course_title, issued_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, user.id, course.id, profile?.name || 'Student', course.title, issuedAt],
    )
    await pool.query('UPDATE users SET xp = xp + 100 WHERE id = ?', [user.id])
  } catch (error) {
    if (error.code !== 'ER_DUP_ENTRY') throw error
    const [[again]] = await pool.query('SELECT * FROM certificates WHERE user_id = ? AND course_id = ?', [user.id, course.id])
    return again
  }
  const [[row]] = await pool.query('SELECT * FROM certificates WHERE id = ?', [id])

  // Send certificate email (non-blocking)
  try {
    const [[userRow]] = await pool.query('SELECT email, name FROM users WHERE id = ?', [user.id])
    if (userRow?.email) {
      sendCertificateEmail({
        to: userRow.email,
        name: userRow.name || 'Student',
        courseTitle: course.title,
        certId: id,
      }).catch((err) => console.warn('[mailer] certificate email failed:', err.message))
    }
  } catch (_) {}

  return row
}

async function syncEnrollment(user, course) {
  const items = expandCourse(course)
  const done = await completedSet(user.id, course.id)
  const completed = items.filter((item) => done.has(item.id)).length
  const progress = items.length ? Math.round((completed / items.length) * 100) : 0
  const finished = progress === 100 && items.length > 0
  let certificate = null
  if (finished) {
    certificate = await issueCertificate(user, course)
    await pool.query(
      `UPDATE enrollments SET status = 'completed', progress = 100, completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP)
       WHERE user_id = ? AND course_id = ?`,
      [user.id, course.id],
    )
  } else {
    await pool.query(
      `UPDATE enrollments SET status = 'in_progress', progress = ? WHERE user_id = ? AND course_id = ?`,
      [progress, user.id, course.id],
    )
  }
  return { items, done, completed, progress, finished, certificate }
}

learnRouter.get('/my-courses', requireAuth, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT e.course_id, e.status, e.progress, e.completed_at, e.created_at,
            c.title, c.slug, c.tag, cert.id AS certificate_id
     FROM enrollments e
     JOIN courses c ON c.id = e.course_id
     LEFT JOIN certificates cert ON cert.user_id = e.user_id AND cert.course_id = e.course_id
     WHERE e.user_id = ?
     ORDER BY e.created_at DESC`,
    [req.user.id],
  )
  res.json({
    courses: rows.map((row) => ({
      id: row.course_id,
      slug: row.slug,
      title: row.title,
      tag: row.tag,
      status: row.status || 'in_progress',
      progress: Number(row.progress || 0),
      completedAt: row.completed_at,
      certificateId: row.certificate_id || null,
    })),
  })
})

learnRouter.get('/certificates', requireAuth, async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id, course_id AS courseId, student_name AS studentName, course_title AS courseTitle, issued_at AS issuedAt FROM certificates WHERE user_id = ? ORDER BY issued_at DESC',
    [req.user.id],
  )
  res.json({ certificates: rows })
})

learnRouter.get('/certificates/:id', async (req, res) => {
  const [[row]] = await pool.query(
    'SELECT id, course_id AS courseId, student_name AS studentName, course_title AS courseTitle, issued_at AS issuedAt FROM certificates WHERE id = ?',
    [req.params.id],
  )
  if (!row) return res.status(404).json({ message: 'Certificate not found.' })
  res.json({
    ...row,
    valid: true,
    issuer: 'GeeksforGeeks',
    verifyUrl: `/verify/${row.id}`,
  })
})

learnRouter.get('/:courseId', requireAuth, async (req, res) => {
  const course = await loadCourse(req.params.courseId)
  if (!course) return res.status(404).json({ message: 'Course not found.' })
  try {
    await requirePaidEnrollment(req.user.id, course.id)
  } catch (error) {
    return res.status(error.status || 402).json({ message: error.message, code: 'PAYMENT_REQUIRED' })
  }
  const state = await syncEnrollment(req.user, course)
  const [attempts] = await pool.query(
    'SELECT lesson_id AS lessonId, attempt_number AS attemptNumber, score, passed FROM quiz_attempts WHERE user_id = ? AND course_id = ? ORDER BY created_at DESC',
    [req.user.id, course.id],
  )
  res.json({
    course,
    progress: state.progress,
    completed: state.completed,
    total: state.items.length,
    status: state.finished ? 'completed' : 'in_progress',
    completedIds: [...state.done],
    certificateId: state.certificate?.id || null,
    modules: groupedModules(state.items.map(publicItem)),
    attempts,
  })
})

learnRouter.post('/:courseId/lessons/:lessonId/complete', requireAuth, async (req, res) => {
  const course = await loadCourse(req.params.courseId)
  if (!course) return res.status(404).json({ message: 'Course not found.' })
  try {
    await requirePaidEnrollment(req.user.id, course.id)
  } catch (error) {
    return res.status(error.status || 402).json({ message: error.message, code: 'PAYMENT_REQUIRED' })
  }
  const items = expandCourse(course)
  const lesson = items.find((item) => item.id === decodeURIComponent(req.params.lessonId))
  if (!lesson) return res.status(404).json({ message: 'Lesson not found.' })
  if (lesson.type === 'quiz') {
    return res.status(400).json({ message: 'Pass the quiz to complete this item.' })
  }
  await pool.query(
    `INSERT INTO lesson_progress (user_id, course_id, lesson_id, completed, score)
     VALUES (?, ?, ?, 1, NULL)
     ON DUPLICATE KEY UPDATE completed = 1, completed_at = CURRENT_TIMESTAMP`,
    [req.user.id, course.id, lesson.id],
  )
  await pool.query('UPDATE users SET xp = xp + 10 WHERE id = ?', [req.user.id])
  const state = await syncEnrollment(req.user, course)
  res.json({
    ok: true,
    progress: state.progress,
    completedIds: [...state.done],
    certificateId: state.certificate?.id || null,
    status: state.finished ? 'completed' : 'in_progress',
  })
})

learnRouter.post('/:courseId/lessons/:lessonId/quiz', requireAuth, async (req, res) => {
  const course = await loadCourse(req.params.courseId)
  if (!course) return res.status(404).json({ message: 'Course not found.' })
  try {
    await requirePaidEnrollment(req.user.id, course.id)
  } catch (error) {
    return res.status(error.status || 402).json({ message: error.message, code: 'PAYMENT_REQUIRED' })
  }
  const items = expandCourse(course)
  const lesson = items.find((item) => item.id === decodeURIComponent(req.params.lessonId))
  if (!lesson || lesson.type !== 'quiz') return res.status(404).json({ message: 'Quiz not found.' })
  const answers = Array.isArray(req.body?.answers) ? req.body.answers : []
  let correct = 0
  lesson.questions.forEach((question, index) => {
    if (Number(answers[index]) === question.answer) correct += 1
  })
  const score = Math.round((correct / lesson.questions.length) * 100)
  const passed = score >= (lesson.passScore || 70)
  const [[{ n }]] = await pool.query(
    'SELECT COUNT(*) AS n FROM quiz_attempts WHERE user_id = ? AND course_id = ? AND lesson_id = ?',
    [req.user.id, course.id, lesson.id],
  )
  const attemptNumber = Number(n || 0) + 1
  await pool.query(
    'INSERT INTO quiz_attempts (id, user_id, course_id, lesson_id, attempt_number, score, passed, answers) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [randomUUID(), req.user.id, course.id, lesson.id, attemptNumber, score, passed ? 1 : 0, JSON.stringify(answers)],
  )
  if (passed) {
    await pool.query(
      `INSERT INTO lesson_progress (user_id, course_id, lesson_id, completed, score)
       VALUES (?, ?, ?, 1, ?)
       ON DUPLICATE KEY UPDATE completed = 1, score = GREATEST(COALESCE(score, 0), ?), completed_at = CURRENT_TIMESTAMP`,
      [req.user.id, course.id, lesson.id, score, score],
    )
    await pool.query('UPDATE users SET xp = xp + 25 WHERE id = ?', [req.user.id])
  }
  const state = await syncEnrollment(req.user, course)
  res.json({
    score,
    passed,
    correct,
    total: lesson.questions.length,
    attemptNumber,
    progress: state.progress,
    completedIds: [...state.done],
    certificateId: state.certificate?.id || null,
    status: state.finished ? 'completed' : 'in_progress',
  })
})
