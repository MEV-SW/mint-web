import { apiClient } from './client'
import type { UserRole } from '../types/auth'
import type { UserEditionMembership } from '../types/auth'

export interface UserEditionAssignment {
  edition_id: string
  is_editor: boolean
}

export interface UserAdmin {
  id: string
  organization_id: string
  email: string
  name: string
  role: UserRole
  approval_status: 'pending' | 'approved' | 'rejected'
  is_active: boolean
  created_at: string
  editions: UserEditionMembership[]
}

export async function listUsers(): Promise<UserAdmin[]> {
  const { data } = await apiClient.get<UserAdmin[]>('/api/v1/users')
  return data
}

export async function updateUserEditions(
  userId: string,
  editions: UserEditionAssignment[],
): Promise<UserAdmin> {
  const { data } = await apiClient.put<UserAdmin>(`/api/v1/users/${userId}/editions`, { editions })
  return data
}

export async function setUserActive(userId: string, isActive: boolean): Promise<UserAdmin> {
  const { data } = await apiClient.patch<UserAdmin>(`/api/v1/users/${userId}/active`, {
    is_active: isActive,
  })
  return data
}
