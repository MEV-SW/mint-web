import { apiClient, revokeRefreshToken } from './client'
import { useAuthStore } from '../store/authStore'
import type { OidcConfig, TokenResponse, User } from '../types/auth'
import { storeIdToken, takeIdToken } from '../utils/keycloakLogin'

export type { OidcConfig }

export interface OidcLoginPayload {
  access_token?: string
  code?: string
  redirect_uri?: string
  code_verifier?: string
  username?: string
  password?: string
}

export async function fetchOidcConfig(): Promise<OidcConfig> {
  const { data } = await apiClient.get<OidcConfig>('/api/v1/auth/oidc/config')
  return data
}

export async function oidcLogin(payload: OidcLoginPayload): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>('/api/v1/auth/oidc', payload)
  return data
}

export async function finishMintLogin(payload: OidcLoginPayload): Promise<void> {
  const tokenRes = await oidcLogin(payload)
  useAuthStore.setState({
    token: tokenRes.access_token,
    refreshToken: tokenRes.refresh_token,
  })
  const user = await fetchMe()
  useAuthStore.getState().setAuth(tokenRes.access_token, tokenRes.refresh_token, user)
  storeIdToken(tokenRes.id_token)
}

export async function fetchMe(): Promise<User> {
  const { data } = await apiClient.get<User>('/api/v1/auth/me')
  return data
}

export async function logout(): Promise<void> {
  await revokeRefreshToken()
  takeIdToken()
  useAuthStore.getState().logout()
  window.location.assign('/login')
}

export function loginErrorMessage(detail: unknown): string {
  const text = typeof detail === 'string' ? detail : ''
  if (text === 'Account is inactive') return '비활성화된 계정입니다. 총관에게 문의해 주세요.'
  if (
    text.includes('Keycloak') ||
    text.includes('아이디') ||
    text.includes('비밀번호') ||
    text.includes('Direct access') ||
    text.includes('이메일')
  ) {
    return text
  }
  return '사내 계정 로그인에 실패했습니다.'
}

export async function healthCheck(): Promise<{ status: string; database: string }> {
  const { data } = await apiClient.get('/api/v1/health')
  return data
}
