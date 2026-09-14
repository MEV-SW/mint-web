import { apiClient } from './client'
import type { IssueDetail, IssueListFilter, IssuePage } from '../types/issue'

export async function listIssues(params: {
  filter?: IssueListFilter
  page?: number
  size?: number
}): Promise<IssuePage> {
  const query = new URLSearchParams()
  if (params.filter && params.filter !== 'all') query.set('filter', params.filter)
  query.set('page', String(params.page ?? 1))
  query.set('size', String(params.size ?? 20))
  const { data } = await apiClient.get<IssuePage>(`/api/v1/issues?${query.toString()}`)
  return data
}

export async function getIssue(id: string): Promise<IssueDetail> {
  const { data } = await apiClient.get<IssueDetail>(`/api/v1/issues/${id}`)
  return data
}

export async function updateIssueTracking(id: string, tracking: boolean): Promise<void> {
  await apiClient.put(`/api/v1/issues/${id}/tracking`, { tracking })
}

export async function markIssueSeen(id: string): Promise<void> {
  await apiClient.post(`/api/v1/issues/${id}/seen`)
}
