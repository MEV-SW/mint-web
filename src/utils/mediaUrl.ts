const apiBase = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8100').replace(/\/$/, '')

/**
 * API가 반환한 /media/... 경로를 브라우저에서 열 수 있는 절대 URL로 변환.
 * 운영에서 nginx가 /api 만 프록시하는 경우가 많아 /media → /api/v1/files 로 치환한다.
 */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://')) {
    try {
      const u = new URL(path)
      if (u.pathname.startsWith('/media/')) {
        return mediaUrl(u.pathname + u.search)
      }
    } catch {
      return path
    }
    return path
  }

  let p = path.startsWith('/') ? path : `/${path}`
  if (p.startsWith('/media/')) {
    p = `/api/v1/files/${p.slice('/media/'.length)}`
  }
  return `${apiBase}${p}`
}
