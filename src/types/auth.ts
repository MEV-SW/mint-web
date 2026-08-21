export type UserRole = 'admin' | 'manager' | 'member' | 'viewer'

export type AccountApprovalStatus = 'pending' | 'approved' | 'rejected'

export interface UserEditionMembership {
  id: string
  name: string
  slug: string
  is_editor: boolean
}

export interface User {
  id: string
  organization_id: string
  email: string
  name: string
  role: UserRole
  approval_status: AccountApprovalStatus
  is_active: boolean
  editions?: UserEditionMembership[]
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  id_token?: string | null
}

export interface OidcConfig {
  configured: boolean
  issuer: string | null
  client_id: string | null
  authorization_endpoint: string | null
  end_session_endpoint: string | null
}

export interface RegisterResponse {
  message: string
  status: string
}
