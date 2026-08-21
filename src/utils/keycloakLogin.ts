import type { OidcConfig } from '../types/auth'

const VERIFIER_KEY = 'mint.oidc.verifier'
const STATE_KEY = 'mint.oidc.state'
const ID_TOKEN_KEY = 'mint.oidc.id_token'
export const OIDC_POPUP_NAME = 'mint-keycloak'
export const OIDC_CALLBACK_MSG = 'mint.oidc.callback'
export const OIDC_RESULT_KEY = 'mint.oidc.result'

export type OidcCallbackMessage = {
  type: typeof OIDC_CALLBACK_MSG
  state?: string | null
  code?: string | null
  access_token?: string | null
  error?: string | null
}

function randomUrlSafe(bytes: number): string {
  const arr = crypto.getRandomValues(new Uint8Array(bytes))
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

async function sha256Base64Url(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

export function oidcRedirectUri(): string {
  return `${window.location.origin}/login/callback`
}

export function oidcRealmName(issuer: string | null | undefined): string | null {
  if (!issuer) return null
  try {
    const parts = new URL(issuer).pathname.split('/').filter(Boolean)
    const idx = parts.indexOf('realms')
    if (idx >= 0 && parts[idx + 1]) return parts[idx + 1]
  } catch {
    return null
  }
  return null
}

export function oidcHost(issuer: string | null | undefined): string | null {
  if (!issuer) return null
  try {
    return new URL(issuer).host
  } catch {
    return null
  }
}

async function buildAuthorizationUrl(config: OidcConfig): Promise<string> {
  if (!config.authorization_endpoint || !config.client_id) {
    throw new Error('OIDC not configured')
  }
  const verifier = randomUrlSafe(32)
  const state = randomUrlSafe(16)
  sessionStorage.setItem(VERIFIER_KEY, verifier)
  sessionStorage.setItem(STATE_KEY, state)
  const challenge = await sha256Base64Url(verifier)
  const params = new URLSearchParams({
    client_id: config.client_id,
    redirect_uri: oidcRedirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
  })
  return `${config.authorization_endpoint}?${params.toString()}`
}

export function peekOidcState(): string | null {
  return sessionStorage.getItem(STATE_KEY)
}

export async function startKeycloakLogin(config: OidcConfig): Promise<void> {
  window.location.href = await buildAuthorizationUrl(config)
}

export async function startKeycloakPopup(config: OidcConfig): Promise<Window | null> {
  const width = 480
  const height = 720
  const left = Math.round(window.screenX + Math.max(0, (window.outerWidth - width) / 2))
  const top = Math.round(window.screenY + Math.max(0, (window.outerHeight - height) / 2))
  const popup = window.open(
    'about:blank',
    OIDC_POPUP_NAME,
    `popup=yes,width=${width},height=${height},left=${left},top=${top}`,
  )
  if (!popup) return null
  try {
    popup.document.write('로그인 연결 중…')
    popup.document.close()
  } catch {
    /* ignore cross-document write */
  }
  try {
    popup.location.href = await buildAuthorizationUrl(config)
    return popup
  } catch (err) {
    popup.close()
    throw err
  }
}

export function isOidcPopup(): boolean {
  return window.name === OIDC_POPUP_NAME
}

export function publishOidcCallback(payload: Omit<OidcCallbackMessage, 'type'>): boolean {
  const message: OidcCallbackMessage = { type: OIDC_CALLBACK_MSG, ...payload }
  try {
    localStorage.setItem(OIDC_RESULT_KEY, JSON.stringify(message))
  } catch {
    /* ignore quota / private mode */
  }
  if (window.opener && !window.opener.closed) {
    window.opener.postMessage(message, window.location.origin)
    return true
  }
  return false
}

export function readStoredOidcCallback(): OidcCallbackMessage | null {
  try {
    const raw = localStorage.getItem(OIDC_RESULT_KEY)
    if (!raw) return null
    localStorage.removeItem(OIDC_RESULT_KEY)
    const parsed = JSON.parse(raw) as OidcCallbackMessage
    if (parsed?.type !== OIDC_CALLBACK_MSG) return null
    return parsed
  } catch {
    return null
  }
}

export function isOidcCallbackMessage(data: unknown): data is OidcCallbackMessage {
  return Boolean(data && typeof data === 'object' && (data as OidcCallbackMessage).type === OIDC_CALLBACK_MSG)
}

export function takeCodeVerifier(): string | null {
  const value = sessionStorage.getItem(VERIFIER_KEY)
  sessionStorage.removeItem(VERIFIER_KEY)
  return value
}

export function storeIdToken(idToken: string | null | undefined): void {
  if (idToken) sessionStorage.setItem(ID_TOKEN_KEY, idToken)
  else sessionStorage.removeItem(ID_TOKEN_KEY)
}

export function takeIdToken(): string | null {
  const value = sessionStorage.getItem(ID_TOKEN_KEY)
  sessionStorage.removeItem(ID_TOKEN_KEY)
  return value
}

export function keycloakLogoutUrl(config: OidcConfig, idToken?: string | null): string | null {
  if (!config.end_session_endpoint || !config.client_id) return null
  const params = new URLSearchParams({
    client_id: config.client_id,
    post_logout_redirect_uri: `${window.location.origin}/login`,
  })
  if (idToken) params.set('id_token_hint', idToken)
  return `${config.end_session_endpoint}?${params.toString()}`
}
