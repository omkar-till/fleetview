import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { AuthedRequest, requireAuth } from '../auth.js'
import { query } from '../db.js'

const router = Router()
router.use(requireAuth)

function generatePin() {
  return String(crypto.randomInt(0, 10000)).padStart(4, '0')
}

/** Generate a PIN that no other user in the company currently has. */
async function uniquePin(companyId: string): Promise<string> {
  const { rows } = await query(
    'SELECT pin_hash FROM users WHERE company_id = $1 AND pin_hash IS NOT NULL',
    [companyId],
  )
  for (let attempt = 0; attempt < 50; attempt++) {
    const pin = generatePin()
    const clash = await Promise.all(rows.map((r) => bcrypt.compare(pin, r.pin_hash)))
    if (!clash.includes(true)) return pin
  }
  throw new Error('Could not generate a unique PIN')
}

router.get('/', async (req: AuthedRequest, res) => {
  const { rows } = await query(
    `SELECT u.id, u.name, u.email, u.role, u.created_at,
            count(d.id)::int AS device_count
     FROM users u
     LEFT JOIN devices d ON d.assigned_user_id = u.id
     WHERE u.company_id = $1
     GROUP BY u.id
     ORDER BY u.created_at`,
    [req.user!.company_id],
  )
  res.json({ users: rows })
})

router.post('/', async (req: AuthedRequest, res) => {
  const { name, email, role } = req.body ?? {}
  if (!name?.trim() || !email?.trim()) {
    return res.status(400).json({ error: 'Name and email are required' })
  }
  const existing = await query('SELECT 1 FROM users WHERE lower(email) = lower($1)', [email])
  if (existing.rows[0]) {
    return res.status(409).json({ error: 'A user with this email already exists' })
  }
  const pin = await uniquePin(req.user!.company_id)
  const id = crypto.randomUUID()
  const { rows } = await query(
    `INSERT INTO users (id, company_id, name, email, role, pin_hash)
     VALUES ($1, $2, $3, lower($4), $5, $6)
     RETURNING id, name, email, role, created_at`,
    [
      id,
      req.user!.company_id,
      name.trim(),
      email.trim(),
      role === 'admin' ? 'admin' : 'member',
      await bcrypt.hash(pin, 10),
    ],
  )
  // PIN is returned exactly once — only hashes are stored.
  res.json({ user: rows[0], pin })
})

router.post('/:id/reset-pin', async (req: AuthedRequest, res) => {
  const pin = await uniquePin(req.user!.company_id)
  const { rows } = await query(
    `UPDATE users SET pin_hash = $1 WHERE id = $2 AND company_id = $3 RETURNING id`,
    [await bcrypt.hash(pin, 10), req.params.id, req.user!.company_id],
  )
  if (!rows[0]) return res.status(404).json({ error: 'User not found' })
  res.json({ pin })
})

router.delete('/:id', async (req: AuthedRequest, res) => {
  if (req.params.id === req.user!.id) {
    return res.status(400).json({ error: 'You cannot delete your own account' })
  }
  const { rows } = await query(
    'DELETE FROM users WHERE id = $1 AND company_id = $2 RETURNING id',
    [req.params.id, req.user!.company_id],
  )
  if (!rows[0]) return res.status(404).json({ error: 'User not found' })
  res.json({ ok: true })
})

export default router
