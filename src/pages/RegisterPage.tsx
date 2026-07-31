import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../api/authApi'
import { Btn } from '../components/common/Btn'
import { isAxiosError } from 'axios'

export function RegisterPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setNotice('')
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.')
      return
    }
    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }
    setLoading(true)
    try {
      const res = await register({ email, password, name })
      setNotice(res.message)
    } catch (err) {
      const detail = isAxiosError(err) ? err.response?.data?.detail : null
      setError(typeof detail === 'string' ? detail : '가입 신청에 실패했습니다.')
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
        <div className="login-hero">
          <div className="login-hero-kicker">Join The Desk</div>
          <h1>
            팀과 함께
            <br />
            업계 동향을 추적하세요.
          </h1>
          <p>가입 신청 후 편집장 승인을 받으면 1면, 뉴스 탐색, 데일리 리포트를 이용할 수 있습니다.</p>
        </div>
        <div className="login-aside-foot">MotrexEV · 사내 전용 서비스</div>
      </div>

      <div className="login-form-side">
        <form className="login-card" onSubmit={submit}>
          <div className="login-card-kicker">Members</div>
          <h2>회원가입</h2>
          <p className="sub">사내 이메일로 가입을 신청하세요.</p>
          {notice && <div className="register-notice">{notice}</div>}
          {error && (
            <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</div>
          )}
          <div className="field">
            <label>이름</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="홍길동"
              required
              disabled={!!notice}
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
              disabled={!!notice}
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
              disabled={!!notice}
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
              disabled={!!notice}
            />
          </div>
          {notice ? (
            <Btn variant="primary" className="btn-block" type="button" onClick={() => navigate('/login')}>
              로그인으로 이동 →
            </Btn>
          ) : (
            <Btn variant="primary" className="btn-block" type="submit" disabled={loading}>
              {loading ? '신청 중…' : '가입 신청 →'}
            </Btn>
          )}
          <div className="login-switch">
            이미 계정이 있으신가요? <Link to="/login">로그인</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
