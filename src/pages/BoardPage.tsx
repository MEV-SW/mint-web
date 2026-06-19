import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useLayoutEffect } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  approvePost,
  deletePost,
  hidePost,
  listPosts,
  promotePost,
  summarizePost,
} from '../api/postApi'
import { ImportanceBadge, StatusPill } from '../components/common/Badges'
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

  const patchParams = (patch: Parameters<typeof patchBoardListParams>[1]) => {
    setSearchParams((prev) => patchBoardListParams(prev, patch), { replace: true })
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
    queryKey: ['posts', boardType, keyword, importance, status, page],
    queryFn: () =>
      listPosts({
        board_type: boardType,
        keyword: keyword || undefined,
        importance: importance !== 'all' ? (importance as Importance) : undefined,
        status: status !== 'all' ? (status as PostStatus) : undefined,
        page,
        size: 10,
      }),
  })

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
      section={isDiscovery ? '게시판 · AI 발견' : '게시판 · 중요'}
      title={isDiscovery ? 'AI 발견 게시판' : '중요 게시판'}
      lead={
        isDiscovery
          ? 'AI가 EV·충전 관련 기사를 발굴한 후보입니다. 원문 링크와 AI 요약만 표시됩니다.'
          : '검증된 신뢰 소스에서 수집된 중요 게시글입니다. 원문 링크와 AI 요약만 표시됩니다.'
      }
    >
      <div className="toolbar">
        <div className="search">
          <Icon name="search" />
          <input
            placeholder="제목·요약 검색"
            value={keyword}
            onChange={(e) => patchParams({ keyword: e.target.value, page: 1 })}
          />
        </div>
        <select
          className="input"
          style={{ width: 120 }}
          value={importance}
          onChange={(e) => patchParams({ importance: e.target.value, page: 1 })}
        >
          <option value="all">중요도 전체</option>
          <option value="high">높음</option>
          <option value="medium">보통</option>
          <option value="low">낮음</option>
        </select>
        {isDiscovery && (
          <select
            className="input"
            style={{ width: 120 }}
            value={status}
            onChange={(e) => patchParams({ status: e.target.value, page: 1 })}
          >
            <option value="all">상태 전체</option>
            <option value="pending">검토 대기</option>
            <option value="published">게시됨</option>
          </select>
        )}
        <div className="spacer" />
        <span className="result-count">{data?.total ?? 0}건</span>
      </div>

      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>제목</th>
              <th style={{ width: 120 }}>출처</th>
              <th style={{ width: 100 }}>중요도</th>
              <th style={{ width: 140 }}>수집일</th>
              {isDiscovery && <th style={{ width: 90 }}>상태</th>}
              <th style={{ width: isDiscovery ? 168 : 88 }} />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={isDiscovery ? 6 : 5}>로딩 중…</td>
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
                {isDiscovery && (
                  <td>
                    <StatusPill status={p.status} />
                  </td>
                )}
                <td onClick={(e) => e.stopPropagation()}>
                  <div className="board-row-actions">
                    {isDiscovery && p.status === 'pending' && (
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
