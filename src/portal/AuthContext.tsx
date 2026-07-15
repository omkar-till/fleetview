import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

interface Session {
  user: { id: string; name: string; email: string; role: string }
  company: { id: string; name: string }
}

const AuthContext = createContext<Session | null>(null)

export function useSession() {
  const session = useContext(AuthContext)
  if (!session) throw new Error('useSession outside AuthProvider')
  return session
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api
      .get<Session>('/api/auth/me')
      .then(setSession)
      .catch(() => navigate('/login', { replace: true }))
      .finally(() => setLoading(false))
  }, [navigate])

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="spinner dark" />
      </div>
    )
  }
  if (!session) return null
  return <AuthContext.Provider value={session}>{children}</AuthContext.Provider>
}
