import type { Importance, PostStatus, TrustLevel } from '../../types/post'
import { cx } from '../../utils/cx'
import { Icon } from './Icon'

const IMP_LABEL: Record<Importance, string> = {
  high: '높음',
  medium: '보통',
  low: '낮음',
  unknown: '미정',
}
const IMP_CLASS: Record<Importance, string> = {
  high: 'badge-high',
  medium: 'badge-med',
  low: 'badge-low',
  unknown: 'badge-unknown',
}

export function ImportanceBadge({ level }: { level: Importance }) {
  return (
    <span className={cx('badge', IMP_CLASS[level] || 'badge-unknown')}>
      <span className="dot" />
      {IMP_LABEL[level] || '미정'}
    </span>
  )
}

export function TrustBadge({ level, score }: { level: TrustLevel; score?: number }) {
  const cls =
    level === 'high' ? 'badge-mint' : level === 'medium' ? 'badge-info' : 'badge-low'
  const label = level === 'high' ? '높음' : level === 'medium' ? '보통' : '낮음'
  return (
    <span className={cx('badge', cls)}>
      <span className="dot" />
      {label}
      {score != null ? ` · ${score}` : ''}
    </span>
  )
}

const STATUS_LABEL: Record<PostStatus, string> = {
  published: '게시됨',
  pending: '검토 대기',
  hidden: '숨김',
  promoted: '승격됨',
  deleted: '삭제됨',
}

export function StatusPill({ status }: { status: PostStatus }) {
  return <span className={cx('spill', `spill-${status}`)}>{STATUS_LABEL[status] || status}</span>
}

export function AiBadge({ label = 'AI 요약' }: { label?: string }) {
  return (
    <span className="ai-badge">
      <Icon name="sparkles" />
      {label}
    </span>
  )
}
