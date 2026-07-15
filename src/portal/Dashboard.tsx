import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconDevice, IconMap, IconUsers } from '../components/Icons'
import { DeviceMap } from '../components/DeviceMap'
import { StatusBadge } from '../components/ui'
import { api, isOnline, timeAgo, type Device, type User } from '../lib/api'

export function Dashboard() {
  const [devices, setDevices] = useState<Device[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get<{ devices: Device[] }>('/api/devices'),
      api.get<{ users: User[] }>('/api/users'),
    ]).then(([d, u]) => {
      setDevices(d.devices)
      setUsers(u.users)
      setLoaded(true)
    })
  }, [])

  const active = devices.filter((d) => d.status === 'active')
  const online = active.filter((d) => isOnline(d.last_seen_at))
  const unassigned = devices.filter((d) => !d.assigned_user_id)
  const located = active.filter((d) => d.lat != null && d.lng != null)

  return (
    <>
      <header className="screen-header">
        <h1>Dashboard</h1>
        <Link to="/devices" className="btn sm">
          Manage devices
        </Link>
      </header>
      <div className="screen-body">
        <div className="stat-grid">
          <div className="card stat-card">
            <span className="stat-label"><IconDevice size={15} /> Devices</span>
            <span className="stat-value">{devices.length}</span>
            <span className="stat-hint">{active.length} enrolled</span>
          </div>
          <div className="card stat-card">
            <span className="stat-label"><span className="dot" style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--positive)' }} /> Online now</span>
            <span className="stat-value">{online.length}</span>
            <span className="stat-hint">seen in the last 5 minutes</span>
          </div>
          <div className="card stat-card">
            <span className="stat-label"><IconUsers size={15} /> People</span>
            <span className="stat-value">{users.length}</span>
            <span className="stat-hint">{unassigned.length} device{unassigned.length === 1 ? '' : 's'} unassigned</span>
          </div>
          <div className="card stat-card">
            <span className="stat-label"><IconMap size={15} /> Located</span>
            <span className="stat-value">{located.length}</span>
            <span className="stat-hint">devices reporting location</span>
          </div>
        </div>

        {located.length > 0 && (
          <div className="card" style={{ padding: 16 }}>
            <div className="spread" style={{ marginBottom: 12 }}>
              <h2>Live map</h2>
              <Link to="/map" className="btn secondary sm">Open full map</Link>
            </div>
            <DeviceMap
              height={340}
              markers={located.map((d) => ({
                id: d.id,
                lat: d.lat!,
                lng: d.lng!,
                label: d.name,
                sub: d.assigned_user_name ? `With ${d.assigned_user_name} · ${timeAgo(d.location_at)}` : timeAgo(d.location_at),
                stale: !isOnline(d.last_seen_at),
              }))}
            />
          </div>
        )}

        <div className="card">
          <div className="spread" style={{ padding: '16px 16px 0' }}>
            <h2>Recent devices</h2>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Device</th>
                  <th>Assigned to</th>
                  <th>Status</th>
                  <th>Last seen</th>
                </tr>
              </thead>
              <tbody>
                {devices.slice(0, 5).map((d) => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 500 }}>
                      <Link to={`/devices/${d.id}`} style={{ color: 'var(--primary)' }}>{d.name}</Link>
                    </td>
                    <td>{d.assigned_user_name ?? <span className="muted">—</span>}</td>
                    <td><StatusBadge online={isOnline(d.last_seen_at)} status={d.status} /></td>
                    <td className="muted">{timeAgo(d.last_seen_at)}</td>
                  </tr>
                ))}
                {loaded && devices.length === 0 && (
                  <tr>
                    <td colSpan={4} className="muted" style={{ textAlign: 'center', padding: 32 }}>
                      No devices yet — add one from the Devices page to get an enrollment code.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
