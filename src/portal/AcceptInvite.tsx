import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { BrandLogo, Spinner } from '../components/ui'
import { api } from '../lib/api'

interface InviteInfo {
  name: string
  email: string
  company_name: string
}

/** Public page — a member opens their one-time invite link and sets a password. */
export function AcceptInvite() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [invalid, setInvalid] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!token) {
      setInvalid('This invite link is missing its token.')
      return
    }
    api
      .get<{ invite: InviteInfo }>(`/api/auth/invite/${token}`)
      .then((r) => setInvite(r.invite))
      .catch((err) => setInvalid(err instanceof Error ? err.message : 'Invalid invite'))
  }, [token])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setBusy(true)
    setError('')
    try {
      await api.post('/api/auth/accept-invite', { token, password })
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set password')
      setBusy(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="card auth-card">
        <div className="row" style={{ justifyContent: 'center', marginBottom: 4 }}>
          <BrandLogo size={44} />
        </div>

        {invalid ? (
          <>
            <div style={{ textAlign: 'center' }}>
              <h1>Invite not valid</h1>
              <p className="muted" style={{ marginTop: 8 }}>{invalid}</p>
              <p className="muted" style={{ marginTop: 8 }}>
                Ask your admin to generate a new invite link from the People page.
              </p>
            </div>
            <Link to="/login" className="btn secondary" style={{ textAlign: 'center' }}>
              Go to sign in
            </Link>
          </>
        ) : !invite ? (
          <div className="row" style={{ justifyContent: 'center', padding: 20 }}>
            <Spinner dark />
          </div>
        ) : (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ textAlign: 'center' }}>
              <h1>Welcome, {invite.name.split(' ')[0]}</h1>
              <p className="muted" style={{ marginTop: 6 }}>
                Set a password for <strong style={{ color: 'var(--text)' }}>{invite.email}</strong> to join{' '}
                <strong style={{ color: 'var(--text)' }}>{invite.company_name}</strong> on Oolio Fleet.
              </p>
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                className="input"
                type="password"
                placeholder="At least 8 characters"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="field">
              <label htmlFor="confirm">Confirm password</label>
              <input
                id="confirm"
                className="input"
                type="password"
                placeholder="Repeat password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
            {error && <p style={{ color: 'var(--negative)', fontSize: 13 }}>{error}</p>}
            <button className="btn" disabled={busy}>
              {busy ? <Spinner /> : 'Set password & sign in'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
