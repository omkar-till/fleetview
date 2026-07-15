import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { AuthedRequest, COOKIE_NAME, requireAuth, sha256, signSession } from '../auth.js'
import { query } from '../db.js'

const router = Router()

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 30 * 24 * 60 * 60 * 1000,
}

/** Create a company + its first admin. */
router.post('/signup', async (req, res) => {
  const { companyName, name, email, password } = req.body ?? {}
  if (!companyName?.trim() || !name?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ error: 'All fields are required' })
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }
  const existing = await query('SELECT 1 FROM users WHERE lower(email) = lower($1)', [email])
  if (existing.rows[0]) {
    return res.status(409).json({ error: 'An account with this email already exists' })
  }
  const companyId = crypto.randomUUID()
  const userId = crypto.randomUUID()
  await query('INSERT INTO companies (id, name) VALUES ($1, $2)', [companyId, companyName.trim()])
  await query(
    `INSERT INTO users (id, company_id, name, email, role, password_hash)
     VALUES ($1, $2, $3, lower($4), 'admin', $5)`,
    [userId, companyId, name.trim(), email.trim(), await bcrypt.hash(password, 10)],
  )
  res.cookie(COOKIE_NAME, signSession(userId), cookieOptions)
  res.json({ ok: true })
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {}
  const { rows } = await query(
    'SELECT id, password_hash FROM users WHERE lower(email) = lower($1)',
    [email ?? ''],
  )
  const user = rows[0]
  if (!user?.password_hash || !(await bcrypt.compare(password ?? '', user.password_hash))) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }
  res.cookie(COOKIE_NAME, signSession(user.id), cookieOptions)
  res.json({ ok: true })
})

/** Public: look up who an invite belongs to (shown on the set-password page). */
router.get('/invite/:token', async (req, res) => {
  const { rows } = await query(
    `SELECT u.name, u.email, c.name AS company_name
     FROM users u JOIN companies c ON c.id = u.company_id
     WHERE u.invite_token = $1`,
    [sha256(req.params.token)],
  )
  if (!rows[0]) return res.status(404).json({ error: 'This invite link is invalid or was already used' })
  res.json({ invite: rows[0] })
})

/** Public: set password via invite token, then sign straight in. */
router.post('/accept-invite', async (req, res) => {
  const { token, password } = req.body ?? {}
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }
  const { rows } = await query(
    `UPDATE users SET password_hash = $1, invite_token = NULL
     WHERE invite_token = $2 RETURNING id`,
    [await bcrypt.hash(password, 10), sha256(String(token ?? ''))],
  )
  if (!rows[0]) return res.status(404).json({ error: 'This invite link is invalid or was already used' })
  res.cookie(COOKIE_NAME, signSession(rows[0].id), cookieOptions)
  res.json({ ok: true })
})

router.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME)
  res.json({ ok: true })
})

router.get('/me', requireAuth, async (req: AuthedRequest, res) => {
  const { rows } = await query('SELECT id, name FROM companies WHERE id = $1', [
    req.user!.company_id,
  ])
  res.json({ user: req.user, company: rows[0] })
})

export default router
