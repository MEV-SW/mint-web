import { apiClient } from './client'
import type {
  Keyword,
  NewsCategory,
  NewsPage,
  PersonalReport,
  ReviewQueueItem,
} from '../types/personalization'

export async function listCategories(): Promise<NewsCategory[]> {
  const { data } = await apiClient.get<NewsCategory[]>('/api/v1/categories')
  return data
}

export async function listKeywords(): Promise<Keyword[]> {
  const { data } = await apiClient.get<Keyword[]>('/api/v1/keywords')
  return data
}

export async function updateMyKeywords(keywordIds: string[]): Promise<Keyword[]> {
  const { data } = await apiClient.put<Keyword[]>('/api/v1/users/me/keywords', {
    keyword_ids: keywordIds,
  })
  return data
}

export async function createCustomKeyword(name: string): Promise<Keyword> {
  const { data } = await apiClient.post<Keyword>('/api/v1/users/me/keywords/custom', { name })
  return data
}

export async function getPersonalFeed(page = 1, size = 20): Promise<NewsPage> {
  const { data } = await apiClient.get<NewsPage>('/api/v1/feed', { params: { page, size } })
  return data
}

export async function getNews(params: {
  q?: string
  keyword_ids?: string[]
  importance?: string
  category?: string
  page?: number
  size?: number
}): Promise<NewsPage> {
  const query = new URLSearchParams()
  if (params.q) query.set('q', params.q)
  params.keyword_ids?.forEach((id) => query.append('keyword_ids', id))
  if (params.importance) query.set('importance', params.importance)
  if (params.category) query.set('category', params.category)
  query.set('page', String(params.page ?? 1))
  query.set('size', String(params.size ?? 20))
  const { data } = await apiClient.get<NewsPage>(`/api/v1/news?${query}`)
  return data
}

export async function listPersonalReports(): Promise<PersonalReport[]> {
  const { data } = await apiClient.get<PersonalReport[]>('/api/v1/personal-reports')
  return data
}

export async function getLatestPersonalReport(): Promise<PersonalReport | null> {
  const { data } = await apiClient.get<PersonalReport | null>('/api/v1/personal-reports/latest')
  return data
}

export async function getPersonalReport(id: string): Promise<PersonalReport> {
  const { data } = await apiClient.get<PersonalReport>(`/api/v1/personal-reports/${id}`)
  return data
}

export async function markPersonalReportViewed(id: string, opened = false): Promise<void> {
  await apiClient.post(`/api/v1/personal-reports/${id}/view`, {
    popup_seen: true,
    opened,
  })
}

export async function listReviewQueue(status = 'pending'): Promise<ReviewQueueItem[]> {
  const { data } = await apiClient.get<ReviewQueueItem[]>('/api/v1/review-queue', {
    params: { status },
  })
  return data
}

export async function resolveReviewQueue(
  id: string,
  status: 'resolved' | 'excluded',
): Promise<ReviewQueueItem> {
  const { data } = await apiClient.patch<ReviewQueueItem>(`/api/v1/review-queue/${id}`, {
    status,
  })
  return data
}

export async function triggerReclassifyAll(limit = 500) {
  const { data } = await apiClient.post('/api/v1/review-queue/reclassify-all', null, {
    params: { limit },
  })
  return data
}
