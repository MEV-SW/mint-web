import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { useQuery } from '@tanstack/react-query'
import { fetchOidcConfig, finishMintLogin, loginErrorMessage } from '../api/authApi'
import { LoginSsoLayout } from '../components/auth/LoginSsoLayout'
import { oidcHost, oidcRealmName } from '../utils/keycloakLogin'

function todayLong() {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date())
}

export function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
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

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!configured) {
      setError('Keycloak SSO가 설정되지 않았습니다. 관리자에게 KEYCLOAK_ISSUER를 확인해 주세요.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await finishMintLogin({ username, password })
      navigate('/', { replace: true })
    } catch (err) {
      const detail = isAxiosError(err) ? err.response?.data?.detail : null
      setError(loginErrorMessage(detail))
      setSubmitting(false)
    }
  }

  const configError =
    error ||
    (configQuery.isError
      ? '백엔드에 연결하지 못했습니다. API가 실행 중인지 확인하세요.'
      : configQuery.isSuccess && !configured
        ? 'Keycloak SSO가 설정되지 않았습니다. KEYCLOAK_ISSUER와 KEYCLOAK_CLIENT_ID를 확인해 주세요.'
        : '')

  return (
    <LoginSsoLayout host={host} online={configured} checking={configQuery.isLoading || submitting}>
      <div className="login-sso-kicker">
        <span className="login-sso-dot" aria-hidden />
        Keycloak SSO · 사내 전용
      </div>

      <h1>Login</h1>
      <p className="login-sso-lead">사내 계정으로 로그인하세요.</p>

      {configError ? <div className="login-sso-error">{configError}</div> : null}

      <form className="login-sso-form" onSubmit={(event) => void onSubmit(event)}>
        <label className="login-sso-field">
          아이디
          <input
            name="username"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            disabled={submitting || !configured}
            required
          />
        </label>
        <label className="login-sso-field">
          비밀번호
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={submitting || !configured}
            required
          />
        </label>
        <button
          type="submit"
          className="login-sso-cta"
          disabled={submitting || configQuery.isLoading || !configured}
        >
          <span className="login-sso-cta-mark" aria-hidden>
            K
          </span>
          {submitting ? '로그인 중…' : '로그인'}
        </button>
      </form>

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
          <dd>OIDC</dd>
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
