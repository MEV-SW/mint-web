import { apiClient } from './client'
import type { BoardType, Importance, PostStatus } from '../types/post'

export interface DashboardPostPreview {
  id: string
  title: string
  source_name: string | null
  board_type: BoardType
  status: PostStatus
  importance: Importance
  collected_at: string
  original_url: string | null
  ai_summary: string | null
}

export interface DashboardStats {
  new_today: number
  trusted_count: number
  pending_discovery: number
  high_importance: number
  active_sources: number
  total_sources: number
  latest_report: {
    id: string
    title: string
    report_date: string
    summary: string
    slack_sent: boolean
  } | null
  trusted_preview: DashboardPostPreview[]
  discovery_preview: DashboardPostPreview[]
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const { data } = await apiClient.get<DashboardStats>('/api/v1/stats/dashboard')
  return data
}
