import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DeviceMap } from '../components/DeviceMap'
import { IconMap } from '../components/Icons'
import { EmptyState, StatusBadge } from '../components/ui'
import { api, isOnline, timeAgo, type Device } from '../lib/api'

export function MapPage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loaded, setLoaded] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const refresh = () =>
      api.get<{ devices: Device[] }>('/api/devices').then((r) => {
        setDevices(r.devices)
        setLoaded(true)
      })
    refresh()
    const interval = setInterval(refresh, 20_000)
    return () => clearInterval(interval)
  }, [])

  const located = devices.filter((d) => d.lat != null && d.lng != null)

  return (
    <>
      <header className="screen-header">
        <h1>Live map</h1>
        <span className="muted">{located.length} of {devices.length} devices reporting · refreshes every 20s</span>
      </header>
      <div className="screen-body" style={{ padding: 16, gap: 16 }}>
        {loaded && located.length === 0 ? (
          <div className="card" style={{ flex: 1 }}>
            <EmptyState
              icon={<IconMap size={26} />}
              title="No locations yet"
              hint="Enroll a device and turn on location sharing in the device app to see it here."
            />
          </div>
        ) : (
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr minmax(240px, 300px)', gap: 16, minHeight: 0 }}>
            <DeviceMap
              height="100%"
              markers={located.map((d) => ({
                id: d.id,
                lat: d.lat!,
                lng: d.lng!,
                label: d.name,
                sub: d.assigned_user_name
                  ? `With ${d.assigned_user_name} · ${timeAgo(d.location_at)}`
                  : timeAgo(d.location_at),
                stale: !isOnline(d.last_seen_at),
              }))}
            />
            <div className="card" style={{ overflowY: 'auto' }}>
              {located.map((d) => (
                <button
                  key={d.id}
                  onClick={() => navigate(`/devices/${d.id}`)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '14px 16px',
                    borderBottom: '1px solid var(--elevation2)',
                  }}
                >
                  <div className="spread">
                    <span style={{ fontWeight: 500 }}>{d.name}</span>
                    <StatusBadge online={isOnline(d.last_seen_at)} status={d.status} />
                  </div>
                  <div className="muted">
                    {d.assigned_user_name ?? 'Unassigned'} · {timeAgo(d.location_at)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
