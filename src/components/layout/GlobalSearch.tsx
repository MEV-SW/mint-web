import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { globalSearch } from '../../api/searchApi'
import { Icon } from '../common/Icon'
import { DISCOVERY_BOARD_LABEL, TRUSTED_BOARD_LABEL } from '../../constants/boardLabels'
import { newsListPath } from '../../utils/newsListState'
import { usePermissions } from '../../hooks/usePermissions'
import { usePostLinkState } from '../../hooks/usePostLinkState'
import { SearchHighlight } from '../common/SearchHighlight'

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
  const postState = usePostLinkState()
  const { canEditAny } = usePermissions()
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  // #125: keyboard selection; resets to the first option whenever the debounced query changes.
  const [active, setActive] = useState<{ query: string; index: number }>({ query: '', index: 0 })
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
    navigate(`/posts/${id}`, { state: postState })
  }

  const goSource = (name: string) => {
    close()
    navigate(`/admin/sources?q=${encodeURIComponent(name)}`)
  }

  const goBoard = (board: 'trusted' | 'discovery') => {
    close()
    navigate(
      newsListPath({
        q: debounced.trim(),
        kind: board === 'discovery' ? 'discovery' : 'news',
      }),
    )
  }

  const posts = data?.posts ?? []
  const sources = canEditAny ? (data?.sources ?? []) : []
  const showLoading = canSearch && isFetching && posts.length === 0 && sources.length === 0
  const empty = canSearch && !isFetching && data && posts.length === 0 && sources.length === 0
  const errorDetail =
    (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? null

  // Every selectable row in display order: posts, the two "더 보기" links, then sources.
  type SearchOption =
    | { key: string; kind: 'post'; id: string }
    | { key: string; kind: 'more'; board: 'trusted' | 'discovery' }
    | { key: string; kind: 'source'; name: string }
  const options: SearchOption[] = canSearch
    ? [
        ...posts.map((p): SearchOption => ({ key: `post-${p.id}`, kind: 'post', id: p.id })),
        ...(posts.length > 0
          ? ([
              { key: 'more-trusted', kind: 'more', board: 'trusted' },
              { key: 'more-discovery', kind: 'more', board: 'discovery' },
            ] satisfies SearchOption[])
          : []),
        ...sources.map((s): SearchOption => ({ key: `source-${s.id}`, kind: 'source', name: s.name })),
      ]
    : []

  function selectOption(option: SearchOption) {
    if (option.kind === 'post') goPost(option.id)
    else if (option.kind === 'more') goBoard(option.board)
    else goSource(option.name)
  }
  const activeIndex =
    active.query === debounced && active.index < options.length ? active.index : 0
  const optionId = (index: number) => `global-search-opt-${index}`
  const dropdownVisible = open && query.trim().length > 0
  const indexOf = (key: string) => options.findIndex((option) => option.key === key)
  const optionProps = (key: string) => {
    const index = indexOf(key)
    return {
      id: optionId(index),
      role: 'option' as const,
      'aria-selected': index === activeIndex,
      onMouseEnter: () => setActive({ query: debounced, index }),
    }
  }

  function moveActive(step: number) {
    if (options.length === 0) return
    const next = (activeIndex + step + options.length) % options.length
    setActive({ query: debounced, index: next })
    requestAnimationFrame(() => document.getElementById(optionId(next))?.scrollIntoView({ block: 'nearest' }))
  }

  return (
    <div className={`header-search global-search${open ? ' is-open' : ''}`} ref={rootRef}>
      <Icon name="search" />
      <input
        ref={inputRef}
        placeholder="검색"
        value={query}
        role="combobox"
        aria-label="검색"
        aria-autocomplete="list"
        aria-expanded={dropdownVisible}
        aria-controls="global-search-listbox"
        aria-activedescendant={dropdownVisible && options.length > 0 ? optionId(activeIndex) : undefined}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            if (!open) setOpen(true)
            moveActive(e.key === 'ArrowDown' ? 1 : -1)
          } else if (e.key === 'Enter' && dropdownVisible && options[activeIndex]) {
            e.preventDefault()
            selectOption(options[activeIndex])
          } else if (e.key === 'Escape') {
            close()
          }
        }}
      />

      {dropdownVisible && (
        <div className="global-search-dropdown" role="listbox" id="global-search-listbox" aria-label="검색 결과">
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
                  tabIndex={-1}
                  className={`global-search-item${indexOf(`post-${p.id}`) === activeIndex ? ' is-active' : ''}`}
                  onClick={() => goPost(p.id)}
                  {...optionProps(`post-${p.id}`)}
                >
                  <span className="global-search-item-title">
                    <SearchHighlight html={p.title_highlight} fallback={p.title} />
                  </span>
                  <span className="global-search-item-meta">
                    {p.board_type === 'trusted' ? TRUSTED_BOARD_LABEL : DISCOVERY_BOARD_LABEL}
                    {p.source_name ? ` · ${p.source_name}` : ''}
                  </span>
                  {(p.summary_highlight || p.summary) && (
                    <SearchHighlight
                      html={p.summary_highlight}
                      fallback={p.summary}
                      className="global-search-item-snippet"
                    />
                  )}
                </button>
              ))}
              <button
                type="button"
                tabIndex={-1}
                className={`global-search-more${indexOf('more-trusted') === activeIndex ? ' is-active' : ''}`}
                onClick={() => goBoard('trusted')}
                {...optionProps('more-trusted')}
              >
                중요 게시판에서 더 보기
              </button>
              <button
                type="button"
                tabIndex={-1}
                className={`global-search-more${indexOf('more-discovery') === activeIndex ? ' is-active' : ''}`}
                onClick={() => goBoard('discovery')}
                {...optionProps('more-discovery')}
              >
                {DISCOVERY_BOARD_LABEL}에서 더 보기
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
                  tabIndex={-1}
                  className={`global-search-item${indexOf(`source-${s.id}`) === activeIndex ? ' is-active' : ''}`}
                  onClick={() => goSource(s.name)}
                  {...optionProps(`source-${s.id}`)}
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
