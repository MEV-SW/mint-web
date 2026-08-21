import { useEffect, useState } from 'react'
import { isAxiosError } from 'axios'
import { Link, useNavigate } from 'react-router-dom'
import { finishMintLogin, loginErrorMessage } from '../api/authApi'
import { LoginSsoLayout } from '../components/auth/LoginSsoLayout'
import { oidcRedirectUri, takeCodeVerifier } from '../utils/keycloakLogin'

export function LoginCallbackPage() {
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const code = params.get('code')
    const accessToken = hashParams.get('access_token')
    const authError = params.get('error_description') || params.get('error')
    if (authError) {
      setError(authError)
      return
    }

    async function complete() {
      try {
        await finishMintLogin(
          accessToken
            ? { access_token: accessToken }
            : {
                code: code ?? undefined,
                redirect_uri: oidcRedirectUri(),
                code_verifier: takeCodeVerifier() || undefined,
              },
        )
        navigate('/', { replace: true })
      } catch (err) {
        const detail = isAxiosError(err) ? err.response?.data?.detail : null
        setError(loginErrorMessage(detail))
      }
    }

    if (!code && !accessToken) {
      setError('로그인 응답이 없습니다.')
      return
    }
    void complete()
  }, [navigate])

  return (
    <LoginSsoLayout host="sso" online={!error} checking={!error}>
      <div className="login-sso-kicker">
        <span className="login-sso-dot" aria-hidden />
        Keycloak SSO · 사내 전용
      </div>
      <h1>{error ? '로그인에 실패했습니다.' : '로그인 중'}</h1>
      {error ? (
        <>
          <p className="login-sso-lead">{error}</p>
          <Link to="/login" className="login-sso-cta">
            <span className="login-sso-cta-mark" aria-hidden>
              K
            </span>
            다시 시도
          </Link>
        </>
      ) : (
        <p className="login-sso-lead">사내 계정 정보를 확인하고 있습니다.</p>
      )}
    </LoginSsoLayout>
  )
}
