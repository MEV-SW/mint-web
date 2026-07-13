import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState, type CompositionEvent } from 'react'
import { Link } from 'react-router-dom'
import { getNews, listCategories, listKeywords } from '../api/personalizationApi'
import { ImportanceBadge } from '../components/common/Badges'
import { Btn } from '../components/common/Btn'
import { PageShell } from '../components/layout/PageShell'
import type { Importance } from '../types/post'
import { formatDate } from '../utils/date'
import { SearchHighlight } from '../components/common/SearchHighlight'
import { groupKeywords } from '../utils/groupKeywords'

const IMPORTANCE_FILTERS: { value: '' | Importance; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'high', label: '높음' },
  { value: 'medium', label: '보통' },
  { value: 'low', label: '낮음' },
]

const CONTENT_KIND_FILTERS: { value: '' | 'news' | 'community'; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'news', label: '뉴스' },
  { value: 'community', label: '커뮤니티' },
]

function contentKindLabel(post: {
  is_community?: boolean
  board_type?: string | null
}): string {
  if (post.is_community) return '커뮤니티'
  if (post.board_type === 'discovery') return '탐문'
  return '뉴스'
}

const PAGE_SIZE = 20
/** Collapsed chip counts before “전체보기”. */
const CATEGORY_PREVIEW_LIMIT = 6
const KEYWORD_PREVIEW_LIMIT = 8

function rankCategoriesForPreview(items: Awaited<ReturnType<typeof listCategories>>) {
  return [...items].sort((a, b) => {
    const aFeatured = a.is_featured ? 0 : 1
    const bFeatured = b.is_featured ? 0 : 1
    if (aFeatured !== bFeatured) return aFeatured - bFeatured
    const aDiscovered = a.is_discovered ? 1 : 0
    const bDiscovered = b.is_discovered ? 1 : 0
    if (aDiscovered !== bDiscovered) return aDiscovered - bDiscovered
    const posts = (b.post_count ?? 0) - (a.post_count ?? 0)
    if (posts !== 0) return posts
    return a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'ko')
  })
}

function rankKeywordsForPreview(
  items: Awaited<ReturnType<typeof listKeywords>>,
  featuredCategoryIds: Set<string>,
) {
  return [...items].sort((a, b) => {
    const aCurated = a.is_curated ? 0 : 1
    const bCurated = b.is_curated ? 0 : 1
    if (aCurated !== bCurated) return aCurated - bCurated
    const aFeatured = a.category_id && featuredCategoryIds.has(a.category_id) ? 0 : 1
    const bFeatured = b.category_id && featuredCategoryIds.has(b.category_id) ? 0 : 1
    if (aFeatured !== bFeatured) return aFeatured - bFeatured
    return a.name.localeCompare(b.name, 'ko')
  })
}

export function NewsPage() {
  const [queryDraft, setQueryDraft] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [keywordId, setKeywordId] = useState('')
  const [importance, setImportance] = useState<'' | Importance>('')
  const [contentKind, setContentKind] = useState<'' | 'news' | 'community'>('')
  const [showAllCategories, setShowAllCategories] = useState(false)
  const [showAllKeywords, setShowAllKeywords] = useState(false)
  const [page, setPage] = useState(1)
  const isComposingRef = useRef(false)

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
      setQuery(queryDraft.trim())
      setPage(1)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [queryDraft])

  const allCategories = categories.data ?? []
  const rankedCategories = useMemo(
    () => rankCategoriesForPreview(allCategories),
    [allCategories],
  )
  const categoryOverflow = rankedCategories.length > CATEGORY_PREVIEW_LIMIT
  const visibleCategories = useMemo(() => {
    if (showAllCategories || !categoryOverflow) return rankedCategories
    const preview = rankedCategories.slice(0, CATEGORY_PREVIEW_LIMIT)
    if (!category) return preview
    if (preview.some((c) => c.name === category)) return preview
    const active = rankedCategories.find((c) => c.name === category)
    return active ? [...preview.slice(0, CATEGORY_PREVIEW_LIMIT - 1), active] : preview
  }, [showAllCategories, categoryOverflow, rankedCategories, category])

  const allKeywords = keywords.data ?? []
  const featuredCategoryIds = useMemo(
    () => new Set(allCategories.filter((c) => c.is_featured).map((c) => c.id)),
    [allCategories],
  )
  const rankedKeywords = useMemo(
    () => rankKeywordsForPreview(allKeywords, featuredCategoryIds),
    [allKeywords, featuredCategoryIds],
  )
  const keywordOverflow = rankedKeywords.length > KEYWORD_PREVIEW_LIMIT
  const visibleKeywords = useMemo(() => {
    if (showAllKeywords || !keywordOverflow) return rankedKeywords
    const preview = rankedKeywords.slice(0, KEYWORD_PREVIEW_LIMIT)
    if (!keywordId) return preview
    if (preview.some((k) => k.id === keywordId)) return preview
    const active = rankedKeywords.find((k) => k.id === keywordId)
    return active ? [...preview.slice(0, KEYWORD_PREVIEW_LIMIT - 1), active] : preview
  }, [showAllKeywords, keywordOverflow, rankedKeywords, keywordId])
  const keywordGroups = useMemo(
    () => groupKeywords(visibleKeywords, allCategories),
    [visibleKeywords, allCategories],
  )
  const showGroupedKeywords = showAllKeywords && rankedKeywords.length > KEYWORD_PREVIEW_LIMIT

  const resetFilters = () => {
    setQueryDraft('')
    setQuery('')
    setCategory('')
    setKeywordId('')
    setImportance('')
    setContentKind('')
    setShowAllCategories(false)
    setShowAllKeywords(false)
    setPage(1)
  }

  return (
    <PageShell
      section="전체 뉴스"
      title="뉴스"
      lead="EV·충전 관련 뉴스·커뮤니티를 구분·탐색합니다."
      actions={
        category || keywordId || importance || contentKind || query ? (
          <Btn variant="outline" size="sm" onClick={resetFilters}>
            필터 초기화
          </Btn>
        ) : undefined
      }
    >
      <div className="news-filter-row">
        <span className="news-filter-label">출처</span>
        {CONTENT_KIND_FILTERS.map((item) => (
          <button
            key={item.label}
            type="button"
            className={`news-chip ${contentKind === item.value ? 'active' : ''}`}
            onClick={() => {
              setContentKind(item.value)
              setPage(1)
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="news-filter-row">
        <span className="news-filter-label">분류</span>
        <button
          type="button"
          className={`news-chip ${!category ? 'active' : ''}`}
          onClick={() => {
            setCategory('')
            setPage(1)
          }}
        >
          전체
        </button>
        {visibleCategories.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`news-chip ${category === item.name ? 'active' : ''}`}
            onClick={() => {
              setCategory(item.name)
              setPage(1)
            }}
          >
            {item.name}
          </button>
        ))}
        {categoryOverflow && (
          <button
            type="button"
            className="news-chip-toggle"
            onClick={() => setShowAllCategories((v) => !v)}
          >
            {showAllCategories
              ? '접기'
              : `전체보기 (+${rankedCategories.length - CATEGORY_PREVIEW_LIMIT})`}
          </button>
        )}
      </div>

      {showGroupedKeywords ? (
        <>
          <div className="news-filter-row">
            <span className="news-filter-label">키워드</span>
            <button
              type="button"
              className={`news-chip ${!keywordId ? 'active' : ''}`}
              onClick={() => {
                setKeywordId('')
                setPage(1)
              }}
            >
              전체
            </button>
            <button
              type="button"
              className="news-chip-toggle"
              onClick={() => setShowAllKeywords(false)}
            >
              접기
            </button>
          </div>
          {keywordGroups.map((group) => (
            <div key={group.id} className="news-filter-row news-filter-row-grouped">
              <span className="news-filter-label">{group.name}</span>
              {group.keywords.map((keyword) => (
                <button
                  key={keyword.id}
                  type="button"
                  className={`news-chip ${keywordId === keyword.id ? 'active' : ''}`}
                  onClick={() => {
                    setKeywordId(keyword.id)
                    setPage(1)
                  }}
                >
                  {keyword.name}
                  {keyword.status === 'candidate' ? ' · 신규' : ''}
                </button>
              ))}
            </div>
          ))}
        </>
      ) : (
        <div className="news-filter-row">
          <span className="news-filter-label">키워드</span>
          <button
            type="button"
            className={`news-chip ${!keywordId ? 'active' : ''}`}
            onClick={() => {
              setKeywordId('')
              setPage(1)
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
                : `전체보기 (+${rankedKeywords.length - KEYWORD_PREVIEW_LIMIT})`}
            </button>
          )}
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
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="news-tools" style={{ marginBottom: 20 }}>
        <input
          className="input"
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
      </div>

      <div className="personal-news-list">
        <header>
          <h2>뉴스 목록</h2>
          <span>{news.data?.total ?? 0}건</span>
        </header>

        {news.data?.items.map((post) => (
          <Link key={post.id} to={`/posts/${post.id}`} className="personal-news-row">
            <div>
              <div className="personal-news-tags">
                <span
                  className={
                    post.is_community
                      ? 'news-kind-badge news-kind-community'
                      : post.board_type === 'discovery'
                        ? 'news-kind-badge news-kind-discovery'
                        : 'news-kind-badge news-kind-news'
                  }
                >
                  {contentKindLabel(post)}
                </span>
                {post.category && <span>{post.category}</span>}
                {post.matched_keywords.map((item) => (
                  <span key={item.id}>{item.name}</span>
                ))}
                {!post.category && !post.matched_keywords.length && (
                  <span>미분류</span>
                )}
              </div>
              <h3>{post.title}</h3>
              {(post.summary_highlight || post.summary) && (
                <p>
                  <SearchHighlight html={post.summary_highlight} fallback={post.summary} />
                </p>
              )}
              <small>
                {post.source_name ?? '출처 정보 없음'} · {formatDate(post.collected_at)}
              </small>
            </div>
            <ImportanceBadge level={post.importance} />
          </Link>
        ))}

        {!news.isLoading && !news.data?.items.length && (
          <div className="personal-empty">조건에 맞는 뉴스가 없습니다.</div>
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
