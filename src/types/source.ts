export type SourceType = 'rss' | 'webpage' | 'news_page' | 'notice_page' | 'manual'
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
}

export const SOURCE_CATEGORIES = ['정책/규제', '시장', '기술', '경쟁사', 'general'] as const

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
