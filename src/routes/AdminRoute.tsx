import { Navigate, Outlet } from 'react-router-dom'
import { usePermissions } from '../hooks/usePermissions'
import { useAuthStore } from '../store/authStore'

export function AdminRoute() {
  const token = useAuthStore((s) => s.token)
  const { isAdmin } = usePermissions()

  if (!token) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/" replace />
  return <Outlet />
}
