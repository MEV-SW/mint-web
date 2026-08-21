export interface Edition {
  id: string
  organization_id: string
  slug: string
  name: string
  sort_order: number
  is_active: boolean
  topic_terms: string[]
  tagged_source_count: number
  featured_keyword_count: number
  missing_sources: boolean
  created_at: string
  updated_at: string
}

export interface EditionCreate {
  name: string
  slug: string
  topic_terms?: string[]
  sort_order?: number
  is_active?: boolean
}

export interface EditionUpdate {
  name?: string
  topic_terms?: string[]
  sort_order?: number
  is_active?: boolean
}
