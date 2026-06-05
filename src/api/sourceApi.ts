import { apiClient } from './client'
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

export type CrawlResult = {
  source_id: string
  created: number
  skipped: number
  message: string
  error?: string | null
}

export async function crawlSource(id: string): Promise<CrawlResult> {
  const { data } = await apiClient.post(`/api/v1/sources/${id}/crawl`)
  return data
}

export async function crawlSourceToDiscovery(id: string): Promise<CrawlResult> {
  const { data } = await apiClient.post(`/api/v1/sources/${id}/crawl-to-discovery`)
  return data
}

export async function crawlAllToDiscovery(params?: {
  trusted_only?: boolean
}): Promise<CrawlResult[]> {
  const { data } = await apiClient.post(`/api/v1/sources/crawl-all-to-discovery`, null, {
    params: params?.trusted_only === undefined ? undefined : { trusted_only: params.trusted_only },
  })
  return data
}
