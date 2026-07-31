export type UserRole = 'admin' | 'manager' | 'member' | 'viewer'

export type AccountApprovalStatus = 'pending' | 'approved' | 'rejected'

export interface User {
  id: string
  organization_id: string
  email: string
  name: string
  role: UserRole
  approval_status: AccountApprovalStatus
  is_active: boolean
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

export interface RegisterResponse {
  message: string
  status: string
}
