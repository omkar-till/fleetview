import { useEffect, useState } from 'react'
import { IconBack, IconX } from '../components/Icons'
import { deviceApi } from '../lib/api'

/**
 * Full-screen numeric keypad for PIN transfer.
 * Auto-submits when 4 digits are entered.
 */
export function PinPad({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: (assignedUserName: string) => void
}) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function press(digit: string) {
    if (busy || pin.length >= 4) return
    setError('')
    setPin(pin + digit)
  }

  useEffect(() => {
    if (pin.length !== 4) return
    let cancelled = false
    setBusy(true)
    deviceApi
      .post<{ assignedUserName: string }>('/api/device/transfer', { pin })
      .then(({ assignedUserName }) => {
        if (!cancelled) onSuccess(assignedUserName)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Transfer failed')
        setPin('')
      })
      .finally(() => !cancelled && setBusy(false))
    return () => {
      cancelled = true
    }
  }, [pin, onSuccess])

  return (
    <div
      className="modal-overlay"
      style={{ background: 'var(--elevation1)', alignItems: 'stretch', padding: 0 }}
    >
      <div className="device-screen" style={{ width: '100%', justifyContent: 'center', gap: 24 }}>
        <button className="btn ghost sm" onClick={onClose} style={{ alignSelf: 'flex-start' }} aria-label="Cancel">
          <IconX size={20} />
        </button>
        <div style={{ textAlign: 'center' }}>
          <h1>Enter your PIN</h1>
          <p className="muted" style={{ marginTop: 6 }}>
            The device is reassigned to whoever's PIN is entered
          </p>
        </div>

        <div className={`pin-dots ${error ? 'error' : ''}`}>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`pin-dot ${i < pin.length ? 'filled' : ''}`} />
          ))}
        </div>
        <p style={{ color: 'var(--negative)', fontSize: 13, textAlign: 'center', minHeight: 18 }}>
          {busy ? 'Checking…' : error}
        </p>

        <div className="pin-pad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button key={d} className="pin-key" onClick={() => press(d)}>
              {d}
            </button>
          ))}
          <span />
          <button className="pin-key" onClick={() => press('0')}>0</button>
          <button
            className="pin-key"
            onClick={() => setPin(pin.slice(0, -1))}
            aria-label="Delete digit"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <IconBack size={22} />
          </button>
        </div>
      </div>
    </div>
  )
}
