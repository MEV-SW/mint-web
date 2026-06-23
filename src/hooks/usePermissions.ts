import { useAuthStore } from '../store/authStore'
import type { UserRole } from '../types/auth'

const ROLE_LABELS: Record<UserRole, string> = {
  admin: '편집장',
  manager: '매니저',
  member: '멤버',
  viewer: '일반',
}

export function usePermissions() {
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'
  const canWrite = isAdmin
  const canManageUsers = isAdmin
  const canSubmitInquiry = !!user && !isAdmin
  const roleLabel = user ? ROLE_LABELS[user.role] : ''

  return {
    user,
    isAdmin,
    canWrite,
    canManageUsers,
    canSubmitInquiry,
    roleLabel,
  }
}
