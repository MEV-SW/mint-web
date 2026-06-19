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

export async function cancelJob(id: string): Promise<BackgroundJob> {
  const { data } = await apiClient.post<BackgroundJob>(`/api/v1/jobs/${id}/cancel`)
  return data
}

export async function deleteJob(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/jobs/${id}`)
}

export async function clearFinishedJobs(): Promise<{ deleted: number }> {
  const { data } = await apiClient.delete<{ deleted: number }>('/api/v1/jobs/finished')
  return data
}
