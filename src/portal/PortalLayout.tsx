import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { IconDevice, IconGrid, IconLogo, IconLogout, IconMap, IconUsers } from '../components/Icons'
import { api } from '../lib/api'
import { useSession } from './AuthContext'

const NAV = [
  { to: '/', label: 'Dashboard', icon: IconGrid, end: true },
  { to: '/devices', label: 'Devices', icon: IconDevice },
  { to: '/map', label: 'Map', icon: IconMap },
  { to: '/users', label: 'People', icon: IconUsers },
]

export function PortalLayout() {
  const { user, company } = useSession()
  const navigate = useNavigate()

  async function logout() {
    await api.post('/api/auth/logout')
    navigate('/login')
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="logo-mark">
            <IconLogo size={18} />
          </span>
          <span>FleetView</span>
        </div>
        <div className="sidebar-company">
          <div className="company-name">{company.name}</div>
          <div className="company-user">{user.email}</div>
        </div>
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Icon size={19} />
            <span>{label}</span>
          </NavLink>
        ))}
        <div className="sidebar-spacer" />
        <button className="nav-link" onClick={logout}>
          <IconLogout size={19} />
          <span>Sign out</span>
        </button>
      </aside>
      <div className="content">
        <Outlet />
      </div>
    </div>
  )
}
