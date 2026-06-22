import { apiClient } from './client'
import type { BackgroundJob } from '../types/job'
import type { Source, SourceCreate } from '../types/source'

export async function listSources(): Promise<Source[]> {
  const { data } = await apiClient.get<Source[]>('/api/v1/sources')
  return data
}

export async function createSource(payload: SourceCreate): Promise<Source> {
  const { data } = await apiClient.post<Source>('/api/v1/sources', payload)
  return data
}

export type SourceUpdate = Partial<SourceCreate>

export async function updateSource(id: string, payload: SourceUpdate): Promise<Source> {
  const { data } = await apiClient.patch<Source>(`/api/v1/sources/${id}`, payload)
  return data
}

export async function deleteSource(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/sources/${id}`)
}

export async function crawlSource(id: string): Promise<BackgroundJob> {
  const { data } = await apiClient.post<BackgroundJob>(`/api/v1/sources/${id}/crawl`)
  return data
}

export async function crawlSourceToDiscovery(id: string): Promise<BackgroundJob> {
  const { data } = await apiClient.post<BackgroundJob>(`/api/v1/sources/${id}/crawl-to-discovery`)
  return data
}

export async function crawlAllToDiscovery(params?: {
  trusted_only?: boolean
  community_only?: boolean
}): Promise<BackgroundJob> {
  const { data } = await apiClient.post<BackgroundJob>(`/api/v1/sources/crawl-all-to-discovery`, null, {
    params:
      params?.trusted_only === undefined && params?.community_only === undefined
        ? undefined
        : {
            trusted_only: params?.trusted_only,
            community_only: params?.community_only,
          },
  })
  return data
}

export interface CommunityUrlSubmitResult {
  accepted: boolean
  reason: string | null
}

export async function submitCommunityUrl(payload: {
  url: string
  title?: string
  note?: string
}): Promise<CommunityUrlSubmitResult> {
  const { data } = await apiClient.post<CommunityUrlSubmitResult>(
    '/api/v1/sources/submit-url',
    payload,
  )
  return data
}

export interface CollectionSettings {
  discovery_pending_retention_days: number
  default_retention_days: number
  is_custom: boolean
}

export async function getCollectionSettings(): Promise<CollectionSettings> {
  const { data } = await apiClient.get<CollectionSettings>('/api/v1/sources/collection-settings')
  return data
}

export async function updateCollectionSettings(
  discovery_pending_retention_days: number,
): Promise<CollectionSettings> {
  const { data } = await apiClient.patch<CollectionSettings>('/api/v1/sources/collection-settings', {
    discovery_pending_retention_days,
  })
  return data
}
