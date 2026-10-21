import { Link } from 'react-router-dom'
import { apiErrorDetail } from '../../utils/apiError'
import { Btn } from './Btn'

function timeLabel(at?: number): string | null {
  if (!at) return null
  return new Date(at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
}

/**
 * Load-failure banner (R5-13 "오류": in-page banner with 다시 시도), shared by admin and user screens (#128).
 * `failedAt` is react-query's errorUpdatedAt.
 */
export function LoadErrorBanner({
  title,
  error,
  failedAt,
  onRetry,
  retrying = false,
}: {
  title: string
  error?: unknown
  failedAt?: number
  onRetry: () => void
  retrying?: boolean
}) {
  const detail = apiErrorDetail(error) ?? '네트워크 또는 서버 오류'
  const at = timeLabel(failedAt)
  return (
    <div className="load-error-banner" role="alert">
      <span className="load-error-banner-mark" aria-hidden>
        !
      </span>
      <div className="load-error-banner-text">
        <strong>{title}</strong>
        <span>
          {detail}
          {at ? ` · ${at}` : ''}
        </span>
      </div>
      <Btn variant="outline" size="sm" onClick={onRetry} disabled={retrying}>
        {retrying ? '다시 불러오는 중…' : '다시 시도'}
      </Btn>
    </div>
  )
}

/** 404 state: what is missing + a way back (#128). */
export function NotFoundState({
  title,
  body,
  backTo,
  backLabel,
}: {
  title: string
  body?: string
  backTo: string
  backLabel: string
}) {
  return (
    <div className="personal-empty not-found-state">
      <h2>{title}</h2>
      {body && <p>{body}</p>}
      <div className="personal-empty-actions">
        <Link to={backTo} className="np-read-more">
          {backLabel} →
        </Link>
      </div>
    </div>
  )
}
