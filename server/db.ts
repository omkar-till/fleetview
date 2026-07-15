import pg from 'pg'

const connectionString =
  process.env.DATABASE_URL || 'postgres://localhost:5432/fleetview'

const isLocal =
  connectionString.includes('localhost') || connectionString.includes('127.0.0.1')

export const pool = new pg.Pool({
  connectionString,
  ssl: isLocal ? undefined : { rejectUnauthorized: false },
  max: 5,
})

export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: unknown[],
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params as any[])
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'member',
  password_hash text,
  pin_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS devices (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'phone',
  status text NOT NULL DEFAULT 'pending',
  enroll_code text UNIQUE,
  token_hash text,
  assigned_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  battery int,
  last_seen_at timestamptz,
  enrolled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS locations (
  id bigserial PRIMARY KEY,
  device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  accuracy double precision,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_locations_device ON locations(device_id, created_at DESC);

CREATE TABLE IF NOT EXISTS device_events (
  id bigserial PRIMARY KEY,
  device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  type text NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_events_device ON device_events(device_id, created_at DESC);

ALTER TABLE users ADD COLUMN IF NOT EXISTS invite_token text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_invite ON users(invite_token);
`

export async function migrate() {
  await pool.query(SCHEMA)
}
