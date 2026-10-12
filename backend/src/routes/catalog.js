import { Router } from 'express'
import { pool } from '../db/pool.js'
import { exploreTopics, languages, potdId } from '../data/seedCatalog.js'
import { mapArticle, mapCourse, mapProblem, parseJson } from '../utils/map.js'

export const catalogRouter = Router()

catalogRouter.get('/', async (_req, res) => {
  const [courseRows] = await pool.query('SELECT * FROM courses')
  const [articleRows] = await pool.query('SELECT * FROM articles')
  const [problemRows] = await pool.query('SELECT * FROM problems')
  const [roadmapRows] = await pool.query('SELECT * FROM roadmaps')
  const [jobRows] = await pool.query('SELECT * FROM jobs')
  const [contestRows] = await pool.query('SELECT * FROM contests')
  const [companyRows] = await pool.query('SELECT * FROM companies')

  res.json({
    exploreTopics,
    languages,
    potdId,
    courses: courseRows.map(mapCourse),
    articles: articleRows.map(mapArticle),
    problems: problemRows.map(mapProblem),
    roadmaps: roadmapRows.map((row) => ({ ...row, steps: parseJson(row.steps, []) })),
    jobs: jobRows.map((row) => ({ ...row, skills: parseJson(row.skills, []), remote: Boolean(row.remote) })),
    contests: contestRows,
    companies: companyRows.map((row) => ({
      ...row,
      roles: parseJson(row.roles, []),
      topics: parseJson(row.topics, []),
      questions: parseJson(row.questions, []),
    })),
  })
})

catalogRouter.get('/search', async (req, res) => {
  const q = String(req.query.q || '').toLowerCase()
  const like = `%${q}%`
  const [articles] = await pool.query('SELECT slug, title, category FROM articles WHERE title LIKE ? OR excerpt LIKE ?', [like, like])
  const [problems] = await pool.query('SELECT id, title, topic FROM problems WHERE title LIKE ? OR topic LIKE ?', [like, like])
  const [courses] = await pool.query('SELECT id, title FROM courses WHERE title LIKE ?', [like])
  res.json({ articles, problems, courses })
})
