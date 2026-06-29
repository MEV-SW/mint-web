import { apiClient } from './client'
import type { BoardType } from '../types/post'

export interface SearchPostHit {
  id: string
  title: string
  board_type: BoardType
  source_name: string | null
  summary: string | null
  original_url: string | null
  title_highlight?: string | null
  summary_highlight?: string | null
}

export interface SearchSourceHit {
  id: string
  name: string
  url: string
  category: string | null
}

export interface GlobalSearchResponse {
  query: string
  posts: SearchPostHit[]
  sources: SearchSourceHit[]
}

export async function globalSearch(q: string, limit = 8): Promise<GlobalSearchResponse> {
  const { data } = await apiClient.get<GlobalSearchResponse>('/api/v1/search', {
    params: { q, limit },
  })
  return data
}
