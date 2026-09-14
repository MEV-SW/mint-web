import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listIssues, updateIssueTracking } from '../api/issueApi'
import { PageShell } from '../components/layout/PageShell'
import { useToast } from '../components/common/Toast'
import { apiErrorDetail } from '../utils/apiError'
import { formatDateTime } from '../utils/date'
import {
  ISSUE_CHANGE_STATE_LABELS,
  ISSUE_LIST_FILTERS,
  type IssueListFilter,
} from '../types/issue'

const EMPTY_COPY: Record<IssueListFilter, { title: string; body: string }> = {
  all: { title: '아직 묶인 사건이 없습니다', body: '크롤·배정이 도는 중일 수 있습니다.' },
  tracked: {
    title: '추적 중인 사건이 없습니다',
    body: '목록에서 별표로 추적을 켜세요.',
  },
  changed: {
    title: '마지막 확인 이후 변화가 없습니다',
    body: '추적 중인 사건에 새 보도나 정정이 들어오면 여기에 모입니다.',
  },
}

export function IssuesPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const qc = useQueryClient()
  const [filter, setFilter] = useState<IssueListFilter>('all')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['issues', filter],
    queryFn: () => listIssues({ filter }),
  })

  const toggleTracking = useMutation({
    mutationFn: ({ id, tracking }: { id: string; tracking: boolean }) =>
      updateIssueTracking(id, tracking),
    onMutate: async ({ id, tracking }) => {
      await qc.cancelQueries({ queryKey: ['issues', filter] })
      const previous = qc.getQueryData(['issues', filter])
      qc.setQueryData(['issues', filter], (current: typeof data) =>
        current
          ? {
              ...current,
              items: current.items.map((item) =>
                item.id === id ? { ...item, tracking } : item,
              ),
            }
          : current,
      )
      return { previous }
    },
    onError: (e, _vars, context) => {
      if (context?.previous) qc.setQueryData(['issues', filter], context.previous)
      toast(apiErrorDetail(e) || '추적 상태 변경 실패', 'err')
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['issues'] }),
  })

  const copy = EMPTY_COPY[filter]

  return (
    <PageShell section="이슈 레이더" title="이슈" lead="여러 기사에 흩어진 같은 사건을 하나로 묶어 탐색합니다.">
      <div className="news-segment" role="tablist" aria-label="필터">
        {ISSUE_LIST_FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={filter === item.value}
            className={`news-segment-tab${filter === item.value ? ' active' : ''}`}
            onClick={() => setFilter(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {isLoading && <div className="sources-empty-cell">불러오는 중…</div>}

      {isError && (
        <div className="card card-pad" style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: 12 }}>목록을 불러오지 못했습니다.</p>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => qc.invalidateQueries({ queryKey: ['issues', filter] })}
          >
            다시 시도
          </button>
        </div>
      )}

      {!isLoading && !isError && data?.items.length === 0 && (
        <div className="card card-pad" style={{ textAlign: 'center' }}>
          <strong style={{ display: 'block', marginBottom: 6 }}>{copy.title}</strong>
          <p style={{ color: 'var(--ink2, #666)', margin: 0 }}>{copy.body}</p>
        </div>
      )}

      {!isLoading &&
        !isError &&
        data?.items.map((issue) => (
          <article
            key={issue.id}
            className="card card-pad"
            style={{ marginBottom: 10, cursor: 'pointer' }}
            onClick={() => navigate(`/issues/${issue.id}`)}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span
                role="button"
                aria-label={issue.tracking ? '추적 해제' : '추적'}
                onClick={(e) => {
                  e.stopPropagation()
                  toggleTracking.mutate({ id: issue.id, tracking: !issue.tracking })
                }}
                style={{
                  cursor: 'pointer',
                  fontSize: 18,
                  color: issue.tracking ? 'var(--pine, #1b5540)' : 'var(--ink3, #ccc)',
                  flex: 'none',
                }}
              >
                {issue.tracking ? '★' : '☆'}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <strong>{issue.title}</strong>
                  <span className="pill">{ISSUE_CHANGE_STATE_LABELS[issue.change_state]}</span>
                  {issue.has_unseen_change && <span className="pill">변화 있음</span>}
                </div>
                <p style={{ margin: '0 0 6px', color: 'var(--ink2, #666)' }}>{issue.summary}</p>
                <div style={{ fontSize: 12, color: 'var(--ink3, #999)' }}>
                  기사 {issue.member_count} · 출처 {issue.source_count} · 마지막 변화{' '}
                  {formatDateTime(issue.last_activity_at)}
                </div>
              </div>
            </div>
          </article>
        ))}
    </PageShell>
  )
}
