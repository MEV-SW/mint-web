import { Navigate, Outlet } from 'react-router-dom'
import { usePermissions } from '../hooks/usePermissions'
import { useAuthStore } from '../store/authStore'

export function AdminRoute() {
  const token = useAuthStore((s) => s.token)
  const { isAdmin, canEditAny } = usePermissions()

  if (!token) return <Navigate to="/login" replace />
  if (!isAdmin && !canEditAny) return <Navigate to="/" replace />
  return <Outlet />
}

export function SuperAdminRoute() {
  const { isAdmin } = usePermissions()
  if (!isAdmin) return <Navigate to="/admin/review-queue" replace />
  return <Outlet />
}
