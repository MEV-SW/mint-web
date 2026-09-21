import { Navigate, Outlet } from 'react-router-dom'
import { SETTINGS_PATH } from '../components/layout/navItems'
import { usePermissions } from '../hooks/usePermissions'
import { useAuthStore } from '../store/authStore'

export function AdminRoute() {
  const token = useAuthStore((s) => s.token)
  const { isAdmin, canEditAny } = usePermissions()

  if (!token) return <Navigate to="/login" replace />
  if (!isAdmin && !canEditAny) return <Navigate to="/admin/settings" replace />
  return <Outlet />
}

export function SuperAdminRoute() {
  const { isAdmin } = usePermissions()
  if (!isAdmin) return <Navigate to={SETTINGS_PATH} replace />
  return <Outlet />
}

export function SourceReviewRoute() {
  const { canReviewSources } = usePermissions()
  if (!canReviewSources) return <Navigate to={SETTINGS_PATH} replace />
  return <Outlet />
}
