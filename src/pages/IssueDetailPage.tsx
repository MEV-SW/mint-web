import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { getIssue, markIssueSeen, updateIssueTracking } from '../api/issueApi'
import { ChangeTimeline } from '../components/issues/ChangeTimeline'
import { Icon } from '../components/common/Icon'
import { NewBadge } from '../components/common/Badges'
import { useToast } from '../components/common/Toast'
import { apiErrorDetail } from '../utils/apiError'
import { formatDateTime } from '../utils/date'

export function IssueDetailPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const toast = useToast()
  const qc = useQueryClient()

  const { data: issue, isLoading, isError } = useQuery({
    queryKey: ['issue', id],
    queryFn: () => getIssue(id!),
    enabled: !!id,
    retry: false,
  })

  useEffect(() => {
    if (!id || !issue) return
    markIssueSeen(id).catch(() => {
      /* best-effort — a failed seen ping shouldn't block reading the issue */
    })
    // 이 이슈에 진입한 시점에 딱 한 번만 호출한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const toggleTracking = useMutation({
    mutationFn: (tracking: boolean) => updateIssueTracking(id!, tracking),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['issue', id] }),
    onError: (e) => toast(apiErrorDetail(e) || '추적 상태 변경 실패', 'err'),
  })

  const backTo = (location.state as { from?: string } | null)?.from ?? '/issues'

  if (isLoading) {
    return <div className="content-inner np-sheet">로딩 중…</div>
  }

  if (isError || !issue) {
    return (
      <div className="content-inner page-fade np-sheet">
        <Link to={backTo} className="back-link">
          <Icon name="chevL" style={{ width: 14, height: 14 }} /> 이슈 목록
        </Link>
        <div className="card card-pad" style={{ marginTop: 16, textAlign: 'center' }}>
          이 사건을 찾을 수 없습니다.
        </div>
      </div>
    )
  }

  return (
    <div className="content-inner page-fade np-sheet post-detail-page">
      <Link to={backTo} className="back-link">
        <Icon name="chevL" style={{ width: 14, height: 14 }} /> 이슈 목록
      </Link>

      <article className="pg-article-hero">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h1 className="pg-article-title" style={{ margin: 0 }}>{issue.title}</h1>
          {issue.has_unseen_change && <NewBadge />}
        </div>
        <div className="pg-article-meta">
          <span>기사 {issue.member_count} · 출처 {issue.source_count}</span>
          <span>
            {formatDateTime(issue.first_seen_at)} ~ {formatDateTime(issue.last_activity_at)}
          </span>
        </div>
        <div className="detail-actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => toggleTracking.mutate(!issue.tracking)}
            disabled={toggleTracking.isPending}
          >
            {issue.tracking ? '★ 추적 중' : '☆ 추적하기'}
          </button>
        </div>
      </article>

      <section className="card card-pad" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 14, margin: '0 0 8px' }}>AI 요약</h2>
        <p style={{ margin: 0 }}>
          {issue.summary || '요약이 아직 없습니다.'}
          {issue.summary_confidence && (
            <span className="pill" style={{ marginLeft: 8 }}>
              신뢰도 {issue.summary_confidence}
            </span>
          )}
        </p>
      </section>

      <section className="card card-pad" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 14, margin: '0 0 8px' }}>근거 기사</h2>
        {issue.members.length === 0 && <p style={{ margin: 0 }}>구성 기사가 없습니다.</p>}
        {issue.members.map((member) => (
          <div
            key={member.post_id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 0',
              borderBottom: '1px solid var(--line2, #eee)',
            }}
          >
            <span style={{ flex: 'none', color: 'var(--ink3, #999)', fontSize: 12 }}>
              {member.source_name}
            </span>
            {member.original_url ? (
              <a href={member.original_url} target="_blank" rel="noreferrer" style={{ flex: 1 }}>
                {member.title}
              </a>
            ) : (
              <span style={{ flex: 1 }}>{member.title}</span>
            )}
            {member.unverified && <span className="pill">미검증</span>}
            <span style={{ flex: 'none', fontSize: 12, color: 'var(--ink3, #999)' }}>
              {formatDateTime(member.published_at)}
            </span>
          </div>
        ))}
      </section>

      <section className="card card-pad">
        <h2 style={{ fontSize: 14, margin: '0 0 8px' }}>변화 타임라인</h2>
        <ChangeTimeline issueId={issue.id} lastSeenAt={issue.last_seen_at} />
      </section>
    </div>
  )
}
