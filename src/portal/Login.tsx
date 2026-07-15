import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BrandLogo, Spinner } from '../components/ui'
import { api } from '../lib/api'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.post('/api/auth/login', { email, password })
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-screen">
      <form className="card auth-card" onSubmit={submit}>
        <div className="row" style={{ justifyContent: 'center', marginBottom: 4 }}>
          <BrandLogo size={44} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <h1>Welcome back</h1>
          <p className="muted">Sign in to manage your devices</p>
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            className="input"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            className="input"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p style={{ color: 'var(--negative)', fontSize: 13 }}>{error}</p>}
        <button className="btn" disabled={busy}>
          {busy ? <Spinner /> : 'Sign in'}
        </button>
        <p className="muted" style={{ textAlign: 'center' }}>
          New here?{' '}
          <Link to="/signup" style={{ color: 'var(--primary)', fontWeight: 500 }}>
            Create a company
          </Link>
        </p>
      </form>
    </div>
  )
}
