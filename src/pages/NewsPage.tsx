import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState, type CompositionEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listEditions } from '../api/editionApi'
import { getNews, listCategories, listKeywords } from '../api/personalizationApi'
import { Btn } from '../components/common/Btn'
import { NewsListRow } from '../components/news/NewsListRow'
import { NewsListSkeleton } from '../components/common/Skeletons'
import { PageShell } from '../components/layout/PageShell'
import type { Importance } from '../types/post'
import {
  newsListSearchParams,
  readNewsListParams,
  type NewsKind,
  type NewsListParams,
} from '../utils/newsListState'
import {
  keywordsForEdition,
  rankNewsCategories,
  rankNewsKeywords,
  visibleNewsCategories,
} from '../utils/newsTaxonomy'

const IMPORTANCE_FILTERS: { value: '' | Exclude<Importance, 'unknown'>; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'high', label: '높음' },
  { value: 'medium', label: '보통' },
  { value: 'low', label: '낮음' },
]

const CONTENT_KIND_FILTERS: { value: NewsKind | ''; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'news', label: '뉴스' },
  { value: 'discovery', label: '탐문' },
  { value: 'community', label: '커뮤니티' },
]

const PAGE_SIZE = 20
const KEYWORD_PREVIEW_LIMIT = 4

export function NewsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const fromUrl = readNewsListParams(searchParams)
  const [queryDraft, setQueryDraft] = useState(fromUrl.q)
  const [query, setQuery] = useState(fromUrl.q)
  const [category, setCategory] = useState(fromUrl.category)
  const [keywordId, setKeywordId] = useState(fromUrl.kw)
  const [importance, setImportance] = useState<NewsListParams['importance']>(fromUrl.importance)
  const [contentKind, setContentKind] = useState<NewsKind | ''>(fromUrl.kind)
  const [editionId, setEditionId] = useState(fromUrl.edition)
  const [showAllKeywords, setShowAllKeywords] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(Boolean(fromUrl.category || fromUrl.importance))
  const [page, setPage] = useState(1)
  const isComposingRef = useRef(false)

  const persist = (patch: Partial<NewsListParams>) => {
    const next = newsListSearchParams({
      q: patch.q ?? query,
      kind: patch.kind ?? contentKind,
      edition: patch.edition ?? editionId,
      category: patch.category ?? category,
      kw: patch.kw ?? keywordId,
      importance: patch.importance ?? importance,
    })
    if (next.toString() === searchParams.toString()) return
    setSearchParams(next, { replace: true })
  }
  const persistRef = useRef(persist)
  persistRef.current = persist

  useEffect(() => {
    const next = readNewsListParams(searchParams)
    setQueryDraft((prev) => (prev === next.q ? prev : next.q))
    setQuery((prev) => (prev === next.q ? prev : next.q))
    setContentKind((prev) => (prev === next.kind ? prev : next.kind))
    setCategory((prev) => (prev === next.category ? prev : next.category))
    setKeywordId((prev) => (prev === next.kw ? prev : next.kw))
    setImportance((prev) => (prev === next.importance ? prev : next.importance))
    setEditionId((prev) => (prev === next.edition ? prev : next.edition))
  }, [searchParams])

  const editionsQuery = useQuery({
    queryKey: ['editions', 'active'],
    queryFn: () => listEditions(true),
  })
  const editions = editionsQuery.data ?? []

  useEffect(() => {
    if (!editions.length) return
    if (editionId && editions.some((item) => item.id === editionId)) return
    const fallback = editions[0].id
    const invalid = Boolean(editionId)
    setEditionId(fallback)
    persistRef.current(
      invalid
        ? { edition: fallback, category: '', kw: '' }
        : { edition: fallback },
    )
    if (invalid) {
      setCategory('')
      setKeywordId('')
    }
  }, [editions, editionId])

  const categories = useQuery({ queryKey: ['categories'], queryFn: listCategories })
  const keywords = useQuery({ queryKey: ['keywords'], queryFn: () => listKeywords() })
  const news = useQuery({
    queryKey: ['news', query, category, keywordId, importance, contentKind, page],
    queryFn: () =>
      getNews({
        q: query || undefined,
        category: category || undefined,
        keyword_ids: keywordId ? [keywordId] : undefined,
        importance: importance || undefined,
        content_kind: contentKind || undefined,
        page,
        size: PAGE_SIZE,
      }),
  })

  useEffect(() => {
    if (isComposingRef.current) return
    const timer = window.setTimeout(() => {
      const nextQuery = queryDraft.trim()
      setQuery(nextQuery)
      setPage(1)
      persistRef.current({ q: nextQuery })
    }, 300)
    return () => window.clearTimeout(timer)
  }, [queryDraft])

  const editionCategories = useMemo(
    () => rankNewsCategories(visibleNewsCategories(categories.data ?? [], editionId)),
    [categories.data, editionId],
  )
  const curatedCategories = editionCategories.filter((item) => !item.is_discovered)
  const discoveredCategories = editionCategories.filter((item) => item.is_discovered)

  const editionKeywords = useMemo(
    () => rankNewsKeywords(keywordsForEdition(keywords.data ?? [], editionId)),
    [keywords.data, editionId],
  )
  const keywordOverflow = editionKeywords.length > KEYWORD_PREVIEW_LIMIT
  const visibleKeywords = useMemo(() => {
    if (showAllKeywords || !keywordOverflow) return editionKeywords
    const preview = editionKeywords.slice(0, KEYWORD_PREVIEW_LIMIT)
    if (!keywordId) return preview
    if (preview.some((item) => item.id === keywordId)) return preview
    const active = editionKeywords.find((item) => item.id === keywordId)
    return active ? [...preview.slice(0, KEYWORD_PREVIEW_LIMIT - 1), active] : preview
  }, [showAllKeywords, keywordOverflow, editionKeywords, keywordId])

  const extraFiltersOn = Boolean(category || importance)
  const anyFilterOn = Boolean(category || keywordId || importance || contentKind || query)

  const resetFilters = () => {
    const keepEdition = editionId
    setQueryDraft('')
    setQuery('')
    setCategory('')
    setKeywordId('')
    setImportance('')
    setContentKind('')
    setShowAllKeywords(false)
    setFiltersOpen(false)
    setPage(1)
    persistRef.current({
      q: '',
      kind: '',
      edition: keepEdition,
      category: '',
      kw: '',
      importance: '',
    })
  }

  const filterSummary = [
    category || null,
    importance === 'high' ? '높음' : importance === 'medium' ? '보통' : importance === 'low' ? '낮음' : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <PageShell
      section="전체 뉴스"
      title="뉴스"
      lead="지금 보는 지면의 뉴스·탐문·커뮤니티를 구분·탐색합니다."
      actions={
        anyFilterOn ? (
          <Btn variant="outline" size="sm" onClick={resetFilters}>
            필터 초기화
          </Btn>
        ) : undefined
      }
    >
      <div className="news-toolbar">
        {editions.length > 1 && (
          <div className="news-segment" role="tablist" aria-label="지면">
            {editions.map((edition) => (
              <button
                key={edition.id}
                type="button"
                role="tab"
                aria-selected={editionId === edition.id}
                className={`news-segment-tab${editionId === edition.id ? ' active' : ''}`}
                onClick={() => {
                  setEditionId(edition.id)
                  setCategory('')
                  setKeywordId('')
                  setShowAllKeywords(false)
                  setPage(1)
                  persist({ edition: edition.id, category: '', kw: '' })
                }}
              >
                {edition.name}
              </button>
            ))}
          </div>
        )}

        <div className="news-segment" role="tablist" aria-label="출처">
          {CONTENT_KIND_FILTERS.map((item) => (
            <button
              key={item.label}
              type="button"
              role="tab"
              aria-selected={contentKind === item.value}
              className={`news-segment-tab${contentKind === item.value ? ' active' : ''}`}
              onClick={() => {
                setContentKind(item.value)
                setPage(1)
                persist({ kind: item.value })
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        <input
          className="input news-toolbar-search"
          type="search"
          value={queryDraft}
          onChange={(e) => setQueryDraft(e.target.value)}
          onCompositionStart={() => {
            isComposingRef.current = true
          }}
          onCompositionEnd={(e: CompositionEvent<HTMLInputElement>) => {
            isComposingRef.current = false
            setQueryDraft(e.currentTarget.value)
          }}
          placeholder="제목과 요약 검색"
        />

        <button
          type="button"
          className={`news-filter-toggle${extraFiltersOn || filtersOpen ? ' active' : ''}`}
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((open) => !open)}
        >
          필터{filterSummary ? ` · ${filterSummary}` : ''}
        </button>
      </div>

      {filtersOpen && (
        <div className="news-filter-panel">
          <div className="news-filter-row">
            <span className="news-filter-label">분류</span>
            <button
              type="button"
              className={`news-chip ${!category ? 'active' : ''}`}
              onClick={() => {
                setCategory('')
                setPage(1)
                persist({ category: '' })
              }}
            >
              전체
            </button>
            {curatedCategories.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`news-chip ${category === item.name ? 'active' : ''}`}
                onClick={() => {
                  setCategory(item.name)
                  setPage(1)
                  persist({ category: item.name })
                }}
              >
                {item.name}
              </button>
            ))}
          </div>
          {discoveredCategories.length > 0 && (
            <div className="news-filter-row">
              <span className="news-filter-label">발견</span>
              {discoveredCategories.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`news-chip news-chip-discovered ${category === item.name ? 'active' : ''}`}
                  onClick={() => {
                    setCategory(item.name)
                    setPage(1)
                    persist({ category: item.name })
                  }}
                >
                  {item.name}
                </button>
              ))}
            </div>
          )}
          <div className="news-filter-row">
            <span className="news-filter-label">중요도</span>
            {IMPORTANCE_FILTERS.map((item) => (
              <button
                key={item.label}
                type="button"
                className={`news-chip ${importance === item.value ? 'active' : ''}`}
                onClick={() => {
                  setImportance(item.value)
                  setPage(1)
                  persist({ importance: item.value })
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="news-filter-row news-keyword-row">
        <span className="news-filter-label">키워드</span>
        <button
          type="button"
          className={`news-chip ${!keywordId ? 'active' : ''}`}
          onClick={() => {
            setKeywordId('')
            setPage(1)
            persist({ kw: '' })
          }}
        >
          전체
        </button>
        {visibleKeywords.map((keyword) => (
          <button
            key={keyword.id}
            type="button"
            className={`news-chip ${keywordId === keyword.id ? 'active' : ''}`}
            onClick={() => {
              setKeywordId(keyword.id)
              setPage(1)
              persist({ kw: keyword.id })
            }}
          >
            {keyword.name}
            {keyword.status === 'candidate' ? ' · 신규' : ''}
          </button>
        ))}
        {keywordOverflow && (
          <button
            type="button"
            className="news-chip-toggle"
            onClick={() => setShowAllKeywords((v) => !v)}
          >
            {showAllKeywords
              ? '접기'
              : `더보기 (+${editionKeywords.length - KEYWORD_PREVIEW_LIMIT})`}
          </button>
        )}
      </div>

      <div className="personal-news-list">
        <header>
          <h2>뉴스 목록</h2>
          <span>{news.data?.total ?? 0}건</span>
        </header>

        {news.isLoading && <NewsListSkeleton />}

        {!news.isLoading &&
          news.data?.items.map((post) => (
            <NewsListRow key={post.id} post={post} highlightQuery />
          ))}

        {!news.isLoading && !news.data?.items.length && (
          <div className="personal-empty">
            <p>조건에 맞는 뉴스가 없습니다.</p>
            {anyFilterOn && (
              <div className="personal-empty-actions">
                <button type="button" className="np-read-more" onClick={resetFilters}>
                  필터 초기화 →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {(news.data?.pages ?? 1) > 1 && (
        <div className="news-pagination">
          <Btn
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            이전
          </Btn>
          <span>
            {page} / {news.data?.pages ?? 1}
          </span>
          <Btn
            variant="outline"
            size="sm"
            disabled={page >= (news.data?.pages ?? 1)}
            onClick={() => setPage((p) => p + 1)}
          >
            다음
          </Btn>
        </div>
      )}
    </PageShell>
  )
}
