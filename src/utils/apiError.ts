export function apiErrorDetail(error: unknown): string | null {
  const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail
  return typeof detail === 'string' ? detail : null
}

/** HTTP status of an axios error, or null (network errors have no response). */
export function apiErrorStatus(error: unknown): number | null {
  const status = (error as { response?: { status?: number } })?.response?.status
  return typeof status === 'number' ? status : null
}

/** mint-server#228: machine code next to `detail` (e.g. "recipients_changed"), or null. */
export function apiErrorCode(error: unknown): string | null {
  const code = (error as { response?: { data?: { code?: string } } })?.response?.data?.code
  return typeof code === 'string' ? code : null
}
