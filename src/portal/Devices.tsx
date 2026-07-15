import QRCode from 'qrcode'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconBattery, IconDevice, IconPlus } from '../components/Icons'
import { EmptyState, Modal, Spinner, StatusBadge, useToast } from '../components/ui'
import { api, isOnline, timeAgo, type Device } from '../lib/api'

const DEVICE_TYPES = ['phone', 'tablet', 'laptop', 'terminal', 'other']

export function Devices() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loaded, setLoaded] = useState(false)
  const [adding, setAdding] = useState(false)
  const [enrollTarget, setEnrollTarget] = useState<Device | null>(null)
  const navigate = useNavigate()

  const refresh = useCallback(() => {
    api.get<{ devices: Device[] }>('/api/devices').then((r) => {
      setDevices(r.devices)
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 30_000)
    return () => clearInterval(interval)
  }, [refresh])

  return (
    <>
      <header className="screen-header">
        <h1>Devices</h1>
        <button className="btn sm" onClick={() => setAdding(true)}>
          <IconPlus size={16} /> Add device
        </button>
      </header>
      <div className="screen-body">
        <div className="card">
          {loaded && devices.length === 0 ? (
            <EmptyState
              icon={<IconDevice size={26} />}
              title="No devices yet"
              hint="Add a device to get an enrollment code, then open the device app on it."
              action={
                <button className="btn sm" onClick={() => setAdding(true)}>
                  <IconPlus size={16} /> Add your first device
                </button>
              }
            />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Device</th>
                    <th>Type</th>
                    <th>Assigned to</th>
                    <th>Status</th>
                    <th>Battery</th>
                    <th>Last seen</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((d) => (
                    <tr key={d.id} className="clickable" onClick={() => navigate(`/devices/${d.id}`)}>
                      <td style={{ fontWeight: 500 }}>{d.name}</td>
                      <td style={{ textTransform: 'capitalize' }} className="muted">{d.type}</td>
                      <td>{d.assigned_user_name ?? <span className="muted">Unassigned</span>}</td>
                      <td><StatusBadge online={isOnline(d.last_seen_at)} status={d.status} /></td>
                      <td className="muted">
                        {d.battery != null ? (
                          <span className="row" style={{ gap: 5 }}>
                            <IconBattery size={15} /> {d.battery}%
                          </span>
                        ) : '—'}
                      </td>
                      <td className="muted">{timeAgo(d.last_seen_at)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        {d.status === 'pending' && (
                          <button className="btn secondary sm" onClick={() => setEnrollTarget(d)}>
                            Enroll code
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {adding && (
        <AddDeviceModal
          onClose={() => setAdding(false)}
          onCreated={(device) => {
            setAdding(false)
            refresh()
            setEnrollTarget(device)
          }}
        />
      )}
      {enrollTarget && <EnrollCodeModal device={enrollTarget} onClose={() => setEnrollTarget(null)} />}
    </>
  )
}

function AddDeviceModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (device: Device) => void
}) {
  const [name, setName] = useState('')
  const [type, setType] = useState('phone')
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const { device } = await api.post<{ device: Device }>('/api/devices', { name, type })
      onCreated(device)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to add device', 'error')
      setBusy(false)
    }
  }

  return (
    <Modal title="Add device" onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="field">
          <label htmlFor="device-name">Device name</label>
          <input
            id="device-name"
            className="input"
            placeholder="e.g. Warehouse iPad 3"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div className="field">
          <label htmlFor="device-type">Type</label>
          <select id="device-type" className="input" value={type} onChange={(e) => setType(e.target.value)}>
            {DEVICE_TYPES.map((t) => (
              <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" className="btn secondary" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={busy}>{busy ? <Spinner /> : 'Add device'}</button>
        </div>
      </form>
    </Modal>
  )
}

export function EnrollCodeModal({ device, onClose }: { device: Device; onClose: () => void }) {
  const [qr, setQr] = useState('')
  const enrollUrl = `${window.location.origin}/device?code=${device.enroll_code}`

  useEffect(() => {
    QRCode.toDataURL(enrollUrl, { width: 220, margin: 1, color: { dark: '#222222' } }).then(setQr)
  }, [enrollUrl])

  return (
    <Modal title={`Enroll “${device.name}”`} onClose={onClose}>
      <p className="muted">
        On the device, open <span className="mono" style={{ color: 'var(--text)' }}>{window.location.origin}/device</span> and
        enter this code — or scan the QR code below.
      </p>
      <div
        style={{
          textAlign: 'center',
          padding: '18px 0',
          background: 'var(--primary-light)',
          borderRadius: 'var(--radius-m)',
          fontSize: 32,
          fontWeight: 700,
          letterSpacing: '0.3em',
          textIndent: '0.3em',
        }}
      >
        {device.enroll_code}
      </div>
      {qr && (
        <div style={{ textAlign: 'center' }}>
          <img src={qr} alt="Enrollment QR code" style={{ borderRadius: 8, border: '1px solid var(--border)' }} />
        </div>
      )}
      <button className="btn secondary" onClick={onClose}>Done</button>
    </Modal>
  )
}
