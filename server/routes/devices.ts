import crypto from 'node:crypto'
import { Router } from 'express'
import { AuthedRequest, requireAuth } from '../auth.js'
import { query } from '../db.js'

const router = Router()
router.use(requireAuth)

/** Codes avoid ambiguous characters (0/O, 1/I). */
function generateEnrollCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from(
    { length: 6 },
    () => alphabet[crypto.randomInt(alphabet.length)],
  ).join('')
}

const DEVICE_LIST_SQL = `
  SELECT d.id, d.name, d.type, d.status, d.enroll_code, d.battery,
         d.last_seen_at, d.enrolled_at, d.created_at,
         u.id AS assigned_user_id, u.name AS assigned_user_name,
         l.lat, l.lng, l.created_at AS location_at
  FROM devices d
  LEFT JOIN users u ON u.id = d.assigned_user_id
  LEFT JOIN LATERAL (
    SELECT lat, lng, created_at FROM locations
    WHERE device_id = d.id ORDER BY created_at DESC LIMIT 1
  ) l ON true
  WHERE d.company_id = $1
`

router.get('/', async (req: AuthedRequest, res) => {
  const { rows } = await query(`${DEVICE_LIST_SQL} ORDER BY d.created_at DESC`, [
    req.user!.company_id,
  ])
  res.json({ devices: rows })
})

router.post('/', async (req: AuthedRequest, res) => {
  const { name, type } = req.body ?? {}
  if (!name?.trim()) return res.status(400).json({ error: 'Device name is required' })
  const id = crypto.randomUUID()
  const code = generateEnrollCode()
  const { rows } = await query(
    `INSERT INTO devices (id, company_id, name, type, enroll_code)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, type, status, enroll_code, created_at`,
    [id, req.user!.company_id, name.trim(), type || 'phone', code],
  )
  res.json({ device: rows[0] })
})

router.get('/:id', async (req: AuthedRequest, res) => {
  const { rows } = await query(`${DEVICE_LIST_SQL} AND d.id = $2`, [
    req.user!.company_id,
    req.params.id,
  ])
  if (!rows[0]) return res.status(404).json({ error: 'Device not found' })

  const [locations, events] = await Promise.all([
    query(
      `SELECT lat, lng, accuracy, created_at FROM locations
       WHERE device_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [req.params.id],
    ),
    query(
      `SELECT e.type, e.detail, e.created_at, u.name AS user_name
       FROM device_events e LEFT JOIN users u ON u.id = e.user_id
       WHERE e.device_id = $1 ORDER BY e.created_at DESC LIMIT 50`,
      [req.params.id],
    ),
  ])
  res.json({ device: rows[0], locations: locations.rows, events: events.rows })
})

router.patch('/:id', async (req: AuthedRequest, res) => {
  const { name, assignedUserId } = req.body ?? {}
  const existing = await query(
    'SELECT id, assigned_user_id FROM devices WHERE id = $1 AND company_id = $2',
    [req.params.id, req.user!.company_id],
  )
  if (!existing.rows[0]) return res.status(404).json({ error: 'Device not found' })

  if (name !== undefined) {
    if (!name?.trim()) return res.status(400).json({ error: 'Device name is required' })
    await query('UPDATE devices SET name = $1 WHERE id = $2', [name.trim(), req.params.id])
  }

  if (assignedUserId !== undefined) {
    if (assignedUserId) {
      const user = await query('SELECT id, name FROM users WHERE id = $1 AND company_id = $2', [
        assignedUserId,
        req.user!.company_id,
      ])
      if (!user.rows[0]) return res.status(400).json({ error: 'User not found' })
      await query('UPDATE devices SET assigned_user_id = $1 WHERE id = $2', [
        assignedUserId,
        req.params.id,
      ])
      await query(
        `INSERT INTO device_events (device_id, type, user_id, detail)
         VALUES ($1, 'assigned', $2, $3)`,
        [req.params.id, assignedUserId, `Assigned to ${user.rows[0].name} from the portal`],
      )
    } else {
      await query('UPDATE devices SET assigned_user_id = NULL WHERE id = $1', [req.params.id])
      await query(
        `INSERT INTO device_events (device_id, type, detail)
         VALUES ($1, 'unassigned', 'Unassigned from the portal')`,
        [req.params.id],
      )
    }
  }
  res.json({ ok: true })
})

router.delete('/:id', async (req: AuthedRequest, res) => {
  const { rows } = await query(
    'DELETE FROM devices WHERE id = $1 AND company_id = $2 RETURNING id',
    [req.params.id, req.user!.company_id],
  )
  if (!rows[0]) return res.status(404).json({ error: 'Device not found' })
  res.json({ ok: true })
})

export default router
