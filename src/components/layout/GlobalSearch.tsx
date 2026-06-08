import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { globalSearch } from '../../api/searchApi'
import { Icon } from '../common/Icon'

function useDebounced(value: string, ms = 300): string {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}

export function GlobalSearch() {
  const navigate = useNavigate()
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const debounced = useDebounced(query, 280)
  const canSearch = debounced.trim().length >= 1

  const { data, isFetching, isError, error } = useQuery({
    queryKey: ['global-search', debounced],
    queryFn: () => globalSearch(debounced.trim()),
    enabled: canSearch && open,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const close = () => {
    setOpen(false)
    inputRef.current?.blur()
  }

  const goPost = (id: string) => {
    close()
    navigate(`/posts/${id}`)
  }

  const goSource = (name: string) => {
    close()
    navigate(`/sources?q=${encodeURIComponent(name)}`)
  }

  const goBoard = (board: 'trusted' | 'discovery') => {
    close()
    navigate(`/${board}?keyword=${encodeURIComponent(debounced.trim())}`)
  }

  const posts = data?.posts ?? []
  const sources = data?.sources ?? []
  const showLoading = canSearch && isFetching && posts.length === 0 && sources.length === 0
  const empty = canSearch && !isFetching && data && posts.length === 0 && sources.length === 0
  const errorDetail =
    (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? null

  return (
    <div className={`header-search global-search${open ? ' is-open' : ''}`} ref={rootRef}>
      <Icon name="search" />
      <input
        ref={inputRef}
        placeholder="게시글·소스 검색"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && canSearch && posts[0]) {
            e.preventDefault()
            goPost(posts[0].id)
          }
        }}
      />

      {open && query.trim().length > 0 && (
        <div className="global-search-dropdown" role="listbox">
          {query.trim().length < 1 && (
            <div className="global-search-hint">검색어를 입력하세요</div>
          )}

          {showLoading && <div className="global-search-hint">검색 중…</div>}
          {canSearch && isError && (
            <div className="global-search-hint global-search-error">
              검색에 실패했습니다{errorDetail ? ` — ${errorDetail}` : ''}
            </div>
          )}

          {empty && <div className="global-search-hint">검색 결과가 없습니다</div>}

          {canSearch && posts.length > 0 && (
            <div className="global-search-section">
              <div className="global-search-section-label">게시글</div>
              {posts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="global-search-item"
                  onClick={() => goPost(p.id)}
                >
                  <span className="global-search-item-title">{p.title}</span>
                  <span className="global-search-item-meta">
                    {p.board_type === 'trusted' ? '중요' : 'AI 발견'}
                    {p.source_name ? ` · ${p.source_name}` : ''}
                  </span>
                  {p.summary && <span className="global-search-item-snippet">{p.summary}</span>}
                </button>
              ))}
              <button type="button" className="global-search-more" onClick={() => goBoard('trusted')}>
                중요 게시판에서 더 보기
              </button>
              <button type="button" className="global-search-more" onClick={() => goBoard('discovery')}>
                AI 발견에서 더 보기
              </button>
            </div>
          )}

          {canSearch && sources.length > 0 && (
            <div className="global-search-section">
              <div className="global-search-section-label">소스</div>
              {sources.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="global-search-item"
                  onClick={() => goSource(s.name)}
                >
                  <span className="global-search-item-title">{s.name}</span>
                  <span className="global-search-item-meta">{s.url}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
