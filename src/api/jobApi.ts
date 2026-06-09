import { apiClient } from './client'
import type { BackgroundJob } from '../types/job'

export async function listJobs(params?: {
  active_only?: boolean
  limit?: number
}): Promise<BackgroundJob[]> {
  const { data } = await apiClient.get<BackgroundJob[]>('/api/v1/jobs', { params })
  return data
}

export async function getJob(id: string): Promise<BackgroundJob> {
  const { data } = await apiClient.get<BackgroundJob>(`/api/v1/jobs/${id}`)
  return data
}
