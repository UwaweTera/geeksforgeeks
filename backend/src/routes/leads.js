import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import { pool } from '../db/pool.js'

export const leadsRouter = Router()

leadsRouter.post('/skillup', async (req, res) => {
  try {
    const { name, country, phone, email, year } = req.body || {}
    if (!name || !phone || !email || !year) {
      return res.status(400).json({ message: 'Name, phone, email, and graduation year are required.' })
    }
    const id = `lead-${randomUUID()}`
    await pool.query(
      `INSERT INTO skillup_leads (id, name, country, phone, email, graduation_year)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, name, country || '', phone, email, String(year)],
    )
    res.status(201).json({ ok: true, id })
  } catch (error) {
    res.status(500).json({ message: error.message || 'Could not save your details.' })
  }
})
