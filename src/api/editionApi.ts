import { apiClient } from './client'
import type { Edition, EditionCreate, EditionUpdate } from '../types/edition'
import type { Keyword } from '../types/personalization'
import type { TrendRead } from '../types/trend'

export async function listEditions(activeOnly = true): Promise<Edition[]> {
  const { data } = await apiClient.get<Edition[]>('/api/v1/editions', {
    params: { active_only: activeOnly },
  })
  return data
}

export async function listAvailableEditions(): Promise<Edition[]> {
  const { data } = await apiClient.get<Edition[]>('/api/v1/editions/available')
  return data
}

export async function createEdition(payload: EditionCreate): Promise<Edition> {
  const { data } = await apiClient.post<Edition>('/api/v1/editions', payload)
  return data
}

export async function updateEdition(id: string, payload: EditionUpdate): Promise<Edition> {
  const { data } = await apiClient.patch<Edition>(`/api/v1/editions/${id}`, payload)
  return data
}

export async function updateFeaturedKeywords(
  editionId: string,
  keywordIds: string[],
): Promise<Keyword[]> {
  const { data } = await apiClient.put<Keyword[]>(
    `/api/v1/editions/${editionId}/keywords/featured`,
    { keyword_ids: keywordIds },
  )
  return data
}

export async function getEditionTrend(
  editionId: string,
  range: 7 | 30 | 90,
): Promise<TrendRead> {
  const { data } = await apiClient.get<TrendRead>(`/api/v1/editions/${editionId}/trend`, {
    params: { range },
  })
  return data
}

export async function downloadEditionTrendCsv(
  editionId: string,
  range: 7 | 30 | 90,
  slug: string,
): Promise<void> {
  const { data } = await apiClient.get<Blob>(`/api/v1/editions/${editionId}/trend.csv`, {
    params: { range },
    responseType: 'blob',
  })
  const url = URL.createObjectURL(data)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `motrexev-trend-${slug}-${range}d.csv`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
