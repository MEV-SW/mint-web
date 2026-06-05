export type BoardType = 'trusted' | 'discovery'
export type PostStatus = 'pending' | 'published' | 'hidden' | 'deleted' | 'promoted'
export type Importance = 'high' | 'medium' | 'low' | 'unknown'
export type TrustLevel = 'high' | 'medium' | 'low'

export interface AIOutput {
  id: string
  summary: string
  impact: string | null
  action_items: string[] | null
  importance: Importance
  confidence: number | null
  model: string
  prompt_version: string
  created_at: string
}

export interface Post {
  id: string
  organization_id: string
  source_id: string | null
  source_name: string | null
  board_type: BoardType
  title: string
  original_url: string | null
  published_at: string | null
  collected_at: string
  raw_content: string
  category: string | null
  status: PostStatus
  trust_level: TrustLevel
  reliability_score: number
  importance: Importance
  created_by: string
  created_at: string
  updated_at: string
  latest_ai?: AIOutput | null
}

export interface PostDetail extends Post {
  keywords: unknown
  ai_outputs: AIOutput[]
}

export interface PaginatedPosts {
  items: Post[]
  total: number
  page: number
  size: number
  pages: number
}
