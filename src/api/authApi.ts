import { apiClient } from './client'
import type { TokenResponse, User } from '../types/auth'

export interface RegisterPayload {
  email: string
  password: string
  name: string
}

export async function register(payload: RegisterPayload): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>('/api/v1/auth/register', payload)
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

export async function healthCheck(): Promise<{ status: string; database: string }> {
  const { data } = await apiClient.get('/api/v1/health')
  return data
}
