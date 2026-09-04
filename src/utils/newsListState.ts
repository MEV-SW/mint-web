export type NewsKind = 'news' | 'community' | 'discovery'
export type NewsImportance = 'high' | 'medium' | 'low'

export type NewsListParams = {
  q: string
  kind: NewsKind | ''
  edition: string
  category: string
  kw: string
  importance: NewsImportance | ''
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
  }
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
