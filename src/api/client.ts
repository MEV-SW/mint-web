import axios from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '../store/authStore'
import type { TokenResponse } from '../types/auth'

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8100'

export const apiClient = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

/** Bare client without auth interceptors — used for token refresh to avoid loops. */
const refreshClient = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean }

let refreshPromise: Promise<string | null> | null = null

function isAuthBootstrapPath(url: string | undefined): boolean {
  if (!url) return false
  return (
    url.includes('/api/v1/auth/login') ||
    url.includes('/api/v1/auth/oidc') ||
    url.includes('/api/v1/auth/refresh') ||
    url.includes('/api/v1/auth/register')
  )
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = useAuthStore.getState().refreshToken
  if (!refreshToken) return null

  try {
    const { data } = await refreshClient.post<TokenResponse>('/api/v1/auth/refresh', {
      refresh_token: refreshToken,
    })
    useAuthStore.getState().setTokens(data.access_token, data.refresh_token)
    return data.access_token
  } catch {
    return null
  }
}

function forceLogout() {
  useAuthStore.getState().logout()
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login'
  }
}

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config as RetriableConfig | undefined
    const status = err.response?.status

    if (status !== 401 || !original) {
      return Promise.reject(err)
    }

    // Login/register failures or failed refresh — do not attempt another refresh.
    if (isAuthBootstrapPath(original.url)) {
      if (original.url?.includes('/api/v1/auth/refresh')) {
        forceLogout()
      }
      return Promise.reject(err)
    }

    if (original._retry) {
      forceLogout()
      return Promise.reject(err)
    }

    original._retry = true

    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null
      })
    }

    const newToken = await refreshPromise
    if (!newToken) {
      forceLogout()
      return Promise.reject(err)
    }

    original.headers = original.headers ?? {}
    original.headers.Authorization = `Bearer ${newToken}`
    return apiClient(original)
  },
)

export async function fetchPublicOidcConfig(): Promise<{
  end_session_endpoint?: string | null
  client_id?: string | null
} | null> {
  try {
    const { data } = await refreshClient.get('/api/v1/auth/oidc/config')
    return data
  } catch {
    return null
  }
}

export async function revokeRefreshToken(): Promise<{
  end_session_endpoint?: string | null
  client_id?: string | null
} | null> {
  const refreshToken = useAuthStore.getState().refreshToken
  if (!refreshToken) return null
  try {
    const { data } = await refreshClient.post('/api/v1/auth/logout', { refresh_token: refreshToken })
    return data
  } catch {
    return null
  }
}
