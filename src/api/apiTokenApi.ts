import { apiClient } from './client'

/** mint-server#225: personal API tokens for the MINT MCP endpoint. */
export interface ApiToken {
  id: string
  name: string
  token_prefix: string
  scopes: string[]
  created_at: string
  expires_at: string
  last_used_at: string | null
  revoked_at: string | null
  active: boolean
}

export interface IssuedApiToken extends ApiToken {
  /** The raw token. Only in the issue response; it cannot be read again. */
  token: string
}

export interface OrgApiToken extends ApiToken {
  user_id: string
  user_name: string
}

export const TOKEN_EXPIRY_DAYS = [30, 90, 180, 365] as const

export async function listMyApiTokens(): Promise<ApiToken[]> {
  const { data } = await apiClient.get<ApiToken[]>('/api/v1/me/api-tokens')
  return data
}

export async function issueApiToken(name: string, expiresInDays: number): Promise<IssuedApiToken> {
  const { data } = await apiClient.post<IssuedApiToken>('/api/v1/me/api-tokens', {
    name,
    expires_in_days: expiresInDays,
  })
  return data
}

export async function revokeMyApiToken(id: string): Promise<ApiToken> {
  const { data } = await apiClient.delete<ApiToken>(`/api/v1/me/api-tokens/${id}`)
  return data
}

export async function listOrgApiTokens(): Promise<OrgApiToken[]> {
  const { data } = await apiClient.get<OrgApiToken[]>('/api/v1/admin/api-tokens')
  return data
}

export async function revokeOrgApiToken(id: string): Promise<ApiToken> {
  const { data } = await apiClient.delete<ApiToken>(`/api/v1/admin/api-tokens/${id}`)
  return data
}

/** The MCP endpoint lives on the API server, next to /api/v1. */
export function mcpEndpointUrl(): string {
  const base = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8100').replace(/\/$/, '')
  return `${base}/mcp`
}
