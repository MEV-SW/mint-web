import { apiClient } from './client'

export interface ChatCitation {
  post_id: string
  title: string
  url: string | null
  summary: string | null
}

export interface ChatAskResponse {
  reply: string
  citations: ChatCitation[]
  needs_general_confirm?: boolean
  source?: 'mint' | 'general' | null
}

export async function askChat(
  message: string,
  options?: { allowGeneral?: boolean },
): Promise<ChatAskResponse> {
  const { data } = await apiClient.post<ChatAskResponse>('/api/v1/chat/ask', {
    message,
    allow_general: options?.allowGeneral ?? false,
  })
  return data
}
