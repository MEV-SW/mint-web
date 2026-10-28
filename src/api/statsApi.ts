import { apiClient } from './client'
import type { BoardType, Importance, PostStatus } from '../types/post'

export interface DashboardPostPreview {
  id: string
  title: string
  source_name: string | null
  source_type?: string | null
  board_type: BoardType
  status: PostStatus
  importance: Importance
  collected_at: string
  /** #143: report date; null when the source gave none. */
  published_at?: string | null
  original_url: string | null
  ai_summary: string | null
  image_url?: string | null
}

export interface DashboardStats {
  new_today: number
  trusted_count: number
  pending_discovery: number
  high_importance: number
  active_sources: number
  total_sources: number
  discovery_pending_retention_days: number
  latest_report: {
    id: string
    title: string
    report_date: string
    summary: string
    slack_sent: boolean
    illustration_url: string | null
    highlights: {
      title: string
      description: string | null
      importance: string | null
      related_post_ids?: string[]
    }[]
  } | null
  trusted_preview: DashboardPostPreview[]
  discovery_preview: DashboardPostPreview[]
  community_voices_preview?: DashboardPostPreview[]
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const { data } = await apiClient.get<DashboardStats>('/api/v1/stats/dashboard')
  return data
}

/** Share one in-flight request so React StrictMode / remounts don't double-bill Gemini. */
let frontPhotoInflight: Promise<string> | null = null

export async function ensureFrontPhoto(payload: {
  report_id?: string
  title?: string
  summary?: string
  seed?: string
  force?: boolean
}): Promise<string> {
  if (frontPhotoInflight) return frontPhotoInflight

  frontPhotoInflight = apiClient
    .post<{ illustration_url: string }>(
      '/api/v1/stats/front-photo',
      payload,
      { timeout: 180_000 },
    )
    .then(({ data }) => data.illustration_url)
    .finally(() => {
      frontPhotoInflight = null
    })

  return frontPhotoInflight
}

export interface WeatherInfo {
  location: string
  temperature_c: number
  feels_like_c: number | null
  humidity_pct: number | null
  wind_kmh: number | null
  condition: string
  high_c: number | null
  low_c: number | null
  weather_code: number
}

export async function fetchTodayWeather(): Promise<WeatherInfo> {
  const { data } = await apiClient.get<WeatherInfo>('/api/v1/stats/weather')
  return data
}

// mint-server#174 — admin home KPIs / sidebar badges. Editors get their active editions only.
export interface AdminSummaryEdition {
  edition_id: string
  name: string
  source_count: number
  failed_source_count: number
  pending_candidate_count: number
}

export interface AdminSummary {
  scope: 'organization' | 'editions'
  pending_users: number | null
  open_inquiries: number | null
  failed_sources: number
  pending_candidates: number
  editions: AdminSummaryEdition[]
  generated_at: string
}

export async function getAdminSummary(): Promise<AdminSummary> {
  const { data } = await apiClient.get<AdminSummary>('/api/v1/stats/admin-summary')
  return data
}


/** mint-server#213 — count one screen visit. Best effort: errors never reach the screen. */
export function recordVisit(screen: string): void {
  apiClient.post('/api/v1/stats/visits', { screen }).catch(() => undefined)
}

export interface UsageSummary {
  metric: 'visit'
  days: number
  start_date: string
  end_date: string
  total: number
  items: { key: string; count: number }[]
}

export async function getUsageSummary(days = 7): Promise<UsageSummary> {
  const { data } = await apiClient.get<UsageSummary>('/api/v1/stats/usage', { params: { days } })
  return data
}
