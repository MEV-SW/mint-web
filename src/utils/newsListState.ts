export type NewsKind = 'news' | 'community' | 'discovery'
export type NewsImportance = 'high' | 'medium' | 'low'

export type NewsListParams = {
  q: string
  kind: NewsKind | ''
  edition: string
  category: string
  kw: string
  importance: NewsImportance | ''
  /** #132: list page (1 is the default and is not written to the URL). */
  page?: number
}

function asKind(raw: string | null): NewsKind | '' {
  return raw === 'news' || raw === 'community' || raw === 'discovery' ? raw : ''
}

function asImportance(raw: string | null): NewsImportance | '' {
  return raw === 'high' || raw === 'medium' || raw === 'low' ? raw : ''
}

export function readNewsListParams(params: URLSearchParams): NewsListParams {
  const q = (params.get('q') || params.get('keyword') || '').trim()
  return {
    q,
    kind: asKind(params.get('kind')),
    edition: (params.get('edition') || '').trim(),
    category: (params.get('category') || '').trim(),
    kw: (params.get('kw') || '').trim(),
    importance: asImportance(params.get('importance')),
    page: asPage(params.get('page')),
  }
}

function asPage(raw: string | null): number {
  const value = Number(raw)
  return Number.isInteger(value) && value > 1 ? value : 1
}

export function newsListSearchParams(opts: Partial<NewsListParams> = {}): URLSearchParams {
  const next = new URLSearchParams()
  const q = opts.q?.trim()
  if (q) next.set('q', q)
  if (opts.kind) next.set('kind', opts.kind)
  if (opts.edition) next.set('edition', opts.edition)
  if (opts.category) next.set('category', opts.category)
  if (opts.kw) next.set('kw', opts.kw)
  if (opts.importance) next.set('importance', opts.importance)
  if (opts.page && opts.page > 1) next.set('page', String(opts.page))
  return next
}

export function newsListPath(opts: Partial<NewsListParams> = {}): string {
  const qs = newsListSearchParams(opts).toString()
  return qs ? `/news?${qs}` : '/news'
}

export function legacyBoardToNewsPath(
  board: 'trusted' | 'discovery',
  params: URLSearchParams,
): string {
  const from = readNewsListParams(params)
  return newsListPath({
    ...from,
    kind: board === 'discovery' ? 'discovery' : from.kind || 'news',
  })
}
