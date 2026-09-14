import { apiClient } from './client'
import type {
  IssueDetail,
  IssueListFilter,
  IssuePage,
  IssueRevisionPage,
} from '../types/issue'

export async function listIssues(params: {
  filter?: IssueListFilter
  page?: number
  size?: number
  q?: string
}): Promise<IssuePage> {
  const query = new URLSearchParams()
  if (params.filter && params.filter !== 'all') query.set('filter', params.filter)
  if (params.q) query.set('q', params.q)
  query.set('page', String(params.page ?? 1))
  query.set('size', String(params.size ?? 20))
  const { data } = await apiClient.get<IssuePage>(`/api/v1/issues?${query.toString()}`)
  return data
}

export async function listIssueRevisions(id: string): Promise<IssueRevisionPage> {
  const { data } = await apiClient.get<IssueRevisionPage>(
    `/api/v1/issues/${id}/revisions?size=50`,
  )
  return data
}

export async function mergeIssue(id: string, mergeWith: string): Promise<IssueDetail> {
  const { data } = await apiClient.post<IssueDetail>(`/api/v1/issues/${id}/merge`, {
    merge_with: mergeWith,
  })
  return data
}

export async function splitIssue(id: string, postId: string): Promise<IssueDetail> {
  const { data } = await apiClient.post<IssueDetail>(`/api/v1/issues/${id}/split`, {
    post_id: postId,
  })
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
