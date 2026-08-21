export type SourceType =
  | 'rss'
  | 'webpage'
  | 'news_page'
  | 'notice_page'
  | 'manual'
  | 'reddit'
  | 'community_forum'
export type TrustLevel = 'high' | 'medium' | 'low'

export interface Source {
  id: string
  organization_id: string
  name: string
  url: string
  source_type: SourceType
  industry: string
  category: string
  trust_level: TrustLevel
  reliability_score: number
  discovery_type: string
  auto_publish: boolean
  crawl_frequency: string
  last_crawled_at: string | null
  is_active: boolean
  edition_ids?: string[]
  created_at: string
  updated_at: string
}

export interface SourceCreate {
  name: string
  url: string
  source_type?: SourceType
  industry?: string
  category?: string
  trust_level?: TrustLevel
  reliability_score?: number
  auto_publish?: boolean
  crawl_frequency?: string
  is_active?: boolean
  edition_ids?: string[]
}

export const SOURCE_CATEGORIES = [
  '정책/규제',
  '시장',
  '기술',
  '경쟁사',
  '커뮤니티/현장',
  'general',
] as const

export const COMMUNITY_SOURCE_TYPES: SourceType[] = ['reddit', 'community_forum']

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
