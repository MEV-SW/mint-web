import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchOidcConfig } from '../api/authApi'
import { LoginSsoLayout } from '../components/auth/LoginSsoLayout'
import { oidcHost, oidcRealmName, startKeycloakLogin } from '../utils/keycloakLogin'

function todayLong() {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date())
}

export function LoginPage() {
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')
  const configQuery = useQuery({
    queryKey: ['oidc-config'],
    queryFn: fetchOidcConfig,
    retry: false,
  })
  const configured = configQuery.data?.configured === true
  const realm = oidcRealmName(configQuery.data?.issuer) ?? '—'
  const clientId = configQuery.data?.client_id ?? '—'
  const host = oidcHost(configQuery.data?.issuer) ?? 'sso'

  async function startLogin() {
    if (!configQuery.data?.configured) {
      setError('Keycloak SSO가 설정되지 않았습니다. 관리자에게 KEYCLOAK_ISSUER를 확인해 주세요.')
      return
    }
    setStarting(true)
    setError('')
    try {
      await startKeycloakLogin(configQuery.data)
    } catch {
      setStarting(false)
      setError('로그인 페이지로 이동하지 못했습니다.')
    }
  }

  const busy = starting || configQuery.isLoading
  const configError =
    error ||
    (configQuery.isError
      ? '백엔드에 연결하지 못했습니다. API가 실행 중인지 확인하세요.'
      : configQuery.isSuccess && !configured
        ? 'Keycloak SSO가 설정되지 않았습니다. KEYCLOAK_ISSUER와 KEYCLOAK_CLIENT_ID를 확인해 주세요.'
        : '')

  return (
    <LoginSsoLayout host={host} online={configured} checking={configQuery.isLoading}>
      <div className="login-sso-kicker">
        <span className="login-sso-dot" aria-hidden />
        Keycloak SSO · 사내 전용
      </div>

      <h1>Login</h1>
      <p className="login-sso-lead">
        별도 아이디·비밀번호는 없습니다.
        <br />
        사내 통합 인증으로 본인 확인만 하면 바로 들어옵니다.
      </p>

      {configError ? <div className="login-sso-error">{configError}</div> : null}

      <button
        type="button"
        className="login-sso-cta"
        disabled={busy || !configured}
        onClick={() => void startLogin()}
      >
        <span className="login-sso-cta-mark" aria-hidden>
          K
        </span>
        {busy ? '연결 중…' : 'MotrexEV 계정으로 계속하기'}
      </button>

      <div className="login-sso-session">
        <span />
        Session
        <span />
      </div>

      <dl className="login-sso-meta">
        <div>
          <dt>Realm</dt>
          <dd>{realm}</dd>
        </div>
        <div>
          <dt>Client</dt>
          <dd>{clientId}</dd>
        </div>
        <div>
          <dt>Protocol</dt>
          <dd>OIDC · PKCE</dd>
        </div>
        <div>
          <dt>유효 시간</dt>
          <dd>8시간</dd>
        </div>
      </dl>

      <div className="login-sso-foot">
        <span title="Keycloak에서 계정을 발급받은 뒤 접속하세요">계정 발급 신청</span>
        <span title="사내 IT에 문의하세요">IT 헬프데스크</span>
        <span className="login-sso-foot-date">{todayLong()}</span>
      </div>
    </LoginSsoLayout>
  )
}
