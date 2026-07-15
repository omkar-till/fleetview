import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { IconKey, IconLink, IconPlus, IconTrash, IconUsers } from '../components/Icons'
import { Avatar, EmptyState, Modal, Spinner, useToast } from '../components/ui'
import { api, type User } from '../lib/api'
import { useSession } from './AuthContext'

export function Users() {
  const [users, setUsers] = useState<User[]>([])
  const [loaded, setLoaded] = useState(false)
  const [adding, setAdding] = useState(false)
  const [pinReveal, setPinReveal] = useState<{ name: string; pin: string } | null>(null)
  const [inviteReveal, setInviteReveal] = useState<{ name: string; url: string } | null>(null)
  const { user: me } = useSession()
  const toast = useToast()

  const refresh = useCallback(() => {
    api.get<{ users: User[] }>('/api/users').then((r) => {
      setUsers(r.users)
      setLoaded(true)
    })
  }, [])

  useEffect(refresh, [refresh])

  async function resetPin(user: User) {
    try {
      const { pin } = await api.post<{ pin: string }>(`/api/users/${user.id}/reset-pin`)
      setPinReveal({ name: user.name, pin })
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to reset PIN', 'error')
    }
  }

  async function invite(user: User) {
    try {
      const { token } = await api.post<{ token: string }>(`/api/users/${user.id}/invite`)
      setInviteReveal({ name: user.name, url: `${window.location.origin}/invite?token=${token}` })
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to create invite', 'error')
    }
  }

  async function remove(user: User) {
    if (!window.confirm(`Remove ${user.name}? Their devices become unassigned.`)) return
    try {
      await api.delete(`/api/users/${user.id}`)
      toast(`${user.name} removed`)
      refresh()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to remove user', 'error')
    }
  }

  return (
    <>
      <header className="screen-header">
        <h1>People</h1>
        <button className="btn sm" onClick={() => setAdding(true)}>
          <IconPlus size={16} /> Add person
        </button>
      </header>
      <div className="screen-body">
        <div className="card">
          {loaded && users.length === 0 ? (
            <EmptyState icon={<IconUsers size={26} />} title="No people yet" />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Devices</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <span className="row">
                          <Avatar name={u.name} />
                          <span>
                            <div style={{ fontWeight: 500 }}>{u.name}{u.id === me.id && <span className="muted"> (you)</span>}</div>
                            <div className="muted">{u.email}</div>
                          </span>
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${u.role === 'admin' ? 'info' : 'neutral'}`}>{u.role}</span>
                      </td>
                      <td className="muted">{u.device_count ?? 0}</td>
                      <td>
                        <span className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
                          <button className="btn secondary sm" onClick={() => invite(u)} title="Portal invite / password reset link">
                            <IconLink size={15} /> Invite
                          </button>
                          <button className="btn secondary sm" onClick={() => resetPin(u)} title="Reset transfer PIN">
                            <IconKey size={15} /> Reset PIN
                          </button>
                          {u.id !== me.id && (
                            <button className="btn ghost sm" onClick={() => remove(u)} title="Remove" aria-label={`Remove ${u.name}`}>
                              <IconTrash size={15} />
                            </button>
                          )}
                        </span>
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
        <AddUserModal
          onClose={() => setAdding(false)}
          onCreated={(name, pin) => {
            setAdding(false)
            refresh()
            setPinReveal({ name, pin })
          }}
        />
      )}
      {pinReveal && <PinRevealModal {...pinReveal} onClose={() => setPinReveal(null)} />}
      {inviteReveal && <InviteLinkModal {...inviteReveal} onClose={() => setInviteReveal(null)} />}
    </>
  )
}

function AddUserModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (name: string, pin: string) => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('member')
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const { user, pin } = await api.post<{ user: User; pin: string }>('/api/users', { name, email, role })
      onCreated(user.name, pin)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to add user', 'error')
      setBusy(false)
    }
  }

  return (
    <Modal title="Add person" onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="field">
          <label htmlFor="user-name">Full name</label>
          <input id="user-name" className="input" placeholder="Alex Doe" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </div>
        <div className="field">
          <label htmlFor="user-email">Email</label>
          <input id="user-email" className="input" type="email" placeholder="alex@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="user-role">Role</label>
          <select id="user-role" className="input" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <p className="muted">
          A 4-digit transfer PIN is generated automatically and shown once. To give them portal access, use the{' '}
          <strong>Invite</strong> button after adding them.
        </p>
        <div className="row" style={{ justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" className="btn secondary" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={busy}>{busy ? <Spinner /> : 'Add person'}</button>
        </div>
      </form>
    </Modal>
  )
}

function InviteLinkModal({ name, url, onClose }: { name: string; url: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const toast = useToast()

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast('Could not copy — select the link manually', 'error')
    }
  }

  return (
    <Modal title="Portal invite link" onClose={onClose}>
      <p className="muted">
        Send this link privately to <strong style={{ color: 'var(--text)' }}>{name}</strong>. They'll set their own
        password and sign in. The link works <strong style={{ color: 'var(--text)' }}>once</strong> — generating a new
        one also acts as a password reset.
      </p>
      <div
        className="mono"
        style={{
          padding: '12px 14px',
          background: 'var(--primary-light)',
          borderRadius: 'var(--radius-m)',
          fontSize: 12,
          wordBreak: 'break-all',
          userSelect: 'all',
        }}
      >
        {url}
      </div>
      <button className="btn" onClick={copy}>{copied ? 'Copied ✓' : 'Copy link'}</button>
    </Modal>
  )
}

function PinRevealModal({ name, pin, onClose }: { name: string; pin: string; onClose: () => void }) {
  return (
    <Modal title="Transfer PIN" onClose={onClose}>
      <p className="muted">
        Share this PIN privately with <strong style={{ color: 'var(--text)' }}>{name}</strong>. They enter it on a
        device to take it over. It is shown <strong style={{ color: 'var(--text)' }}>only once</strong> — you can reset
        it any time.
      </p>
      <div
        style={{
          textAlign: 'center',
          padding: '20px 0',
          background: 'var(--primary-light)',
          borderRadius: 'var(--radius-m)',
          fontSize: 40,
          fontWeight: 700,
          letterSpacing: '0.4em',
          textIndent: '0.4em',
          color: 'var(--primary)',
        }}
      >
        {pin}
      </div>
      <button className="btn" onClick={onClose}>Got it</button>
    </Modal>
  )
}
