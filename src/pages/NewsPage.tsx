import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState, type CompositionEvent } from 'react'
import { Link } from 'react-router-dom'
import { getNews, listCategories, listKeywords } from '../api/personalizationApi'
import { ImportanceBadge } from '../components/common/Badges'
import { Btn } from '../components/common/Btn'
import { PageShell } from '../components/layout/PageShell'
import type { Importance } from '../types/post'
import { formatDate } from '../utils/date'
import { SearchHighlight } from '../components/common/SearchHighlight'

const IMPORTANCE_FILTERS: { value: '' | Importance; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'high', label: '높음' },
  { value: 'medium', label: '보통' },
  { value: 'low', label: '낮음' },
]

const PAGE_SIZE = 20

export function NewsPage() {
  const [queryDraft, setQueryDraft] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [keywordId, setKeywordId] = useState('')
  const [importance, setImportance] = useState<'' | Importance>('')
  const [showAllKeywords, setShowAllKeywords] = useState(false)
  const [page, setPage] = useState(1)
  const isComposingRef = useRef(false)

  const categories = useQuery({ queryKey: ['categories'], queryFn: listCategories })
  const keywords = useQuery({ queryKey: ['keywords'], queryFn: listKeywords })
  const news = useQuery({
    queryKey: ['news', query, category, keywordId, importance, page],
    queryFn: () =>
      getNews({
        q: query || undefined,
        category: category || undefined,
        keyword_ids: keywordId ? [keywordId] : undefined,
        importance: importance || undefined,
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

  const selectedKeywords = (keywords.data ?? []).filter((item) => item.selected)
  const visibleKeywords = showAllKeywords
    ? (keywords.data ?? [])
    : selectedKeywords.length > 0
      ? selectedKeywords
      : (keywords.data ?? [])

  const resetFilters = () => {
    setQueryDraft('')
    setQuery('')
    setCategory('')
    setKeywordId('')
    setImportance('')
    setPage(1)
  }

  return (
    <PageShell
      section="전체 뉴스"
      title="뉴스"
      lead="수집된 뉴스를 대분류·키워드·중요도로 탐색합니다."
      actions={
        category || keywordId || importance || query ? (
          <Btn variant="outline" size="sm" onClick={resetFilters}>
            필터 초기화
          </Btn>
        ) : undefined
      }
    >
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
        {(categories.data ?? []).map((item) => (
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
      </div>

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
            {keyword.selected ? '★ ' : ''}
            {keyword.name}
          </button>
        ))}
        {(keywords.data?.length ?? 0) > selectedKeywords.length && (
          <button
            type="button"
            className="news-chip-toggle"
            onClick={() => setShowAllKeywords((v) => !v)}
          >
            {showAllKeywords ? '내 키워드만' : '전체 키워드'}
          </button>
        )}
      </div>

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
