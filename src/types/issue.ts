export type IssueChangeState = 'development' | 'correction' | 'duplicates_only' | 'quiet'
export type IssueStatus = 'active' | 'series' | 'merged'
export type IssueListFilter = 'all' | 'tracked' | 'changed'

export interface IssueListItem {
  id: string
  title: string
  summary: string
  edition_id: string | null
  member_count: number
  source_count: number
  first_seen_at: string
  last_activity_at: string
  change_state: IssueChangeState
  tracking: boolean
  has_unseen_change: boolean
}

export interface IssuePage {
  items: IssueListItem[]
  total: number
  page: number
  size: number
  pages: number
}

export interface IssueMember {
  post_id: string
  title: string
  source_name: string
  board_type: 'trusted' | 'discovery'
  role: string
  published_at: string | null
  original_url: string | null
  unverified: boolean
}

export interface IssueDetail {
  id: string
  title: string
  summary: string
  summary_confidence: string | null
  edition_id: string | null
  status: IssueStatus
  member_count: number
  source_count: number
  first_seen_at: string
  last_activity_at: string
  tracking: boolean
  last_seen_at: string | null
  has_unseen_change: boolean
  members: IssueMember[]
}

export const ISSUE_CHANGE_STATE_LABELS: Record<IssueChangeState, string> = {
  development: '실질 변화',
  correction: '정정 반영',
  duplicates_only: '중복 보도',
  quiet: '조용함',
}

export const ISSUE_LIST_FILTERS: { value: IssueListFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'tracked', label: '추적 중' },
  { value: 'changed', label: '이번 주 변화' },
]

export interface IssueRevision {
  id: string
  kind: string
  fact_type: string | null
  headline: string
  note: string
  post_id: string | null
  post_title: string | null
  source_name: string | null
  duplicate_post_ids: string[] | null
  actor: { user_id: string; name: string } | null
  occurred_at: string
  is_unseen: boolean
}

export interface IssueRevisionPage {
  items: IssueRevision[]
  total: number
  page: number
  size: number
  pages: number
}
