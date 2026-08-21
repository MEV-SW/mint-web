import type { ReactNode } from 'react'

type LoginSsoLayoutProps = {
  children: ReactNode
  host: string
  online: boolean
  checking?: boolean
}

export function LoginSsoLayout({ children, host, online, checking = false }: LoginSsoLayoutProps) {
  const status = checking ? `${host} 확인 중` : online ? `${host} 정상` : `${host} 연결 불가`

  return (
    <div className="login-sso page-fade">
      <div className="login-sso-grain" aria-hidden />
      <div className="login-sso-watermark" aria-hidden>
        MINT
      </div>

      <div className="login-sso-masthead">
        <div className="login-sso-mark" aria-hidden>
          M
        </div>
        <div>
          <div className="login-sso-wordmark">MINT DAILY</div>
          <div className="login-sso-tagline">Intelligence &amp; News Tracker</div>
        </div>
      </div>

      <div className="login-sso-sheet">
        <div className="login-sso-glass">{children}</div>
      </div>

      <div className="login-sso-chip-wrap">
        <div className={`login-sso-chip${online && !checking ? '' : ' is-warn'}`}>
          <span className={`login-sso-dot${checking ? ' is-pulse' : ''}`} aria-hidden />
          {status}
          <span className="login-sso-chip-rule" aria-hidden />
          브라우저 종료 시 세션 만료
        </div>
      </div>
    </div>
  )
}
