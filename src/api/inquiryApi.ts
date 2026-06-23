import { apiClient } from './client'

export type InquiryStatus = 'open' | 'answered' | 'closed'

export interface InquiryAuthor {
  id: string
  name: string
  email: string
  role: string
}

export interface InquiryMessage {
  id: string
  inquiry_id: string
  author_id: string
  body: string
  created_at: string
  author: InquiryAuthor
}

export interface Inquiry {
  id: string
  organization_id: string
  user_id: string
  title: string
  status: InquiryStatus
  created_at: string
  updated_at: string
  user: InquiryAuthor
}

export interface InquiryDetail extends Inquiry {
  messages: InquiryMessage[]
}

export interface InquiryCreatePayload {
  title: string
  body: string
}

export async function createInquiry(payload: InquiryCreatePayload): Promise<InquiryDetail> {
  const { data } = await apiClient.post<InquiryDetail>('/api/v1/inquiries', payload)
  return data
}

export async function listMyInquiries(): Promise<Inquiry[]> {
  const { data } = await apiClient.get<Inquiry[]>('/api/v1/inquiries/mine')
  return data
}

export async function listInquiries(status?: InquiryStatus): Promise<Inquiry[]> {
  const { data } = await apiClient.get<Inquiry[]>('/api/v1/inquiries', {
    params: status ? { status } : undefined,
  })
  return data
}

export async function getOpenInquiryCount(): Promise<number> {
  const { data } = await apiClient.get<{ count: number }>('/api/v1/inquiries/open-count')
  return data.count
}

export async function getInquiry(id: string): Promise<InquiryDetail> {
  const { data } = await apiClient.get<InquiryDetail>(`/api/v1/inquiries/${id}`)
  return data
}

export async function addInquiryMessage(id: string, body: string): Promise<InquiryDetail> {
  const { data } = await apiClient.post<InquiryDetail>(`/api/v1/inquiries/${id}/messages`, { body })
  return data
}

export async function closeInquiry(id: string): Promise<InquiryDetail> {
  const { data } = await apiClient.patch<InquiryDetail>(`/api/v1/inquiries/${id}/close`)
  return data
}
