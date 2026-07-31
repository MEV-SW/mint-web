import { apiClient, revokeRefreshToken } from './client'
import { useAuthStore } from '../store/authStore'
import type { RegisterResponse, TokenResponse, User } from '../types/auth'

export interface RegisterPayload {
  email: string
  password: string
  name: string
}

export async function register(payload: RegisterPayload): Promise<RegisterResponse> {
  const { data } = await apiClient.post<RegisterResponse>('/api/v1/auth/register', payload)
  return data
}

export async function login(email: string, password: string): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>('/api/v1/auth/login', { email, password })
  return data
}

export async function fetchMe(): Promise<User> {
  const { data } = await apiClient.get<User>('/api/v1/auth/me')
  return data
}

export async function logout(): Promise<void> {
  await revokeRefreshToken()
  useAuthStore.getState().logout()
}

export function loginErrorMessage(detail: unknown): string {
  const text = typeof detail === 'string' ? detail : ''
  if (text === 'Account pending approval') return '가입 승인 대기 중입니다. 편집장 승인 후 로그인할 수 있습니다.'
  if (text === 'Account registration rejected') return '가입이 거절된 계정입니다. 관리자에게 문의해 주세요.'
  if (text === 'Account is inactive') return '비활성화된 계정입니다.'
  return '이메일 또는 비밀번호가 올바르지 않습니다.'
}

export async function healthCheck(): Promise<{ status: string; database: string }> {
  const { data } = await apiClient.get('/api/v1/health')
  return data
}
