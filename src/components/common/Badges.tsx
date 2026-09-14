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

const CHANGE_KIND_LABEL: Record<string, string> = {
  first_report: '첫 보도',
  development: '실질 변화',
  duplicates: '중복 보도',
  correction: '정정',
  admin_adjust: '관리자 조정',
}

export function ChangeKindBadge({ kind }: { kind: string }) {
  return (
    <span className={cx('badge', 'badge-outline')}>
      <span className="dot" />
      {CHANGE_KIND_LABEL[kind] || kind}
    </span>
  )
}

const FACT_TYPE_LABEL: Record<string, string> = {
  fact: '사실',
  ai_interpretation: 'AI 해석',
  needs_check: '추가 확인 필요',
}
const FACT_TYPE_CLASS: Record<string, string> = {
  fact: 'badge-mint',
  ai_interpretation: 'badge-info',
  needs_check: 'badge-med',
}

export function FactTypeBadge({ factType }: { factType: string }) {
  return (
    <span className={cx('badge', FACT_TYPE_CLASS[factType] || 'badge-unknown')}>
      <span className="dot" />
      {FACT_TYPE_LABEL[factType] || factType}
    </span>
  )
}

export function NewBadge() {
  return (
    <span className={cx('badge', 'badge-failed')} style={{ fontWeight: 700 }}>
      NEW
    </span>
  )
}

const CHANGE_STATE_LABEL: Record<string, string> = {
  development: '실질 변화',
  correction: '정정 반영',
  duplicates_only: '중복 보도',
  quiet: '조용함',
}
const CHANGE_STATE_CLASS: Record<string, string> = {
  development: 'badge-high',
  correction: 'badge-med',
  duplicates_only: 'badge-unknown',
  quiet: 'badge-outline',
}

export function ChangeStateBadge({ state }: { state: string }) {
  return (
    <span className={cx('badge', CHANGE_STATE_CLASS[state] || 'badge-unknown')}>
      <span className="dot" />
      {CHANGE_STATE_LABEL[state] || state}
    </span>
  )
}
