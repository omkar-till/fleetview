import { Navigate, Route, Routes } from 'react-router-dom'
import { DeviceApp } from './device/DeviceApp'
import { AcceptInvite } from './portal/AcceptInvite'
import { AuthProvider } from './portal/AuthContext'
import { Dashboard } from './portal/Dashboard'
import { DeviceDetail } from './portal/DeviceDetail'
import { Devices } from './portal/Devices'
import { Login } from './portal/Login'
import { MapPage } from './portal/MapPage'
import { PortalLayout } from './portal/PortalLayout'
import { Signup } from './portal/Signup'
import { Users } from './portal/Users'

export default function App() {
  return (
    <Routes>
      {/* Device PWA — runs on the managed device itself */}
      <Route path="/device/*" element={<DeviceApp />} />

      {/* Company portal */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/invite" element={<AcceptInvite />} />
      <Route
        element={
          <AuthProvider>
            <PortalLayout />
          </AuthProvider>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/devices" element={<Devices />} />
        <Route path="/devices/:id" element={<DeviceDetail />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/users" element={<Users />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
