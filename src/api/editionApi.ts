import { apiClient } from './client'
import type { Edition, EditionCreate, EditionUpdate } from '../types/edition'
import type { Keyword } from '../types/personalization'

export async function listEditions(activeOnly = true): Promise<Edition[]> {
  const { data } = await apiClient.get<Edition[]>('/api/v1/editions', {
    params: { active_only: activeOnly },
  })
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
