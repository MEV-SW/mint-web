import { useState } from 'react'
import { isAxiosError } from 'axios'
import { Link, useNavigate } from 'react-router-dom'
import { fetchMe, login, loginErrorMessage } from '../api/authApi'
import { Btn } from '../components/common/Btn'
import { Icon } from '../components/common/Icon'
import { MintLogo } from '../components/common/MintLogo'
import { useAuthStore } from '../store/authStore'

export function LegacyLoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const tokenRes = await login(email, password)
      const prevToken = useAuthStore.getState().token
      useAuthStore.setState({ token: tokenRes.access_token })
      try {
        const user = await fetchMe()
        setAuth(tokenRes.access_token, user)
        navigate('/')
      } catch {
        useAuthStore.setState({ token: prevToken })
        throw new Error('me failed')
      }
    } catch (err) {
      const detail = isAxiosError(err) ? err.response?.data?.detail : null
      setError(loginErrorMessage(detail))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-wrap page-fade">
      <div className="login-aside">
        <div className="login-brand-row">
          <MintLogo size={38} />
          <div>
            <div style={{ fontWeight: 760, fontSize: 21, letterSpacing: '-0.01em' }}>MINT</div>
            <div className="login-tagline">Intelligence &amp; News Tracker</div>
          </div>
        </div>
        <div className="login-hero">
          <h1>
            EV 충전·에너지 업계의
            <br />
            흐름을 한곳에서.
          </h1>
          <p>
            신뢰 소스를 자동으로 수집하고, AI가 요약·중요도를 판단해 데일리 리포트를 만들어 Slack으로
            전달합니다.
          </p>
          <div className="login-flow">
            <span>신뢰 소스 크롤링</span>
            <span>AI 요약·중요도</span>
            <span>데일리 리포트</span>
            <span>Slack 알림</span>
          </div>
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 12, opacity: 0.75 }}>
          MotrexEV · 사내 전용 서비스
        </div>
      </div>

      <div className="login-form-side">
        <form className="login-card" onSubmit={submit}>
          <h2>로그인</h2>
          <p className="sub">사내 계정으로 로그인하세요.</p>
          {error && (
            <div style={{ color: 'var(--high)', fontSize: 13, marginBottom: 12 }}>{error}</div>
          )}
          <div className="field">
            <label>이메일</label>
            <input
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@motrexev.com"
            />
          </div>
          <div className="field">
            <label>비밀번호</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
            />
          </div>
          <Btn variant="primary" className="btn-block" type="submit" disabled={loading}>
            {loading ? (
              <>
                <Icon name="refresh" className="spin" /> 로그인 중…
              </>
            ) : (
              <>
                로그인 <Icon name="arrowRight" />
              </>
            )}
          </Btn>
          <p style={{ marginTop: 20, fontSize: 14, color: 'var(--text-muted)', textAlign: 'center' }}>
            계정이 없으신가요?{' '}
            <Link to="/register" style={{ color: 'var(--mint-deep)', fontWeight: 600 }}>
              회원가입
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}

