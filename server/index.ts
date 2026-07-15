import path from 'node:path'
import { fileURLToPath } from 'node:url'
import cookieParser from 'cookie-parser'
import express from 'express'
import { migrate } from './db.js'
import authRoutes from './routes/auth.js'
import deviceApiRoutes from './routes/deviceApi.js'
import devicesRoutes from './routes/devices.js'
import usersRoutes from './routes/users.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

app.set('trust proxy', 1)
app.use(express.json())
app.use(cookieParser())

app.use('/api/auth', authRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/devices', devicesRoutes)
app.use('/api/device', deviceApiRoutes)

app.get('/api/health', (_req, res) => res.json({ ok: true }))

// Production: serve the built SPA (portal + device PWA).
if (process.env.NODE_ENV === 'production') {
  const dist = path.join(__dirname, '..', 'dist')
  app.use(express.static(dist))
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  res.status(500).json({ error: 'Something went wrong' })
})

const port = Number(process.env.PORT) || 3000

migrate()
  .then(() => {
    app.listen(port, () => console.log(`FleetView API listening on :${port}`))
  })
  .catch((err) => {
    console.error('Migration failed — check DATABASE_URL', err)
    process.exit(1)
  })
