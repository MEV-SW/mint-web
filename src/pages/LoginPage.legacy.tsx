import { useState } from 'react'
import { isAxiosError } from 'axios'
import { Link, useNavigate } from 'react-router-dom'
import { fetchMe, login, loginErrorMessage } from '../api/authApi'
import { Btn } from '../components/common/Btn'
import { Icon } from '../components/common/Icon'
import { useAuthStore } from '../store/authStore'

const COVER_FEATURES = [
  { no: '01', label: '신뢰 소스 크롤링' },
  { no: '02', label: 'AI 요약·중요도' },
  { no: '03', label: '데일리 리포트' },
  { no: '04', label: 'Slack 알림' },
]

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
      const prev = useAuthStore.getState()
      useAuthStore.setState({
        token: tokenRes.access_token,
        refreshToken: tokenRes.refresh_token,
      })
      try {
        const user = await fetchMe()
        setAuth(tokenRes.access_token, tokenRes.refresh_token, user)
        navigate('/')
      } catch {
        useAuthStore.setState({
          token: prev.token,
          refreshToken: prev.refreshToken,
        })
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
          <div className="login-brand-mark" aria-hidden>
            M
          </div>
          <div>
            <div className="login-brand-name">MINT</div>
            <div className="login-tagline">Intelligence &amp; News Tracker</div>
          </div>
        </div>
        <div className="login-edition-row">
          <span>Daily Edition</span>
          <span />
          <span>Vol. {new Date().getFullYear()}</span>
        </div>
        <div className="login-hero">
          <div className="login-hero-kicker">In This Edition</div>
          <h1>
            EV·충전 산업의
            <br />
            흐름을, 매일 아침
            <br />
            한 면으로.
          </h1>
          <p>
            신뢰할 수 있는 소스를 자동으로 수집하고, AI가 요약·중요도를 판단해 데일리 리포트로
            엮어 Slack까지 전달합니다.
          </p>
          <div className="login-flow">
            {COVER_FEATURES.map((f) => (
              <span key={f.no}>
                <strong>{f.no}</strong>
                {f.label}
              </span>
            ))}
          </div>
        </div>
        <div className="login-aside-foot">MotrexEV · 사내 전용 서비스</div>
      </div>

      <div className="login-form-side">
        <form className="login-card" onSubmit={submit}>
          <div className="login-card-kicker">Members</div>
          <h2>로그인</h2>
          <p className="sub">사내 계정으로 로그인하세요.</p>
          {error && (
            <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</div>
          )}
          <div className="field">
            <label>이메일</label>
            <input
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@motrexev.com"
              autoComplete="username"
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
              autoComplete="current-password"
            />
          </div>
          <Btn variant="primary" className="btn-block" type="submit" disabled={loading}>
            {loading ? (
              <>
                <Icon name="refresh" className="spin" /> 로그인 중…
              </>
            ) : (
              <>
                로그인 <span aria-hidden>→</span>
              </>
            )}
          </Btn>
          <div className="login-switch">
            계정이 없으신가요? <Link to="/register">회원가입</Link>
          </div>
        </form>
      </div>
    </div>
  )
}

