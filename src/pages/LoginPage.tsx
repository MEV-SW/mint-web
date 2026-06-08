import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchMe, login } from '../api/authApi'
import { Icon } from '../components/common/Icon'
import { MintLogo } from '../components/common/MintLogo'
import { useAuthStore } from '../store/authStore'

export function LoginPage() {
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
    } catch {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-shell page-fade">
      <div className="login-bg-orbit" aria-hidden />
      <div className="login-shell-inner">
        <header className="login-shell-head">
          <div className="login-shell-brand">
            <MintLogo size={34} />
            <div className="login-shell-brand-meta">
              <span className="nm">MINT</span>
              <span className="tag">EV · Charging Intelligence</span>
            </div>
          </div>
          <div className="login-shell-badge">
            <span className="pill">Internal</span>
            <span className="dot" />
            <span>for MotrexEV</span>
          </div>
        </header>

        <main className="login-main">
          <section className="login-main-copy">
            <h1>
              EV 충전 인텔리전스를
              <br />
              한눈에 모아보는 대시보드.
            </h1>
            <p>
              신뢰 소스를 자동으로 수집하고, AI가 요약·중요도를 판단해
              <br />
              데일리 리포트와 Slack 알림까지 한 번에 제공합니다.
            </p>
            <div className="login-main-flow">
              <div className="itm">
                <span className="k">1</span>
                <span>Trusted Source 크롤링</span>
              </div>
              <div className="itm">
                <span className="k">2</span>
                <span>AI 요약·중요도 판단</span>
              </div>
              <div className="itm">
                <span className="k">3</span>
                <span>데일리 리포트 &amp; Slack</span>
              </div>
            </div>
          </section>

          <section className="login-main-card">
            <form className="login-card-modern" onSubmit={submit}>
              <div className="login-card-head">
                <div>
                  <h2>관리자 로그인</h2>
                  <p>사내 계정으로 MINT 콘솔에 접속하세요.</p>
                </div>
                <span className="login-env-pill">Production</span>
              </div>

              {error && <div className="login-error">{error}</div>}

              <div className="field">
                <label>이메일</label>
                <input
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@motrexev.com"
                  autoComplete="email"
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

              <button className="login-cta" type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Icon name="refresh" className="spin" />
                    <span>로그인 중…</span>
                  </>
                ) : (
                  <>
                    <span>대시보드 입장하기</span>
                    <Icon name="arrowRight" />
                  </>
                )}
              </button>

              <div className="login-foot-row">
                <span className="hint">
                  계정이 없으신가요?{' '}
                  <Link to="/register" className="link">
                    회원가입 요청
                  </Link>
                </span>
              </div>
            </form>
          </section>
        </main>

        <footer className="login-shell-foot">
          <span>© {new Date().getFullYear()} MotrexEV · MINT</span>
          <span>EV Charging · Energy Intelligence</span>
        </footer>
      </div>
    </div>
  )
}
