import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type CompositionEvent } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  approvePost,
  deletePost,
  hidePost,
  listPosts,
  promotePost,
  summarizePost,
} from '../api/postApi'
import { fetchDashboardStats } from '../api/statsApi'
import { ImportanceBadge } from '../components/common/Badges'
import { Btn } from '../components/common/Btn'
import { Icon } from '../components/common/Icon'
import { PageShell } from '../components/layout/PageShell'
import { useToast } from '../components/common/Toast'
import type { BoardType, Importance, PostStatus } from '../types/post'
import {
  boardListPath,
  boardScrollKey,
  patchBoardListParams,
  readBoardListParams,
} from '../utils/boardListState'
import { formatDateTime } from '../utils/date'
import { DISCOVERY_BOARD_LABEL, TRUSTED_BOARD_LABEL } from '../constants/boardLabels'
import { cx } from '../utils/cx'

const IMPORTANCE_FILTERS = [
  { value: 'all', label: '전체', tone: null },
  { value: 'high', label: '높음', tone: 'high' },
  { value: 'medium', label: '보통', tone: 'med' },
  { value: 'low', label: '낮음', tone: 'low' },
] as const

interface BoardPageProps {
  boardType: BoardType
}

export function BoardPage({ boardType }: BoardPageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const toast = useToast()
  const qc = useQueryClient()
  const { page, keyword, importance, status } = readBoardListParams(searchParams)
  const listPath = boardListPath(location.pathname, searchParams)
  const isDiscovery = boardType === 'discovery'
  const discoverySection: 'pending' | 'published' =
    isDiscovery && status === 'published' ? 'published' : 'pending'
  const listStatus = isDiscovery
    ? discoverySection
    : status !== 'all'
      ? (status as PostStatus)
      : undefined

  const patchParams = (patch: Parameters<typeof patchBoardListParams>[1]) => {
    setSearchParams((prev) => patchBoardListParams(prev, patch), { replace: true })
  }

  const [keywordDraft, setKeywordDraft] = useState(keyword)
  const isComposingRef = useRef(false)

  useEffect(() => {
    if (!isComposingRef.current) {
      setKeywordDraft(keyword)
    }
  }, [keyword])

  useEffect(() => {
    if (isComposingRef.current || keywordDraft === keyword) return
    const timer = window.setTimeout(() => {
      patchParams({ keyword: keywordDraft, page: 1 })
    }, 300)
    return () => window.clearTimeout(timer)
  }, [keywordDraft, keyword])

  const commitKeyword = (value: string) => {
    setKeywordDraft(value)
    patchParams({ keyword: value, page: 1 })
  }

  const handleKeywordChange = (e: ChangeEvent<HTMLInputElement>) => {
    setKeywordDraft(e.target.value)
  }

  const handleKeywordCompositionStart = () => {
    isComposingRef.current = true
  }

  const handleKeywordCompositionEnd = (e: CompositionEvent<HTMLInputElement>) => {
    isComposingRef.current = false
    const value = e.currentTarget.value
    setKeywordDraft(value)
    patchParams({ keyword: value, page: 1 })
  }

  const goPost = (id: string) => {
    navigate(`/posts/${id}`, { state: { from: listPath } })
  }

  useLayoutEffect(() => {
    const key = boardScrollKey(listPath)
    const y = sessionStorage.getItem(key)
    if (y) requestAnimationFrame(() => window.scrollTo(0, Number(y)))
  }, [listPath])

  useEffect(() => {
    const key = boardScrollKey(listPath)
    return () => {
      sessionStorage.setItem(key, String(window.scrollY))
    }
  }, [listPath])

  const { data, isLoading } = useQuery({
    queryKey: ['posts', boardType, keyword, importance, listStatus, page],
    queryFn: () =>
      listPosts({
        board_type: boardType,
        keyword: keyword || undefined,
        importance: importance !== 'all' ? (importance as Importance) : undefined,
        status: listStatus,
        page,
        size: 10,
      }),
  })

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
    enabled: isDiscovery,
    staleTime: 60_000,
  })

  const { data: publishedMeta } = useQuery({
    queryKey: ['posts', 'discovery', 'published-meta', keyword, importance],
    queryFn: () =>
      listPosts({
        board_type: 'discovery',
        status: 'published',
        keyword: keyword || undefined,
        importance: importance !== 'all' ? (importance as Importance) : undefined,
        page: 1,
        size: 1,
      }),
    enabled: isDiscovery,
    staleTime: 30_000,
  })

  const pendingTotal =
    discoverySection === 'pending' ? (data?.total ?? 0) : (stats?.pending_discovery ?? 0)
  const publishedTotal =
    discoverySection === 'published' ? (data?.total ?? 0) : (publishedMeta?.total ?? 0)
  const retentionDays = stats?.discovery_pending_retention_days ?? 14

  useEffect(() => {
    if (data && data.pages > 0 && page > data.pages) {
      patchParams({ page: data.pages })
    }
  }, [data, page])

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['posts'] })
    qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
  }

  const action = useMutation({
    mutationFn: async ({
      id,
      type,
    }: {
      id: string
      type: 'approve' | 'hide' | 'delete' | 'promote' | 'summarize'
    }) => {
      if (type === 'approve') return approvePost(id)
      if (type === 'hide') return hidePost(id)
      if (type === 'delete') return deletePost(id)
      if (type === 'promote') return promotePost(id)
      return summarizePost(id)
    },
    onSuccess: (_, v) => {
      invalidate()
      toast(
        v.type === 'summarize' ? 'AI 요약을 생성했습니다.' : '처리되었습니다.',
        v.type === 'promote' ? 'info' : 'ok',
      )
    },
    onError: () => toast('요청에 실패했습니다.', 'err'),
  })

  return (
    <PageShell
      section={isDiscovery ? `게시판 · ${DISCOVERY_BOARD_LABEL}` : `게시판 · ${TRUSTED_BOARD_LABEL}`}
      title={isDiscovery ? DISCOVERY_BOARD_LABEL : `${TRUSTED_BOARD_LABEL} 게시판`}
      leadSingleLine
      lead={
        isDiscovery
          ? 'AI가 EV·충전 관련 기사를 발굴한 탐문 후보입니다. 검토 대기·검토됨 탭으로 구분해 확인하세요.'
          : '검증된 신뢰 소스에서 수집된 중요 게시글입니다. 원문 링크와 AI 요약만 표시됩니다.'
      }
    >
      <section className="board-search-panel" aria-label="게시글 검색">
        <div className="board-search-panel-inner">
          <div className="board-search-panel-row">
            <div className="board-search-panel-brand">
              <span className="board-search-panel-icon" aria-hidden>
                <Icon name="search" />
              </span>
              <span className="board-search-panel-title">기사 찾기</span>
            </div>

            <div className="board-search-panel-input-wrap">
              <input
                className="board-search-panel-input"
                type="search"
                placeholder="제목·요약 검색"
                value={keywordDraft}
                onChange={handleKeywordChange}
                onCompositionStart={handleKeywordCompositionStart}
                onCompositionEnd={handleKeywordCompositionEnd}
                aria-label="제목·요약 검색"
              />
              {keywordDraft && (
                <button
                  type="button"
                  className="board-search-panel-clear"
                  aria-label="검색어 지우기"
                  onClick={() => commitKeyword('')}
                >
                  <Icon name="x" />
                </button>
              )}
            </div>

            <div className="board-search-panel-filters" role="group" aria-label="중요도 필터">
              {IMPORTANCE_FILTERS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={cx(
                    'board-search-pill',
                    importance === opt.value && 'on',
                    opt.tone && `tone-${opt.tone}`,
                  )}
                  aria-pressed={importance === opt.value}
                  onClick={() => patchParams({ importance: opt.value, page: 1 })}
                >
                  {opt.tone && <span className="board-search-pill-dot" aria-hidden />}
                  {opt.label}
                </button>
              ))}
            </div>

            <span className="board-search-panel-badge">{data?.total ?? 0}건</span>
          </div>

          {keyword.trim() && (
            <p className="board-search-panel-hint">
              <Icon name="sparkles" />
              <span>
                「<strong>{keyword.trim()}</strong>」 검색 결과
              </span>
            </p>
          )}
        </div>
      </section>

      {isDiscovery && (
        <div className="board-discovery-tabs">
          <div className="seg board-discovery-seg" role="tablist" aria-label={`${DISCOVERY_BOARD_LABEL} 목록 구분`}>
            <button
              type="button"
              role="tab"
              aria-selected={discoverySection === 'pending'}
              className={discoverySection === 'pending' ? 'on' : undefined}
              onClick={() => patchParams({ status: 'pending', page: 1 })}
            >
              검토 대기
              <span className="board-tab-count">{pendingTotal}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={discoverySection === 'published'}
              className={discoverySection === 'published' ? 'on' : undefined}
              onClick={() => patchParams({ status: 'published', page: 1 })}
            >
              검토됨
              <span className="board-tab-count">{publishedTotal}</span>
            </button>
          </div>
          <p className="board-discovery-tab-hint np-copy-single">
            {discoverySection === 'pending'
              ? `아직 검토하지 않은 탐문 후보입니다. 검토되지 않은 기사는 ${retentionDays}일 후 삭제됩니다.`
              : '검토가 끝난 탐문 글입니다. 필요하면 중요 게시판으로 승격할 수 있습니다.'}
          </p>
        </div>
      )}

      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>제목</th>
              <th style={{ width: 120 }}>출처</th>
              <th style={{ width: 100 }}>중요도</th>
              <th style={{ width: 140 }}>수집일</th>
              <th style={{ width: isDiscovery ? 168 : 88 }} />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={isDiscovery ? 5 : 5}>로딩 중…</td>
              </tr>
            )}
            {!isLoading && data?.items.length === 0 && (
              <tr>
                <td colSpan={5} className="board-empty-cell">
                  {isDiscovery && discoverySection === 'pending'
                    ? '검토 대기 중인 탐문 후보가 없습니다.'
                    : isDiscovery
                      ? '검토된 탐문 글이 없습니다.'
                      : '게시글이 없습니다.'}
                </td>
              </tr>
            )}
            {data?.items.map((p) => (
              <tr key={p.id} onClick={() => goPost(p.id)} style={{ cursor: 'pointer' }}>
                <td>
                  <div className="post-title-cell">{p.title}</div>
                  {p.latest_ai?.summary && (
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 12.5,
                        color: 'var(--text-muted)',
                        lineHeight: 1.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {p.latest_ai.summary}
                    </div>
                  )}
                </td>
                <td>{p.source_name || '-'}</td>
                <td>
                  <ImportanceBadge level={p.importance} />
                </td>
                <td className="mono" style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                  {formatDateTime(p.collected_at)}
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div className="board-row-actions">
                    {isDiscovery && discoverySection === 'pending' && p.status === 'pending' && (
                      <Btn
                        variant="soft"
                        size="sm"
                        onClick={() => action.mutate({ id: p.id, type: 'approve' })}
                      >
                        검토 완료
                      </Btn>
                    )}
                    {isDiscovery && (
                      <Btn
                        variant="soft"
                        size="sm"
                        onClick={() => action.mutate({ id: p.id, type: 'promote' })}
                      >
                        승격
                      </Btn>
                    )}
                    <Btn
                      variant="outline"
                      size="sm"
                      icon="refresh"
                      onClick={() => action.mutate({ id: p.id, type: 'summarize' })}
                    />
                    <Btn
                      variant="outline"
                      size="sm"
                      icon="trash"
                      onClick={() => action.mutate({ id: p.id, type: 'delete' })}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.pages > 1 && (
        <div className="pager">
          <Btn
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => patchParams({ page: page - 1 })}
          >
            이전
          </Btn>
          <span>
            {page} / {data.pages}
          </span>
          <Btn
            variant="outline"
            size="sm"
            disabled={page >= data.pages}
            onClick={() => patchParams({ page: page + 1 })}
          >
            다음
          </Btn>
        </div>
      )}
    </PageShell>
  )
}
