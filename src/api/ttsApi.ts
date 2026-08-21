import { apiClient } from './client'

export async function narrateSpeech(text: string): Promise<Blob> {
  const { data } = await apiClient.post(
    '/api/v1/tts/narrate',
    { text },
    { responseType: 'blob', timeout: 180_000 },
  )
  return data as Blob
}
