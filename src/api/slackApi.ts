import { apiClient } from './client'

export interface SlackWebhook {
  id: string
  organization_id: string
  channel_name: string
  purpose: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export async function listWebhooks(): Promise<SlackWebhook[]> {
  const { data } = await apiClient.get<SlackWebhook[]>('/api/v1/slack/webhooks')
  return data
}

export async function createWebhook(payload: {
  webhook_url: string
  channel_name: string
  purpose?: string
  is_active?: boolean
}): Promise<SlackWebhook> {
  const { data } = await apiClient.post<SlackWebhook>('/api/v1/slack/webhooks', payload)
  return data
}

export async function updateWebhook(
  id: string,
  payload: Partial<{ webhook_url: string; channel_name: string; is_active: boolean }>,
): Promise<SlackWebhook> {
  const { data } = await apiClient.patch<SlackWebhook>(`/api/v1/slack/webhooks/${id}`, payload)
  return data
}

export async function deleteWebhook(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/slack/webhooks/${id}`)
}

export async function testSlack(message?: string): Promise<{ success: boolean; message: string }> {
  const { data } = await apiClient.post('/api/v1/slack/test', { message: message || 'MINT 테스트 메시지' })
  return data
}
