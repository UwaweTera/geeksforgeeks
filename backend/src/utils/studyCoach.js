import { randomUUID } from 'node:crypto'
import { pool } from '../db/pool.js'
import { sendStudyCoachEmail } from './mailer.js'
import { isValidWhatsApp, sendWhatsApp } from './whatsapp.js'

const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:8080'

function todayStamp() {
  return new Date().toISOString().slice(0, 10)
}

/** Pick a live course the student has not enrolled in yet (a “new / coming” course). */
async function pickNewCourse(userId) {
  const [enrolled] = await pool.query(
    `SELECT course_id FROM enrollments
     WHERE user_id = ? AND (payment_status = 'paid' OR payment_status IS NULL OR payment_status = '')`,
    [userId],
  )
  const taken = new Set(enrolled.map((row) => row.course_id))
  const [courses] = await pool.query(
    'SELECT id, slug, title, level, live FROM courses ORDER BY live DESC, title',
  )
  const fresh = courses.filter((course) => !taken.has(course.id))
  if (!fresh.length) return courses[0] || null
  // Prefer live / upcoming-style courses first
  const live = fresh.filter((c) => Number(c.live) === 1)
  const poolCourses = live.length ? live : fresh
  return poolCourses[Math.floor(Math.random() * poolCourses.length)]
}

function courseUrl(course) {
  if (!course) return `${FRONTEND}/courses`
  return `${FRONTEND}/courses/${course.slug || course.id}`
}

export function buildCoachMessage(kind, user, course) {
  const name = user.name || 'Geek'
  const courseTitle = course?.title || 'our live courses'
  const url = courseUrl(course)
  const level = course?.level ? ` · ${course.level}` : ''

  if (kind === 'welcome') {
    return {
      title: 'Welcome to GeeksforGeeks',
      body: [
        `Hi ${name}! Welcome to GeeksforGeeks.`,
        '',
        'You are registered as a student. We will message you on WhatsApp when there is a new course you can study.',
        '',
        `Start here: ${courseTitle}`,
        url,
      ].join('\n'),
    }
  }

  if (kind === 'plan') {
    return {
      title: 'Make your study plan',
      body: [
        `Hi ${name}, lock your study plan this week.`,
        '',
        `• Course: ${courseTitle}`,
        '• Goal: finish 2 lessons',
        '• Daily: 25 focused minutes',
        '',
        `Open it: ${url}`,
      ].join('\n'),
    }
  }

  if (kind === 'minute') {
    return {
      title: 'Study reminder',
      body: [
        `${name}, take 25 minutes now on ${courseTitle}.`,
        'One lesson today beats a long plan later.',
        url,
      ].join('\n'),
    }
  }

  // Default + "course" kind — new / coming course for registered students
  return {
    title: 'New course you can study',
    body: [
      `Hi ${name}!`,
      '',
      'There is a new coming course you can study:',
      '',
      `📚 ${courseTitle}${level}`,
      '',
      'Register and start the first lesson today.',
      url,
      '',
      'You get this WhatsApp tip because you registered as a student.',
    ].join('\n'),
  }
}

async function saveAlert({ userId, kind, title, body, courseId, channel }) {
  await pool.query(
    `INSERT INTO study_alerts (id, user_id, kind, title, body, course_id, channel)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [randomUUID(), userId, kind, title, body, courseId || null, channel],
  )
}

async function canSendWhatsApp(user) {
  const optedIn = user.whatsapp_opt_in === 1 || user.whatsapp_opt_in === true || user.whatsapp_opt_in === '1'
  if (!optedIn || !isValidWhatsApp(user.phone)) return false
  const cap = Number(process.env.WHATSAPP_DAILY_CAP || 24)
  const today = todayStamp()
  const day = user.whatsapp_count_day
  const dayStr = day instanceof Date ? day.toISOString().slice(0, 10) : String(day || '').slice(0, 10)
  const sentToday = dayStr === today ? Number(user.whatsapp_sent_today || 0) : 0
  return sentToday < cap
}

async function markWhatsAppSent(userId) {
  const today = todayStamp()
  await pool.query(
    `UPDATE users
     SET last_whatsapp_at = NOW(),
         whatsapp_count_day = ?,
         whatsapp_sent_today = IF(whatsapp_count_day = ?, whatsapp_sent_today + 1, 1)
     WHERE id = ?`,
    [today, today, userId],
  )
}

async function deliverWhatsApp(user, kind, message, course) {
  if (!(await canSendWhatsApp(user))) {
    return { skipped: true, reason: 'opt-in-or-phone' }
  }
  const result = await sendWhatsApp({
    phone: user.phone,
    text: `*${message.title}*\n\n${message.body}`,
  })
  if (result?.sent) {
    await markWhatsAppSent(user.id)
    await saveAlert({
      userId: user.id,
      kind,
      title: message.title,
      body: message.body,
      courseId: course?.id,
      channel: 'whatsapp',
    })
    console.log(`[study-coach] WhatsApp sent to ${user.phone} (${kind})`)
    return result
  }
  console.warn(`[study-coach] WhatsApp skipped for ${user.email || user.phone}: ${result?.reason || 'unknown'}`)
  return result || { skipped: true, reason: 'not-configured' }
}

export async function notifyStudent(user, kind = 'course', { email = false } = {}) {
  const course = await pickNewCourse(user.id)
  const message = buildCoachMessage(kind, user, course)

  // WhatsApp-only reminders (no on-screen education-page toast)
  if (email && user.email) {
    sendStudyCoachEmail({
      to: user.email,
      name: user.name,
      title: message.title,
      body: message.body,
      courseTitle: course?.title,
      courseUrl: courseUrl(course),
    }).catch((error) => console.warn('[study-coach] email failed:', error.message))
  }

  await deliverWhatsApp(user, kind, message, course)
  return message
}

export async function sendEnrollmentCoach(user, course) {
  if (!course) return notifyStudent(user, 'welcome', { email: true })

  const message = {
    title: `You're registered: ${course.title}`,
    body: [
      `Hi ${user.name || 'Geek'}! You registered for ${course.title}.`,
      '',
      'Make your study plan now:',
      '1) Finish the first lesson today',
      '2) Study 25 minutes every day',
      '3) Complete this week\'s module',
      '',
      `Start learning: ${courseUrl(course)}`,
      '',
      'We will also WhatsApp you when there is a new coming course you can study.',
    ].join('\n'),
  }

  if (user.email) {
    sendStudyCoachEmail({
      to: user.email,
      name: user.name,
      title: message.title,
      body: message.body,
      courseTitle: course.title,
      courseUrl: courseUrl(course),
    }).catch((error) => console.warn('[study-coach] email failed:', error.message))
  }

  await deliverWhatsApp(user, 'enroll', message, course)

  // Immediately tip them about another new / coming course they can study next
  try {
    const [[fresh]] = await pool.query(
      `SELECT id, name, email, phone, whatsapp_opt_in, whatsapp_count_day, whatsapp_sent_today
       FROM users WHERE id = ?`,
      [user.id],
    )
    if (fresh) await notifyStudent(fresh, 'course', { email: false })
  } catch (error) {
    console.warn('[study-coach] new-course tip after enroll failed:', error.message)
  }

  return message
}

export async function sendWelcomeCoach(user) {
  return notifyStudent(user, 'welcome', { email: true })
}

/** Students who registered for at least one course and opted into WhatsApp. */
async function registeredWhatsAppStudents() {
  const [students] = await pool.query(
    `SELECT DISTINCT
       u.id, u.name, u.email, u.phone,
       u.whatsapp_opt_in, u.whatsapp_count_day, u.whatsapp_sent_today
     FROM users u
     INNER JOIN enrollments e ON e.user_id = u.id
     WHERE u.role = 'student'
       AND u.whatsapp_opt_in = 1
       AND u.phone IS NOT NULL
       AND TRIM(u.phone) != ''
       AND (e.payment_status = 'paid' OR e.payment_status IS NULL OR e.payment_status = '')`,
  )
  return students
}

const ROTATION = ['course', 'course', 'plan', 'course', 'minute', 'course']
let tickBusy = false
let tickIndex = 0

async function tickReminders() {
  if (tickBusy) return
  tickBusy = true
  try {
    const kind = ROTATION[tickIndex % ROTATION.length]
    tickIndex += 1
    const students = await registeredWhatsAppStudents()
    if (!students.length) {
      console.log('[study-coach] no registered WhatsApp students to remind yet')
      return
    }
    console.log(`[study-coach] sending "${kind}" reminders to ${students.length} registered student(s)`)
    for (const student of students) {
      try {
        await notifyStudent(student, kind)
      } catch (error) {
        console.warn('[study-coach] student tick failed:', error.message)
      }
    }
  } catch (error) {
    console.warn('[study-coach] tick failed:', error.message)
  } finally {
    tickBusy = false
  }
}

export function startStudyCoach() {
  const ms = Number(process.env.WHATSAPP_REMINDER_MS || 2 * 60 * 1000)
  const interval = Number.isFinite(ms) && ms >= 30_000 ? ms : 2 * 60 * 1000
  setTimeout(() => {
    tickReminders()
    setInterval(tickReminders, interval)
  }, 15_000)
  const waReady = Boolean(
    process.env.WHATSAPP_TOKEN || process.env.TWILIO_ACCOUNT_SID || process.env.CALLMEBOT_APIKEY,
  )
  console.log(
    `[study-coach] WhatsApp reminders every ${Math.round(interval / 1000)}s for registered students`
      + (waReady ? ' (provider configured)' : ' — set CALLMEBOT_APIKEY or Meta/Twilio in .env to deliver)'),
  )
}
