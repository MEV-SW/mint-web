import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { getIssue, listIssueRevisions, listIssues, mergeIssue, splitIssue } from '../api/issueApi'
import { Btn } from '../components/common/Btn'
import { PageShell } from '../components/layout/PageShell'
import { useToast } from '../components/common/Toast'
import { apiErrorDetail } from '../utils/apiError'
import { formatDateTime } from '../utils/date'
import type { IssueListItem } from '../types/issue'

function IssueSearchBox({
  label,
  onSelect,
  exclude,
}: {
  label: string
  onSelect: (issue: IssueListItem) => void
  exclude?: string
}) {
  const [q, setQ] = useState('')
  const { data, isFetching } = useQuery({
    queryKey: ['issues-search', q],
    queryFn: () => listIssues({ q, size: 8 }),
    enabled: q.trim().length > 0,
  })
  const results = (data?.items ?? []).filter((item) => item.id !== exclude)

  return (
    <div>
      <input
        className="input"
        placeholder={label}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {q.trim() && (
        <div className="card" style={{ marginTop: 6, maxHeight: 220, overflowY: 'auto' }}>
          {isFetching && <div style={{ padding: 10, fontSize: 13 }}>검색 중…</div>}
          {!isFetching && results.length === 0 && (
            <div style={{ padding: 10, fontSize: 13, color: 'var(--ink3, #999)' }}>
              결과 없음
            </div>
          )}
          {results.map((issue) => (
            <div
              key={issue.id}
              onClick={() => {
                onSelect(issue)
                setQ('')
              }}
              style={{
                padding: '8px 10px',
                cursor: 'pointer',
                borderBottom: '1px solid var(--line2, #eee)',
                fontSize: 13,
              }}
            >
              {issue.title}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function AdminIssuesPage() {
  const toast = useToast()
  const qc = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [splitPostId, setSplitPostId] = useState<string | null>(null)
  const [mergeTarget, setMergeTarget] = useState<IssueListItem | null>(null)

  const issue = useQuery({
    queryKey: ['issue', selectedId],
    queryFn: () => getIssue(selectedId!),
    enabled: !!selectedId,
  })
  const revisions = useQuery({
    queryKey: ['issue-revisions', selectedId],
    queryFn: () => listIssueRevisions(selectedId!),
    enabled: !!selectedId,
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['issue', selectedId] })
    qc.invalidateQueries({ queryKey: ['issue-revisions', selectedId] })
    qc.invalidateQueries({ queryKey: ['issues'] })
  }

  const split = useMutation({
    mutationFn: (postId: string) => splitIssue(selectedId!, postId),
    onSuccess: (newIssue) => {
      toast(`"${newIssue.title}"(으)로 분리했습니다.`)
      setSplitPostId(null)
      invalidate()
    },
    onError: (e) => toast(apiErrorDetail(e) || '분리 실패', 'err'),
  })

  const merge = useMutation({
    mutationFn: (mergeWith: string) => mergeIssue(selectedId!, mergeWith),
    onSuccess: () => {
      toast('두 이슈를 병합했습니다.')
      setMergeTarget(null)
      invalidate()
    },
    onError: (e) => toast(apiErrorDetail(e) || '병합 실패', 'err'),
  })

  const splitTarget = issue.data?.members.find((m) => m.post_id === splitPostId)

  return (
    <PageShell
      section="관리 · 이슈 정리"
      title="이슈 병합·분리"
      lead="잘못 묶인 기사를 분리하거나, 같은 사건인 두 이슈를 하나로 병합합니다. 실행 기록은 변화 타임라인에 남습니다."
    >
      <div style={{ marginBottom: 16, maxWidth: 480 }}>
        <IssueSearchBox
          label="이슈 검색으로 선택…"
          onSelect={(item) => {
            setSelectedId(item.id)
            setSplitPostId(null)
            setMergeTarget(null)
          }}
        />
      </div>

      {!selectedId && (
        <div className="card card-pad" style={{ textAlign: 'center' }}>
          위에서 이슈를 검색해 선택하세요.
        </div>
      )}

      {selectedId && issue.isLoading && <div className="sources-empty-cell">불러오는 중…</div>}

      {selectedId && issue.data && (
        <>
          <h2 style={{ margin: '0 0 12px' }}>{issue.data.title}</h2>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <section className="card card-pad" style={{ flex: '1 1 320px' }}>
              <h3 style={{ fontSize: 13, margin: '0 0 10px' }}>구성 기사</h3>
              {issue.data.members.map((member) => (
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
                  <span style={{ flex: 'none', fontSize: 12, color: 'var(--ink3, #999)' }}>
                    {member.source_name}
                  </span>
                  <span style={{ flex: 1, fontSize: 13 }}>{member.title}</span>
                  <span style={{ flex: 'none', fontSize: 12, color: 'var(--ink3, #999)' }}>
                    {formatDateTime(member.published_at)}
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setSplitPostId(member.post_id)}
                    disabled={issue.data.members.length < 2}
                  >
                    분리
                  </button>
                </div>
              ))}
              {issue.data.members.length < 2 && (
                <p style={{ fontSize: 12, color: 'var(--ink3, #999)', margin: '10px 0 0' }}>
                  구성 기사가 2건 미만이라 분리할 수 없습니다.
                </p>
              )}
            </section>

            <section className="card card-pad" style={{ flex: '1 1 280px' }}>
              <h3 style={{ fontSize: 13, margin: '0 0 10px' }}>작업 미리보기</h3>

              {splitTarget && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--pine, #1b5540)', fontWeight: 700, marginBottom: 6 }}>
                    분리
                  </div>
                  <p style={{ fontSize: 13, margin: '0 0 10px' }}>
                    새 이슈로: "{splitTarget.title}"
                  </p>
                  <Btn
                    variant="primary"
                    size="sm"
                    onClick={() => split.mutate(splitTarget.post_id)}
                    disabled={split.isPending}
                  >
                    {split.isPending ? '분리 중…' : '새 이슈로 분리'}
                  </Btn>
                </div>
              )}

              <div>
                <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--pine, #1b5540)', fontWeight: 700, marginBottom: 6 }}>
                  병합
                </div>
                {!mergeTarget && (
                  <IssueSearchBox
                    label="병합할 이슈 검색…"
                    exclude={selectedId}
                    onSelect={(item) => setMergeTarget(item)}
                  />
                )}
                {mergeTarget && (
                  <>
                    <p style={{ fontSize: 13, margin: '0 0 10px' }}>
                      "{mergeTarget.title}" → "{issue.data.title}"로 병합 (이 이슈가 남습니다)
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Btn
                        variant="primary"
                        size="sm"
                        onClick={() => merge.mutate(mergeTarget.id)}
                        disabled={merge.isPending}
                      >
                        {merge.isPending ? '병합 중…' : '하나로 병합'}
                      </Btn>
                      <Btn variant="outline" size="sm" onClick={() => setMergeTarget(null)}>
                        취소
                      </Btn>
                    </div>
                  </>
                )}
              </div>
            </section>
          </div>

          <section className="card card-pad" style={{ marginTop: 16 }}>
            <h3 style={{ fontSize: 13, margin: '0 0 10px' }}>수정 이력</h3>
            {revisions.isLoading && <p style={{ margin: 0 }}>불러오는 중…</p>}
            {!revisions.isLoading && revisions.data?.items.length === 0 && (
              <p style={{ margin: 0, color: 'var(--ink3, #999)' }}>이력이 없습니다.</p>
            )}
            {revisions.data?.items.map((rev) => (
              <div
                key={rev.id}
                style={{
                  padding: '8px 0',
                  borderBottom: '1px solid var(--line2, #eee)',
                  fontSize: 13,
                }}
              >
                <span style={{ color: 'var(--ink3, #999)', marginRight: 8 }}>
                  {formatDateTime(rev.occurred_at)}
                </span>
                {rev.headline}
                {rev.actor && (
                  <span style={{ color: 'var(--ink3, #999)', marginLeft: 8 }}>
                    · {rev.actor.name}
                  </span>
                )}
              </div>
            ))}
          </section>
        </>
      )}
    </PageShell>
  )
}
