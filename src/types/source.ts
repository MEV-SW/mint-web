export type SourceType =
  | 'rss'
  | 'webpage'
  | 'news_page'
  | 'notice_page'
  | 'manual'
  | 'reddit'
  | 'community_forum'
  // mint-server#212 C2: 나라장터 입찰공고 (공공데이터포털). Official sources only.
  | 'official_api'
export type TrustLevel = 'high' | 'medium' | 'low'

export interface Source {
  id: string
  organization_id: string
  name: string
  url: string
  source_type: SourceType
  industry: string
  category: string
  category_id: string | null
  trust_level: TrustLevel
  reliability_score: number
  discovery_type: string
  auto_publish: boolean
  crawl_frequency: string
  last_crawled_at: string | null
  is_active: boolean
  /** Representative topic (always one of edition_ids). */
  edition_id: string
  /** All linked topics; an older backend may omit it (#212 multi-topic sources). */
  edition_ids?: string[]
  created_at: string
  updated_at: string
  // mint-server#178 — optional so an older backend still renders (all "정상").
  collection_failed?: boolean
  last_error_code?: string | null
  last_attempted_at?: string | null
}

export interface SourceSuggestionCandidate {
  name: string
  url: string
  source_type: SourceType
  reason: string
}

export interface SourceSuggestResponse {
  category_id: string
  candidates: SourceSuggestionCandidate[]
  generated_at: string
}

export interface SourceCreate {
  name: string
  url: string
  source_type?: SourceType
  industry?: string
  category?: string
  category_id?: string | null
  trust_level?: TrustLevel
  reliability_score?: number
  auto_publish?: boolean
  crawl_frequency?: string
  is_active?: boolean
  edition_id: string
  edition_ids?: string[]
}

/** Topics a source is linked to, falling back to the single representative topic. */
export function sourceEditionIds(source: { edition_id: string; edition_ids?: string[] }): string[] {
  return source.edition_ids?.length ? source.edition_ids : source.edition_id ? [source.edition_id] : []
}

/** Keep the representative topic when it is still selected, else take the first one. */
export function withEditionIds(form: SourceCreate, editionIds: string[]): SourceCreate {
  const editionId = editionIds.includes(form.edition_id) ? form.edition_id : (editionIds[0] ?? '')
  return { ...form, edition_id: editionId, edition_ids: editionIds }
}

export const SOURCE_CATEGORIES = [
  '정책/규제',
  '시장',
  '기술',
  '경쟁사',
  '입찰/조달',
  '커뮤니티/현장',
  'general',
] as const

export const COMMUNITY_SOURCE_TYPES: SourceType[] = ['reddit', 'community_forum']

/** Short type labels for source lists (server types the web union lacks are listed too). */
export const SOURCE_TYPE_LABELS: Record<string, string> = {
  rss: 'RSS',
  webpage: '웹페이지',
  news_page: '뉴스',
  notice_page: '공지',
  manual: '수동',
  reddit: 'Reddit (수집 불가)',
  community_forum: '커뮤니티',
  community_api: '커뮤니티 API',
  community_feed: '커뮤니티 피드',
  official_api: '공식 API(입찰)',
}

export function sourceTypeLabel(sourceType: string): string {
  return SOURCE_TYPE_LABELS[sourceType] ?? sourceType
}

export const COMMUNITY_SOURCE_PRESET: SourceCreate = {
  name: '',
  url: 'https://www.clien.net/service/board/park',
  source_type: 'community_forum',
  category: '커뮤니티/현장',
  trust_level: 'low',
  reliability_score: 45,
  auto_publish: false,
  crawl_frequency: 'daily',
  is_active: true,
  edition_id: '',
}

export const TRUST_SCORE_DEFAULTS: Record<TrustLevel, number> = {
  high: 85,
  medium: 65,
  low: 45,
}

export const CRAWL_FREQUENCIES = [
  { value: '30m', label: '30분' },
  { value: '1h', label: '1시간' },
  { value: '2h', label: '2시간' },
  { value: '6h', label: '6시간' },
  { value: 'daily', label: '매일' },
] as const
