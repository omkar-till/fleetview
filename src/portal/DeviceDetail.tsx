import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { DeviceMap } from '../components/DeviceMap'
import { IconBack, IconBattery, IconTrash } from '../components/Icons'
import { Modal, Spinner, StatusBadge, useToast } from '../components/ui'
import {
  api,
  isOnline,
  timeAgo,
  type Device,
  type DeviceEvent,
  type LocationPoint,
  type User,
} from '../lib/api'
import { EnrollCodeModal } from './Devices'

const EVENT_LABEL: Record<string, string> = {
  enrolled: 'Enrolled',
  assigned: 'Assigned',
  unassigned: 'Unassigned',
  transferred: 'Transferred',
}

export function DeviceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [device, setDevice] = useState<Device | null>(null)
  const [locations, setLocations] = useState<LocationPoint[]>([])
  const [events, setEvents] = useState<DeviceEvent[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [showEnroll, setShowEnroll] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(() => {
    api
      .get<{ device: Device; locations: LocationPoint[]; events: DeviceEvent[] }>(`/api/devices/${id}`)
      .then((r) => {
        setDevice(r.device)
        setLocations(r.locations)
        setEvents(r.events)
      })
      .catch(() => navigate('/devices', { replace: true }))
  }, [id, navigate])

  useEffect(() => {
    refresh()
    api.get<{ users: User[] }>('/api/users').then((r) => setUsers(r.users))
    const interval = setInterval(refresh, 20_000)
    return () => clearInterval(interval)
  }, [refresh])

  async function assign(userId: string) {
    await api.patch(`/api/devices/${id}`, { assignedUserId: userId || null })
    toast(userId ? 'Device assigned' : 'Device unassigned')
    refresh()
  }

  async function remove() {
    setBusy(true)
    await api.delete(`/api/devices/${id}`)
    toast('Device deleted')
    navigate('/devices')
  }

  if (!device) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner dark />
      </div>
    )
  }

  const latest = locations[0]
  const trail = locations.slice().reverse().map((l) => [l.lat, l.lng] as [number, number])

  return (
    <>
      <header className="screen-header">
        <span className="row">
          <Link to="/devices" className="btn ghost sm" aria-label="Back to devices">
            <IconBack size={18} />
          </Link>
          <h1>{device.name}</h1>
          <StatusBadge online={isOnline(device.last_seen_at)} status={device.status} />
        </span>
        <span className="row">
          {device.status === 'pending' && (
            <button className="btn secondary sm" onClick={() => setShowEnroll(true)}>
              Enroll code
            </button>
          )}
          <button className="btn ghost sm" onClick={() => setConfirmDelete(true)} aria-label="Delete device">
            <IconTrash size={16} />
          </button>
        </span>
      </header>
      <div className="screen-body">
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) 1fr', gap: 24, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <h2>Details</h2>
              <InfoRow label="Type"><span style={{ textTransform: 'capitalize' }}>{device.type}</span></InfoRow>
              <InfoRow label="Battery">
                {device.battery != null ? (
                  <span className="row" style={{ gap: 5 }}><IconBattery size={15} /> {device.battery}%</span>
                ) : '—'}
              </InfoRow>
              <InfoRow label="Last seen">{timeAgo(device.last_seen_at)}</InfoRow>
              <InfoRow label="Enrolled">{device.enrolled_at ? new Date(device.enrolled_at).toLocaleDateString() : 'Not yet'}</InfoRow>
              <div className="field">
                <label htmlFor="assignee">Assigned to</label>
                <select
                  id="assignee"
                  className="input"
                  value={device.assigned_user_id ?? ''}
                  onChange={(e) => assign(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="card" style={{ padding: 20 }}>
              <h2 style={{ marginBottom: 12 }}>Activity</h2>
              {events.length === 0 && <p className="muted">No activity yet.</p>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {events.map((e, i) => (
                  <div key={i} className="row" style={{ alignItems: 'flex-start' }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        marginTop: 6,
                        flexShrink: 0,
                        background: e.type === 'transferred' ? 'var(--accent)' : e.type === 'enrolled' ? 'var(--positive)' : 'var(--placeholder)',
                      }}
                    />
                    <span>
                      <div style={{ fontWeight: 500 }}>{EVENT_LABEL[e.type] ?? e.type}</div>
                      <div className="muted">{e.detail}</div>
                      <div className="muted" style={{ fontSize: 12 }}>{timeAgo(e.created_at)}</div>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 16 }}>
            <div className="spread" style={{ marginBottom: 12 }}>
              <h2>Location</h2>
              {latest && <span className="muted">Updated {timeAgo(latest.created_at)}</span>}
            </div>
            {latest ? (
              <DeviceMap
                height={480}
                markers={[{
                  id: device.id,
                  lat: latest.lat,
                  lng: latest.lng,
                  label: device.name,
                  sub: device.assigned_user_name ? `With ${device.assigned_user_name}` : undefined,
                  stale: !isOnline(device.last_seen_at),
                }]}
                trail={trail}
              />
            ) : (
              <p className="muted" style={{ padding: '48px 0', textAlign: 'center' }}>
                No location reported yet. Location appears once the device app is enrolled and sharing.
              </p>
            )}
          </div>
        </div>
      </div>

      {showEnroll && <EnrollCodeModal device={device} onClose={() => setShowEnroll(false)} />}
      {confirmDelete && (
        <Modal
          title="Delete device?"
          onClose={() => setConfirmDelete(false)}
          footer={
            <>
              <button className="btn secondary" onClick={() => setConfirmDelete(false)}>Cancel</button>
              <button className="btn danger" onClick={remove} disabled={busy}>
                {busy ? <Spinner /> : 'Delete'}
              </button>
            </>
          }
        >
          <p className="muted">
            “{device.name}” and its location history will be permanently removed. The device app will be signed out.
          </p>
        </Modal>
      )}
    </>
  )
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="spread" style={{ borderBottom: '1px solid var(--elevation2)', paddingBottom: 10 }}>
      <span className="muted">{label}</span>
      <span style={{ fontWeight: 500 }}>{children}</span>
    </div>
  )
}
