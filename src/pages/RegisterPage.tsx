import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Btn } from '../components/common/Btn'
import { Icon } from '../components/common/Icon'
import { MintLogo } from '../components/common/MintLogo'

const DEV_MESSAGE = '회원가입 기능은 현재 개발 중입니다. 계정이 필요하면 관리자에게 문의해 주세요.'

export function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [notice, setNotice] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setNotice(DEV_MESSAGE)
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
          {notice && <div className="register-notice">{notice}</div>}
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
          <Btn variant="primary" className="btn-block" type="submit">
            가입하기 <Icon name="arrowRight" />
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
