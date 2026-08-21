import { useAuthStore } from '../store/authStore'
import type { UserRole } from '../types/auth'

const ROLE_LABELS: Record<UserRole, string> = {
  admin: '총관',
  manager: '매니저',
  member: '멤버',
  viewer: '일반',
}

export function usePermissions() {
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'
  const editorEditionIds = new Set(
    (user?.editions ?? []).filter((item) => item.is_editor).map((item) => item.id),
  )
  const canEditAny = isAdmin || editorEditionIds.size > 0
  const canEditEdition = (editionId: string) => isAdmin || editorEditionIds.has(editionId)
  const canWrite = canEditAny
  const canManageUsers = isAdmin
  const canSubmitInquiry = !!user && !isAdmin
  const roleLabel = user
    ? isAdmin
      ? ROLE_LABELS.admin
      : editorEditionIds.size
        ? '분야 편집장'
        : ROLE_LABELS[user.role]
    : ''

  return {
    user,
    isAdmin,
    canEditAny,
    canEditEdition,
    canWrite,
    canManageUsers,
    canSubmitInquiry,
    roleLabel,
  }
}
