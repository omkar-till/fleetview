import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { IconX } from './Icons'

/* ---------- Toasts ---------- */

interface Toast {
  id: number
  message: string
  kind: 'info' | 'error'
}

const ToastContext = createContext<(message: string, kind?: 'info' | 'error') => void>(() => {})

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const push = useCallback((message: string, kind: 'info' | 'error' = 'info') => {
    const id = nextId.current++
    setToasts((t) => [...t, { id, message, kind }])
    setTimeout(() => setToasts((t) => t.filter((toast) => toast.id !== id)), 3500)
  }, [])

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind === 'error' ? 'error' : ''}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

/* ---------- Modal ---------- */

export function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="btn ghost sm" onClick={onClose} aria-label="Close">
            <IconX size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}

/* ---------- Small bits ---------- */

export function BrandLogo({ size = 34 }: { size?: number }) {
  return (
    <img
      src="/icon-192.png"
      alt="Oolio Fleet"
      width={size}
      height={size}
      style={{ borderRadius: Math.round(size * 0.26), display: 'block', flexShrink: 0 }}
    />
  )
}

export function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
  return <span className="avatar">{initials || '?'}</span>
}

export function StatusBadge({ online, status }: { online: boolean; status: string }) {
  if (status === 'pending') {
    return (
      <span className="badge warn">
        <span className="dot" /> Awaiting enrollment
      </span>
    )
  }
  return online ? (
    <span className="badge positive">
      <span className="dot" /> Online
    </span>
  ) : (
    <span className="badge neutral">
      <span className="dot" /> Offline
    </span>
  )
}

export function Spinner({ dark }: { dark?: boolean }) {
  return <span className={`spinner ${dark ? 'dark' : ''}`} />
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon: ReactNode
  title: string
  hint?: string
  action?: ReactNode
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3 style={{ color: 'var(--text)' }}>{title}</h3>
      {hint && <p>{hint}</p>}
      {action}
    </div>
  )
}
