import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { AuthedRequest, requireDevice, sha256 } from '../auth.js'
import { query } from '../db.js'

const router = Router()

/** Exchange an enrollment code for a permanent device token. */
router.post('/enroll', async (req, res) => {
  const code = (req.body?.code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!code) return res.status(400).json({ error: 'Enter the enrollment code' })
  const { rows } = await query(
    `SELECT id, status FROM devices WHERE enroll_code = $1`,
    [code],
  )
  const device = rows[0]
  if (!device) return res.status(404).json({ error: 'Invalid enrollment code' })
  if (device.status === 'active') {
    return res.status(409).json({ error: 'This device is already enrolled' })
  }
  const token = `fvd_${crypto.randomBytes(24).toString('hex')}`
  await query(
    `UPDATE devices SET status = 'active', token_hash = $1, enrolled_at = now(), last_seen_at = now()
     WHERE id = $2`,
    [sha256(token), device.id],
  )
  await query(
    `INSERT INTO device_events (device_id, type, detail) VALUES ($1, 'enrolled', 'Device enrolled')`,
    [device.id],
  )
  res.json({ token })
})

router.use(requireDevice)

/** Current device state shown on the device app home screen. */
router.get('/state', async (req: AuthedRequest, res) => {
  const { rows } = await query(
    `SELECT d.id, d.name, d.type, d.status, d.last_seen_at,
            c.name AS company_name,
            u.id AS assigned_user_id, u.name AS assigned_user_name, u.email AS assigned_user_email
     FROM devices d
     JOIN companies c ON c.id = d.company_id
     LEFT JOIN users u ON u.id = d.assigned_user_id
     WHERE d.id = $1`,
    [req.device!.id],
  )
  await query('UPDATE devices SET last_seen_at = now() WHERE id = $1', [req.device!.id])
  res.json({ device: rows[0] })
})

/** Reassign this device to whichever company user matches the PIN. */
router.post('/transfer', async (req: AuthedRequest, res) => {
  const pin = String(req.body?.pin ?? '')
  if (!/^\d{4}$/.test(pin)) return res.status(400).json({ error: 'Enter a 4-digit PIN' })

  const { rows: users } = await query(
    `SELECT id, name, pin_hash FROM users WHERE company_id = $1 AND pin_hash IS NOT NULL`,
    [req.device!.company_id],
  )
  let match: { id: string; name: string } | null = null
  for (const user of users) {
    if (await bcrypt.compare(pin, user.pin_hash)) {
      match = user
      break
    }
  }
  if (!match) return res.status(401).json({ error: 'PIN not recognised' })

  await query('UPDATE devices SET assigned_user_id = $1, last_seen_at = now() WHERE id = $2', [
    match.id,
    req.device!.id,
  ])
  await query(
    `INSERT INTO device_events (device_id, type, user_id, detail)
     VALUES ($1, 'transferred', $2, $3)`,
    [req.device!.id, match.id, `Transferred to ${match.name} via PIN on the device`],
  )
  res.json({ assignedUserName: match.name })
})

/** Location ping from the device. */
router.post('/location', async (req: AuthedRequest, res) => {
  const { lat, lng, accuracy, battery } = req.body ?? {}
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ error: 'lat and lng are required numbers' })
  }
  await query(
    'INSERT INTO locations (device_id, lat, lng, accuracy) VALUES ($1, $2, $3, $4)',
    [req.device!.id, lat, lng, typeof accuracy === 'number' ? accuracy : null],
  )
  await query('UPDATE devices SET last_seen_at = now(), battery = $1 WHERE id = $2', [
    typeof battery === 'number' ? Math.round(battery) : null,
    req.device!.id,
  ])
  res.json({ ok: true })
})

export default router
