import type { Importance } from './post'

export interface NewsCategory {
  id: string
  name: string
  sort_order: number
}

export interface Keyword {
  id: string
  category_id: string | null
  owner_user_id: string | null
  name: string
  normalized_name: string
  aliases: string[] | null
  scope: 'organization' | 'personal'
  status: 'active' | 'candidate' | 'archived'
  usage_count: number
  selected: boolean
}

export interface MatchedKeyword {
  id: string
  name: string
  confidence: number
}

export interface PersonalizedNews {
  id: string
  title: string
  source_name: string | null
  category: string | null
  collected_at: string
  original_url: string | null
  importance: Importance
  summary: string | null
  summary_highlight?: string | null
  matched_keywords: MatchedKeyword[]
  personalization_score: number
}

export interface NewsPage {
  items: PersonalizedNews[]
  total: number
  page: number
  size: number
  pages: number
}

export interface PersonalReportItem {
  post: PersonalizedNews
  rank: number
  score: number
  matched_keyword_names: string[]
}

export interface PersonalReport {
  id: string
  report_date: string
  title: string
  summary: string
  item_count: number
  popup_seen: boolean
  items: PersonalReportItem[]
}

export interface ReviewQueueItem {
  id: string
  post_id: string
  post_title: string
  reason: 'low_confidence' | 'uncategorized' | 'no_keywords' | 'new_keyword' | 'extraction_failed'
  status: 'pending' | 'resolved' | 'excluded'
  detail: string | null
  created_at: string
}

export interface KeywordSuggestion {
  name: string
  confidence: number
  keyword_id: string | null
}

export interface KeywordSuggestResponse {
  post_id: string
  category: string | null
  suggestions: KeywordSuggestion[]
}

export interface ReviewQueueKeywordsApplyResponse {
  post_id: string
  linked_keywords: string[]
  resolved_queue_item_ids: string[]
}
