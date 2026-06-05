import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchMe, register } from '../api/authApi'
import { Btn } from '../components/common/Btn'
import { Icon } from '../components/common/Icon'
import { MintLogo } from '../components/common/MintLogo'
import { useAuthStore } from '../store/authStore'

export function RegisterPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== passwordConfirm) {
      setError('비밀번호 확인이 일치하지 않습니다.')
      return
    }
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.')
      return
    }
    setLoading(true)
    try {
      const tokenRes = await register({ email, password, name })
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
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(typeof msg === 'string' ? msg : '회원가입에 실패했습니다.')
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
            팀과 함께
            <br />
            업계 동향을 추적하세요.
          </h1>
          <p>계정을 만들면 대시보드, 게시판, 소스 관리, 데일리 리포트를 바로 이용할 수 있습니다.</p>
        </div>
      </div>

      <div className="login-form-side">
        <form className="login-card" onSubmit={submit}>
          <h2>회원가입</h2>
          <p className="sub">사내 이메일로 계정을 만드세요.</p>
          {error && (
            <div style={{ color: 'var(--high)', fontSize: 13, marginBottom: 12 }}>{error}</div>
          )}
          <div className="field">
            <label>이름</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="홍길동"
              required
            />
          </div>
          <div className="field">
            <label>이메일</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@motrexev.com"
              required
            />
          </div>
          <div className="field">
            <label>비밀번호</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6자 이상"
              required
            />
          </div>
          <div className="field">
            <label>비밀번호 확인</label>
            <input
              className="input"
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="비밀번호 재입력"
              required
            />
          </div>
          <Btn variant="primary" className="btn-block" type="submit" disabled={loading}>
            {loading ? (
              <>
                <Icon name="refresh" className="spin" /> 가입 중…
              </>
            ) : (
              <>
                가입하기 <Icon name="arrowRight" />
              </>
            )}
          </Btn>
          <p style={{ marginTop: 20, fontSize: 14, color: 'var(--text-muted)', textAlign: 'center' }}>
            이미 계정이 있으신가요?{' '}
            <Link to="/login" style={{ color: 'var(--mint-deep)', fontWeight: 600 }}>
              로그인
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
