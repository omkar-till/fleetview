import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { IconLogo } from '../components/Icons'
import { Spinner } from '../components/ui'
import { api } from '../lib/api'

export function Signup() {
  const [companyName, setCompanyName] = useState('')
  const [name, setName] = useState('')
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
      await api.post('/api/auth/signup', { companyName, name, email, password })
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-screen">
      <form className="card auth-card" onSubmit={submit}>
        <div className="row" style={{ justifyContent: 'center', marginBottom: 4 }}>
          <span style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <IconLogo size={22} />
          </span>
        </div>
        <div style={{ textAlign: 'center' }}>
          <h1>Set up FleetView</h1>
          <p className="muted">Create your company workspace</p>
        </div>
        <div className="field">
          <label htmlFor="company">Company name</label>
          <input id="company" className="input" placeholder="Acme Inc" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required autoFocus />
        </div>
        <div className="field">
          <label htmlFor="name">Your name</label>
          <input id="name" className="input" placeholder="Alex Doe" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="email">Work email</label>
          <input id="email" className="input" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" className="input" type="password" placeholder="At least 8 characters" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p style={{ color: 'var(--negative)', fontSize: 13 }}>{error}</p>}
        <button className="btn" disabled={busy}>
          {busy ? <Spinner /> : 'Create workspace'}
        </button>
        <p className="muted" style={{ textAlign: 'center' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 500 }}>
            Sign in
          </Link>
        </p>
      </form>
    </div>
  )
}
