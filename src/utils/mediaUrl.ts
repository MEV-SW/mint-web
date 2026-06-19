const apiBase = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8100').replace(/\/$/, '')

/** API가 반환한 /media/... 경로를 브라우저에서 열 수 있는 절대 URL로 변환 */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return `${apiBase}${path.startsWith('/') ? path : `/${path}`}`
}
