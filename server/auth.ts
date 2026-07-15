import crypto from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { query } from './db.js'

export const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'
export const COOKIE_NAME = 'fv_session'

export interface AuthedRequest extends Request {
  user?: { id: string; company_id: string; name: string; email: string; role: string }
  device?: { id: string; company_id: string }
}

export function signSession(userId: string) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '30d' })
}

export function sha256(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

/** Portal auth — session cookie for company admins. */
export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[COOKIE_NAME]
    if (!token) return res.status(401).json({ error: 'Not signed in' })
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string }
    const { rows } = await query(
      'SELECT id, company_id, name, email, role FROM users WHERE id = $1',
      [payload.sub],
    )
    if (!rows[0]) return res.status(401).json({ error: 'Not signed in' })
    req.user = rows[0]
    next()
  } catch {
    res.status(401).json({ error: 'Not signed in' })
  }
}

/** Device auth — bearer token issued at enrollment. */
export async function requireDevice(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Missing device token' })
  const { rows } = await query(
    'SELECT id, company_id FROM devices WHERE token_hash = $1',
    [sha256(token)],
  )
  if (!rows[0]) return res.status(401).json({ error: 'Device not recognised' })
  req.device = rows[0]
  next()
}
