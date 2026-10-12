import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import mysql from 'mysql2/promise'
import { dbConfig, pool } from './pool.js'
import {
  articles,
  companies,
  contests,
  courses,
  jobs,
  problems,
  roadmaps,
} from '../data/seedCatalog.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const extraColumns = [
  ['users', 'google_sub', 'VARCHAR(128) DEFAULT NULL'],
  ['users', 'phone', 'VARCHAR(32) DEFAULT \'\''],
  ['users', 'whatsapp_opt_in', 'TINYINT(1) DEFAULT 0'],
  ['users', 'last_whatsapp_at', 'DATETIME NULL'],
  ['users', 'whatsapp_count_day', 'DATE NULL'],
  ['users', 'whatsapp_sent_today', 'INT DEFAULT 0'],
  ['courses', 'slug', 'VARCHAR(160) NULL'],
  ['courses', 'blurb', 'TEXT NULL'],
  ['courses', 'price', 'VARCHAR(40) NULL'],
  ['courses', 'old_price', 'VARCHAR(40) NULL'],
  ['courses', 'seats', 'VARCHAR(80) NULL'],
  ['courses', 'weeks', 'VARCHAR(40) NULL'],
  ['courses', 'offer_percent', 'INT DEFAULT 0'],
  ['enrollments', 'status', "VARCHAR(20) DEFAULT 'in_progress'"],
  ['enrollments', 'progress', 'INT DEFAULT 0'],
  ['enrollments', 'completed_at', 'TIMESTAMP NULL'],
  ['enrollments', 'payment_status', "VARCHAR(20) DEFAULT 'unpaid'"],
  ['enrollments', 'payment_method', "VARCHAR(40) DEFAULT ''"],
  ['enrollments', 'amount', "VARCHAR(40) DEFAULT ''"],
  ['enrollments', 'paid_at', 'TIMESTAMP NULL'],
]

async function ensureDatabase() {
  const connection = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    multipleStatements: true,
  })
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
  await connection.end()
}

async function addColumn(table, column, definition) {
  try {
    await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`)
  } catch (error) {
    if (error.code !== 'ER_DUP_FIELDNAME') throw error
  }
}

async function countRows(table) {
  const [rows] = await pool.query(`SELECT COUNT(*) AS count FROM \`${table}\``)
  return rows[0].count
}

async function upsertCourses() {
  for (const course of courses) {
    await pool.query(
      `INSERT INTO courses
        (id, slug, title, subtitle, rating, level, interested, tag, live, color, accent, icon, description, blurb, price, old_price, seats, weeks, offer_percent, modules)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        slug = VALUES(slug),
        title = VALUES(title),
        subtitle = VALUES(subtitle),
        rating = VALUES(rating),
        level = VALUES(level),
        interested = VALUES(interested),
        tag = VALUES(tag),
        live = VALUES(live),
        color = VALUES(color),
        accent = VALUES(accent),
        icon = VALUES(icon),
        description = VALUES(description),
        blurb = VALUES(blurb),
        price = VALUES(price),
        old_price = VALUES(old_price),
        seats = VALUES(seats),
        weeks = VALUES(weeks),
        offer_percent = VALUES(offer_percent),
        modules = VALUES(modules)`,
      [
        course.id,
        course.slug || course.id,
        course.title,
        course.subtitle,
        course.rating,
        course.level,
        course.interested,
        course.tag,
        course.live ? 1 : 0,
        course.color,
        course.accent,
        course.icon,
        course.description,
        course.blurb || course.description,
        course.price || '',
        course.oldPrice || '',
        course.seats || null,
        course.weeks || '',
        course.offerPercent || 0,
        JSON.stringify(course.modules),
      ],
    )
  }
}

async function seedIfEmpty() {
  if (await countRows('users') === 0) {
    const adminHash = await bcrypt.hash('admin123', 10)
    const studentHash = await bcrypt.hash('password123', 10)
    const instructorHash = await bcrypt.hash('teach123', 10)
    await pool.query(
      `INSERT INTO users
        (id, name, email, password_hash, role, bio, country, university, education, skill_level, interests, github, two_factor, email_verified, xp, streak, created_at)
       VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'u-admin', 'Amina Admin', 'admin@geekpath.dev', adminHash, 'admin', 'Platform operator', 'Rwanda', 'GeekPath', 'Staff', 'Advanced',
        JSON.stringify(['Platform']), '', 0, 1, 0, 0, '2025-01-01',
        'u-student', 'Fred N.', 'student@geekpath.dev', studentHash, 'student', 'Learning DSA and web development.', 'Rwanda', 'University of Rwanda', 'Undergraduate', 'Intermediate',
        JSON.stringify(['DSA', 'React']), 'fredn', 0, 1, 120, 3, '2026-02-10',
        'u-instructor', 'Coach Maya', 'instructor@geekpath.dev', instructorHash, 'instructor', 'Live course mentor and content creator.', 'India', 'GeeksforGeeks', 'Mentor', 'Advanced',
        JSON.stringify(['Teaching', 'DSA']), '', 0, 1, 300, 5, '2025-06-01',
      ],
    )
  } else {
    // Keep demo logins available even if DB already existed
    const demos = [
      ['u-admin', 'Amina Admin', 'admin@geekpath.dev', 'admin123', 'admin'],
      ['u-student', 'Fred N.', 'student@geekpath.dev', 'password123', 'student'],
      ['u-instructor', 'Coach Maya', 'instructor@geekpath.dev', 'teach123', 'instructor'],
    ]
    for (const [id, name, email, password, role] of demos) {
      const hash = await bcrypt.hash(password, 10)
      await pool.query(
        `INSERT INTO users (id, name, email, password_hash, role, interests, email_verified, xp, streak, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, 0, 0, CURDATE())
         ON DUPLICATE KEY UPDATE
           password_hash = VALUES(password_hash),
           role = VALUES(role),
           email_verified = 1,
           name = VALUES(name)`,
        [id, name, email, hash, role, JSON.stringify([role])],
      )
    }
  }

  await upsertCourses()

  if (await countRows('articles') === 0) {
    for (const article of articles) {
      await pool.query(
        `INSERT INTO articles (slug, title, category, tags, difficulty, minutes, published, updated, excerpt, body)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [article.slug, article.title, article.category, JSON.stringify(article.tags), article.difficulty, article.minutes, article.published, article.updated, article.excerpt, JSON.stringify(article.body)],
      )
    }
  }

  if (await countRows('problems') === 0) {
    for (const problem of problems) {
      await pool.query(
        `INSERT INTO problems (id, title, difficulty, topic, companies, accuracy, submissions, prompt, examples, constraints_json, starter, tests)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [problem.id, problem.title, problem.difficulty, problem.topic, JSON.stringify(problem.companies), problem.accuracy, problem.submissions, problem.prompt, JSON.stringify(problem.examples), JSON.stringify(problem.constraints), JSON.stringify(problem.starter), JSON.stringify(problem.tests)],
      )
    }
  }

  if (await countRows('roadmaps') === 0) {
    for (const roadmap of roadmaps) {
      await pool.query(
        'INSERT INTO roadmaps (id, title, audience, steps) VALUES (?, ?, ?, ?)',
        [roadmap.id, roadmap.title, roadmap.audience, JSON.stringify(roadmap.steps)],
      )
    }
  }

  if (await countRows('jobs') === 0) {
    for (const job of jobs) {
      await pool.query(
        'INSERT INTO jobs (id, title, company, location, type, level, salary, skills, remote) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [job.id, job.title, job.company, job.location, job.type, job.level, job.salary, JSON.stringify(job.skills), job.remote ? 1 : 0],
      )
    }
  }

  if (await countRows('contests') === 0) {
    for (const contest of contests) {
      await pool.query(
        'INSERT INTO contests (id, title, starts, duration, problems, registered, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [contest.id, contest.title, contest.starts, contest.duration, contest.problems, contest.registered, contest.status],
      )
    }
  }

  if (await countRows('companies') === 0) {
    for (const company of companies) {
      await pool.query(
        'INSERT INTO companies (slug, name, roles, topics, questions) VALUES (?, ?, ?, ?, ?)',
        [company.slug, company.name, JSON.stringify(company.roles), JSON.stringify(company.topics), JSON.stringify(company.questions)],
      )
    }
  }
}

export async function initDatabase() {
  await ensureDatabase()
  const schema = await readFile(path.join(__dirname, '../../sql/schema.sql'), 'utf8')
  await pool.query(schema)
  for (const [table, column, definition] of extraColumns) {
    await addColumn(table, column, definition)
  }
  await pool.query('ALTER TABLE reset_tokens MODIFY email VARCHAR(200) NOT NULL').catch(() => undefined)
  // Legacy rows created before checkout: treat as paid so learners aren't locked out.
  await pool.query(
    `UPDATE enrollments SET payment_status = 'paid', paid_at = COALESCE(paid_at, NOW())
     WHERE (payment_status IS NULL OR payment_status = '' OR payment_status = 'unpaid')
       AND (progress > 0 OR status = 'completed')`,
  ).catch(() => undefined)
  await seedIfEmpty()
}

export async function listTables() {
  const [rows] = await pool.query(
    'SELECT TABLE_NAME AS name, TABLE_ROWS AS approxRows FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME',
    [dbConfig.database],
  )
  return rows
}
