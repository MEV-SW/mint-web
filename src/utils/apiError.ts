export function apiErrorDetail(error: unknown): string | null {
  const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail
  return typeof detail === 'string' ? detail : null
}
