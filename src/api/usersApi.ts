import { apiClient } from './client'
import type { AccountApprovalStatus, UserRole } from '../types/auth'

export interface UserAdmin {
  id: string
  organization_id: string
  email: string
  name: string
  role: UserRole
  approval_status: AccountApprovalStatus
  is_active: boolean
  created_at: string
}

export async function listUsers(approvalStatus?: AccountApprovalStatus): Promise<UserAdmin[]> {
  const { data } = await apiClient.get<UserAdmin[]>('/api/v1/users', {
    params: approvalStatus ? { approval_status: approvalStatus } : undefined,
  })
  return data
}

export async function approveUser(userId: string): Promise<UserAdmin> {
  const { data } = await apiClient.patch<UserAdmin>(`/api/v1/users/${userId}/approve`)
  return data
}

export async function rejectUser(userId: string): Promise<UserAdmin> {
  const { data } = await apiClient.patch<UserAdmin>(`/api/v1/users/${userId}/reject`)
  return data
}
