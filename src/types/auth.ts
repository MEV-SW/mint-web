export type UserRole = 'admin' | 'manager' | 'member' | 'viewer'

export interface User {
  id: string
  organization_id: string
  email: string
  name: string
  role: UserRole
  is_active: boolean
}

export interface TokenResponse {
  access_token: string
  token_type: string
}
