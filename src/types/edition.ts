export type EditionDisplayMode = 'news' | 'trend'

export interface Edition {
  id: string
  organization_id: string
  slug: string
  name: string
  sort_order: number
  is_active: boolean
  display_mode: EditionDisplayMode
  topic_terms: string[]
  exclude_terms: string[]
  relevance_criteria: string | null
  tagged_source_count: number
  featured_keyword_count: number
  missing_sources: boolean
  created_at: string
  updated_at: string
}

export interface EditionCreate {
  name: string
  slug?: string
  topic_terms?: string[]
  exclude_terms?: string[]
  relevance_criteria?: string | null
  sort_order?: number
  is_active?: boolean
  display_mode?: EditionDisplayMode
}

export interface EditionUpdate {
  name?: string
  topic_terms?: string[]
  exclude_terms?: string[]
  relevance_criteria?: string | null
  sort_order?: number
  is_active?: boolean
  display_mode?: EditionDisplayMode
}
