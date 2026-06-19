export interface BoardListParams {
  page: number
  keyword: string
  importance: string
  status: string
}

export function readBoardListParams(searchParams: URLSearchParams): BoardListParams {
  const rawPage = Number(searchParams.get('page') ?? '1')
  return {
    page: Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1,
    keyword: searchParams.get('keyword') ?? '',
    importance: searchParams.get('importance') ?? 'all',
    status: searchParams.get('status') ?? 'all',
  }
}

export function boardListPath(pathname: string, searchParams: URLSearchParams): string {
  const qs = searchParams.toString()
  return qs ? `${pathname}?${qs}` : pathname
}

export function boardScrollKey(listPath: string): string {
  return `mint-board-scroll:${listPath}`
}

export function patchBoardListParams(
  prev: URLSearchParams,
  patch: Partial<BoardListParams>,
): URLSearchParams {
  const merged = { ...readBoardListParams(prev), ...patch }
  const next = new URLSearchParams(prev)

  if (merged.keyword) next.set('keyword', merged.keyword)
  else next.delete('keyword')

  if (merged.page > 1) next.set('page', String(merged.page))
  else next.delete('page')

  if (merged.importance !== 'all') next.set('importance', merged.importance)
  else next.delete('importance')

  if (merged.status !== 'all') next.set('status', merged.status)
  else next.delete('status')

  return next
}
