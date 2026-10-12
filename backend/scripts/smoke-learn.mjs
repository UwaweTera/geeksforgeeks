import { expandCourse } from '../src/utils/curriculum.js'
import { courses } from '../src/data/seedCatalog.js'

const base = 'http://localhost:4000/api'

async function req(path, { token, method = 'GET', body } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(`${method} ${path} -> ${response.status} ${data.message || ''}`)
  return data
}

const course = courses.find((item) => item.id === 'mern')
const items = expandCourse(course)

const login = await req('/auth/login', { method: 'POST', body: { email: 'student@geekpath.dev', password: 'password123' } })
if (!login.token) throw new Error('Login failed')
const token = login.token

await req('/me/enroll', { token, method: 'POST', body: { courseId: 'mern' } })
const classroom = await req('/learn/mern', { token })
if (!classroom.modules?.length) throw new Error('Classroom did not load modules')

for (const item of items) {
  if (item.type === 'read') {
    await req(`/learn/mern/lessons/${encodeURIComponent(item.id)}/complete`, { token, method: 'POST' })
  } else {
    const answers = item.questions.map((question) => question.answer)
    const quiz = await req(`/learn/mern/lessons/${encodeURIComponent(item.id)}/quiz`, {
      token,
      method: 'POST',
      body: { answers },
    })
    if (!quiz.passed) throw new Error(`Quiz failed: ${item.id} ${quiz.score}`)
  }
}

const done = await req('/learn/mern', { token })
if (done.status !== 'completed' || !done.certificateId) {
  throw new Error(`Course did not complete: status=${done.status} cert=${done.certificateId}`)
}
const cert = await req(`/learn/certificates/${done.certificateId}`)
if (!cert.valid) throw new Error('Certificate was not valid')
const mine = await req('/learn/my-courses', { token })
const row = mine.courses.find((entry) => entry.id === 'mern')
if (!row || row.progress !== 100) throw new Error('Dashboard enrollment progress was not 100')

console.log(JSON.stringify({
  ok: true,
  user: login.user.email,
  course: 'mern',
  progress: done.progress,
  certificateId: done.certificateId,
  student: cert.studentName,
}, null, 2))
