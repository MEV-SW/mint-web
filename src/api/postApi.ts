import { apiClient } from './client'
import type { AIOutput, BoardType, Importance, PaginatedPosts, Post, PostDetail, PostStatus } from '../types/post'

export interface PostListParams {
  board_type?: BoardType
  status?: PostStatus
  importance?: Importance
  category?: string
  keyword?: string
  page?: number
  size?: number
}

export async function listPosts(params: PostListParams): Promise<PaginatedPosts> {
  const { data } = await apiClient.get<PaginatedPosts>('/api/v1/posts', { params })
  return data
}

export async function getPost(id: string): Promise<PostDetail> {
  const { data } = await apiClient.get<PostDetail>(`/api/v1/posts/${id}`)
  return data
}

export async function approvePost(id: string): Promise<Post> {
  const { data } = await apiClient.post<Post>(`/api/v1/posts/${id}/approve`)
  return data
}

export async function hidePost(id: string): Promise<Post> {
  const { data } = await apiClient.post<Post>(`/api/v1/posts/${id}/hide`)
  return data
}

export async function deletePost(id: string): Promise<Post> {
  const { data } = await apiClient.post<Post>(`/api/v1/posts/${id}/delete`)
  return data
}

export async function promotePost(id: string): Promise<Post> {
  const { data } = await apiClient.post<Post>(`/api/v1/posts/${id}/promote`)
  return data
}

export async function summarizePost(id: string): Promise<AIOutput> {
  const { data } = await apiClient.post<AIOutput>(`/api/v1/posts/${id}/summarize`)
  return data
}
