import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { IconLogo, IconMap, IconShield, IconTransfer } from '../components/Icons'
import { Avatar, Spinner, useToast } from '../components/ui'
import { ApiError, deviceApi } from '../lib/api'
import { PinPad } from './PinPad'

interface DeviceState {
  id: string
  name: string
  type: string
  company_name: string
  assigned_user_id: string | null
  assigned_user_name: string | null
}

const LOCATION_PREF_KEY = 'fv_share_location'
const PING_INTERVAL_MS = 60_000

export function DeviceApp() {
  const [enrolled, setEnrolled] = useState<boolean>(() => !!deviceApi.token())
  return enrolled ? (
    <DeviceHome onSignedOut={() => setEnrolled(false)} />
  ) : (
    <EnrollScreen onEnrolled={() => setEnrolled(true)} />
  )
}

/* ---------- Enrollment ---------- */

function EnrollScreen({ onEnrolled }: { onEnrolled: () => void }) {
  const [params] = useSearchParams()
  const [code, setCode] = useState(params.get('code') ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e?: FormEvent) {
    e?.preventDefault()
    if (!code.trim()) return
    setBusy(true)
    setError('')
    try {
      const { token } = await deviceApi.post<{ token: string }>('/api/device/enroll', { code })
      deviceApi.setToken(token)
      onEnrolled()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enrollment failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="device-screen" style={{ justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <span
          style={{
            width: 56, height: 56, borderRadius: 14, background: 'var(--gradient)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
          }}
        >
          <IconLogo size={30} />
        </span>
        <h1 style={{ marginTop: 14 }}>Enroll this device</h1>
        <p className="muted" style={{ marginTop: 6 }}>
          Enter the 6-character code from your company's FleetView portal.
        </p>
      </div>
      <form onSubmit={submit} className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <input
          className="input code-input"
          placeholder="ABC123"
          value={code}
          maxLength={6}
          autoCapitalize="characters"
          autoCorrect="off"
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          aria-label="Enrollment code"
        />
        {error && <p style={{ color: 'var(--negative)', fontSize: 13, textAlign: 'center' }}>{error}</p>}
        <button className="btn" disabled={busy || code.length < 6}>
          {busy ? <Spinner /> : 'Enroll device'}
        </button>
      </form>
    </div>
  )
}

/* ---------- Enrolled home ---------- */

function DeviceHome({ onSignedOut }: { onSignedOut: () => void }) {
  const [state, setState] = useState<DeviceState | null>(null)
  const [transferring, setTransferring] = useState(false)
  const [sharing, setSharing] = useState(() => localStorage.getItem(LOCATION_PREF_KEY) === 'on')
  const [lastPing, setLastPing] = useState<Date | null>(null)
  const [geoError, setGeoError] = useState('')
  const toast = useToast()

  const refresh = useCallback(async () => {
    try {
      const { device } = await deviceApi.get<{ device: DeviceState }>('/api/device/state')
      setState(device)
    } catch (err) {
      // Device deleted from the portal → token is dead, return to enrollment.
      if (err instanceof ApiError && err.status === 401) {
        deviceApi.clearToken()
        onSignedOut()
      }
    }
  }, [onSignedOut])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 30_000)
    return () => clearInterval(interval)
  }, [refresh])

  /* Location pings — on load and every minute while sharing is on. */
  const sendLocation = useCallback(async () => {
    if (!('geolocation' in navigator)) {
      setGeoError('Location is not supported on this device')
      return
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setGeoError('')
        let battery: number | undefined
        try {
          // Battery Status API — Android Chrome only; ignore elsewhere.
          const b = await (navigator as any).getBattery?.()
          if (b) battery = Math.round(b.level * 100)
        } catch { /* unsupported */ }
        try {
          await deviceApi.post('/api/device/location', {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            battery,
          })
          setLastPing(new Date())
        } catch { /* transient network failure — next ping will retry */ }
      },
      (err) => setGeoError(err.code === err.PERMISSION_DENIED ? 'Location permission denied — enable it in your browser settings' : 'Could not get location'),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 },
    )
  }, [])

  useEffect(() => {
    if (!sharing) return
    sendLocation()
    const interval = setInterval(sendLocation, PING_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [sharing, sendLocation])

  function toggleSharing() {
    const next = !sharing
    setSharing(next)
    localStorage.setItem(LOCATION_PREF_KEY, next ? 'on' : 'off')
  }

  if (!state) {
    return (
      <div className="device-screen" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <Spinner dark />
      </div>
    )
  }

  return (
    <div className="device-screen">
      <div className="row" style={{ justifyContent: 'center', padding: '10px 0 4px' }}>
        <span
          style={{
            width: 34, height: 34, borderRadius: 9, background: 'var(--gradient)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
          }}
        >
          <IconLogo size={19} />
        </span>
        <div>
          <div style={{ fontWeight: 700 }}>{state.name}</div>
          <div className="muted" style={{ fontSize: 12 }}>{state.company_name}</div>
        </div>
      </div>

      {/* Current holder */}
      <div className="card" style={{ padding: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        {state.assigned_user_name ? (
          <>
            <span className="avatar" style={{ width: 64, height: 64, fontSize: 22 }}>
              {state.assigned_user_name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')}
            </span>
            <div>
              <div className="muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>This device is with</div>
              <h2 style={{ fontSize: 20, marginTop: 2 }}>{state.assigned_user_name}</h2>
            </div>
          </>
        ) : (
          <>
            <Avatar name="?" />
            <div>
              <h2 style={{ fontSize: 18 }}>Unassigned</h2>
              <p className="muted">Enter your PIN to take this device</p>
            </div>
          </>
        )}
        <button className="btn" style={{ width: '100%', marginTop: 6 }} onClick={() => setTransferring(true)}>
          <IconTransfer size={17} />
          {state.assigned_user_name ? 'Transfer to me / someone else' : 'Take this device'}
        </button>
      </div>

      {/* Location sharing */}
      <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="spread">
          <span className="row">
            <span
              style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: sharing ? 'var(--positive-light)' : 'var(--elevation2)',
                color: sharing ? '#2e7d32' : 'var(--text-light)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <IconMap size={19} />
            </span>
            <span>
              <div style={{ fontWeight: 600 }}>Location sharing</div>
              <div className="muted" style={{ fontSize: 12 }}>
                {sharing
                  ? lastPing
                    ? `Sent ${lastPing.toLocaleTimeString()} · pings every minute while open`
                    : 'Getting location…'
                  : 'The portal cannot see this device'}
              </div>
            </span>
          </span>
          <button
            role="switch"
            aria-checked={sharing}
            aria-label="Toggle location sharing"
            onClick={toggleSharing}
            style={{
              width: 50, height: 30, borderRadius: 15, flexShrink: 0, position: 'relative',
              background: sharing ? 'var(--positive)' : 'var(--border)', transition: 'background 0.15s',
            }}
          >
            <span
              style={{
                position: 'absolute', top: 3, left: sharing ? 23 : 3,
                width: 24, height: 24, borderRadius: 12, background: '#fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.25)', transition: 'left 0.15s',
              }}
            />
          </button>
        </div>
        {geoError && <p style={{ color: 'var(--negative)', fontSize: 13 }}>{geoError}</p>}
      </div>

      <div className="row muted" style={{ justifyContent: 'center', gap: 6, fontSize: 12 }}>
        <IconShield size={14} />
        Managed by {state.company_name} · FleetView
      </div>

      {transferring && (
        <PinPad
          onClose={() => setTransferring(false)}
          onSuccess={(name) => {
            setTransferring(false)
            toast(`Device transferred to ${name}`)
            refresh()
          }}
        />
      )}
    </div>
  )
}
