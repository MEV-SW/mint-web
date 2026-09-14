import { useQuery } from '@tanstack/react-query'
import { listIssueRevisions } from '../../api/issueApi'
import { ChangeKindBadge, FactTypeBadge, NewBadge } from '../common/Badges'
import { formatDateTime } from '../../utils/date'

const SKELETON_ROWS = 3

export function ChangeTimeline({ issueId, lastSeenAt }: { issueId: string; lastSeenAt: string | null }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['issue-revisions', issueId],
    queryFn: () => listIssueRevisions(issueId),
  })

  if (isLoading) {
    return (
      <div aria-busy="true" aria-label="변화 이력을 불러오는 중">
        {Array.from({ length: SKELETON_ROWS }, (_, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 0' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--line, #ddd)' }} />
            <div style={{ flex: 1 }}>
              <div style={{ height: 12, width: '60%', background: 'var(--line2, #eee)', marginBottom: 6 }} />
              <div style={{ height: 10, width: '40%', background: 'var(--line2, #eee)' }} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div style={{ textAlign: 'center', padding: 16 }}>
        <p style={{ margin: '0 0 10px' }}>변화 이력을 불러오지 못했습니다.</p>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => refetch()}>
          다시 시도
        </button>
      </div>
    )
  }

  const items = data?.items ?? []
  const firstUnseenIndex = items.findIndex((item) => item.is_unseen)

  return (
    <div>
      {items.map((item, index) => (
        <div key={item.id}>
          {lastSeenAt && index === firstUnseenIndex && (
            <div
              style={{
                fontSize: 12,
                color: 'var(--ink3, #999)',
                borderTop: '1px dashed var(--line, #ccc)',
                margin: '10px 0',
                paddingTop: 6,
              }}
            >
              여기까지 확인함 · {formatDateTime(lastSeenAt)}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--line2, #eee)' }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--pine, #1b5540)',
                marginTop: 6,
                flex: 'none',
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--ink3, #999)', marginBottom: 4 }}>
                {formatDateTime(item.occurred_at)}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                <ChangeKindBadge kind={item.kind} />
                {item.fact_type && <FactTypeBadge factType={item.fact_type} />}
                {item.is_unseen && <NewBadge />}
              </div>

              {item.kind === 'duplicates' ? (
                <p style={{ margin: 0, fontSize: 13 }}>
                  중복 보도 {item.duplicate_post_ids?.length ?? 0}건
                </p>
              ) : item.kind === 'admin_adjust' ? (
                <p style={{ margin: 0, fontSize: 13 }}>
                  {item.headline}
                  {item.actor && (
                    <span style={{ color: 'var(--ink3, #999)' }}> · {item.actor.name}</span>
                  )}
                </p>
              ) : (
                <>
                  {item.original_url ? (
                    <a href={item.original_url} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>
                      {item.post_title || item.headline}
                    </a>
                  ) : (
                    <p style={{ margin: 0, fontSize: 13 }}>{item.post_title || item.headline}</p>
                  )}
                  {item.source_name && (
                    <div style={{ fontSize: 12, color: 'var(--ink3, #999)' }}>{item.source_name}</div>
                  )}
                </>
              )}
              {item.note && (
                <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--ink2, #666)' }}>
                  {item.note}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
