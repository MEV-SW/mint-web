import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { getIssue, listIssueRevisions, listIssues, mergeIssue, splitIssue } from '../api/issueApi'
import { Btn } from '../components/common/Btn'
import { PageShell } from '../components/layout/PageShell'
import { useToast } from '../components/common/Toast'
import { useConfirm } from '../components/common/useConfirm'
import { apiErrorDetail } from '../utils/apiError'
import { formatDateTime } from '../utils/date'
import type { IssueDetail, IssueListItem } from '../types/issue'
import { cx } from '../utils/cx'

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

type MergeDirection = 'into-a' | 'into-b'

function IssueColumn({
  issue,
  side,
  splitPostId,
  onSplitSelect,
  onClear,
}: {
  issue: IssueDetail
  side: 'A' | 'B'
  splitPostId?: string | null
  onSplitSelect?: (postId: string) => void
  onClear: () => void
}) {
  const canSplit = Boolean(onSplitSelect) && issue.members.length >= 2
  return (
    <section className="card card-pad issue-merge-col">
      <div className="issue-merge-col-head">
        <span className="issue-merge-tag">{side}</span>
        <h3>{issue.title}</h3>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClear}>
          다른 이슈
        </button>
      </div>
      {issue.summary && <p className="issue-merge-summary">{issue.summary}</p>}
      <div className="issue-merge-count">구성 기사 {issue.members.length}건</div>
      {issue.members.map((member) => (
        <div
          key={member.post_id}
          className={cx('issue-merge-member', splitPostId === member.post_id && 'is-selected')}
        >
          <span className="issue-merge-member-source">{member.source_name}</span>
          <span className="issue-merge-member-title">{member.title}</span>
          <span className="issue-merge-member-date">{formatDateTime(member.published_at)}</span>
          {onSplitSelect && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => onSplitSelect(member.post_id)}
              disabled={!canSplit}
            >
              분리 선택
            </button>
          )}
        </div>
      ))}
      {onSplitSelect && issue.members.length < 2 && (
        <p className="issue-merge-hint">구성 기사가 2건 미만이라 분리할 수 없습니다.</p>
      )}
    </section>
  )
}

export function AdminIssuesPage() {
  const toast = useToast()
  const confirm = useConfirm()
  const qc = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [otherId, setOtherId] = useState<string | null>(null)
  const [direction, setDirection] = useState<MergeDirection>('into-a')
  const [splitPostId, setSplitPostId] = useState<string | null>(null)

  const issue = useQuery({
    queryKey: ['issue', selectedId],
    queryFn: () => getIssue(selectedId!),
    enabled: !!selectedId,
  })
  const other = useQuery({
    queryKey: ['issue', otherId],
    queryFn: () => getIssue(otherId!),
    enabled: !!otherId,
  })
  const revisions = useQuery({
    queryKey: ['issue-revisions', selectedId],
    queryFn: () => listIssueRevisions(selectedId!),
    enabled: !!selectedId,
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['issue'] })
    qc.invalidateQueries({ queryKey: ['issue-revisions'] })
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

  // The surviving issue is the path id; the other one is merged into it.
  const merge = useMutation({
    mutationFn: ({ keepId, mergeId }: { keepId: string; mergeId: string }) => mergeIssue(keepId, mergeId),
    onSuccess: (kept) => {
      toast('두 이슈를 병합했습니다.')
      setSelectedId(kept.id)
      setOtherId(null)
      setDirection('into-a')
      setSplitPostId(null)
      invalidate()
    },
    onError: (e) => toast(apiErrorDetail(e) || '병합 실패', 'err'),
  })

  const a = issue.data
  const b = other.data
  const keep = direction === 'into-a' ? a : b
  const gone = direction === 'into-a' ? b : a
  const splitTarget = a?.members.find((m) => m.post_id === splitPostId)
  const busy = merge.isPending || split.isPending

  async function runMerge() {
    if (!keep || !gone || busy) return
    const ok = await confirm({
      title: `‘${gone.title}’를 ‘${keep.title}’에 병합할까요?`,
      body: '병합은 되돌릴 수 없고 변화 타임라인에 기록됩니다.',
      confirmLabel: '병합',
      danger: true,
    })
    if (!ok) return
    merge.mutate({ keepId: keep.id, mergeId: gone.id })
  }

  async function runSplit() {
    if (!splitTarget || busy) return
    const ok = await confirm({
      title: `‘${splitTarget.title}’을 새 이슈로 분리할까요?`,
      body: '변화 타임라인에 기록됩니다.',
      confirmLabel: '분리',
      danger: true,
    })
    if (!ok) return
    split.mutate(splitTarget.post_id)
  }

  function clearA() {
    setSelectedId(null)
    setOtherId(null)
    setSplitPostId(null)
    setDirection('into-a')
  }

  return (
    <PageShell
      section="관리 · 이슈 병합"
      title="이슈 병합·분리"
      lead="잘못 묶인 기사를 분리하거나, 같은 사건인 두 이슈를 하나로 병합합니다. 실행 기록은 변화 타임라인에 남습니다."
    >
      {!selectedId && (
        <>
          <div style={{ marginBottom: 16, maxWidth: 480 }}>
            <IssueSearchBox
              label="이슈 검색…"
              onSelect={(item) => {
                setSelectedId(item.id)
                setSplitPostId(null)
              }}
            />
          </div>
          <div className="card card-pad issue-merge-empty">병합하거나 분리할 이슈를 검색하세요</div>
        </>
      )}

      {selectedId && issue.isLoading && <div className="sources-empty-cell">불러오는 중…</div>}

      {a && (
        <div className="issue-merge-grid">
          <IssueColumn
            issue={a}
            side="A"
            splitPostId={splitPostId}
            onSplitSelect={(postId) => setSplitPostId(postId)}
            onClear={clearA}
          />

          <section className="card card-pad issue-merge-preview" aria-live="polite">
            <h3>미리보기</h3>

            {b && (
              <div className="issue-merge-block">
                <div className="issue-merge-block-title">병합</div>
                <div className="seg issue-merge-direction" role="radiogroup" aria-label="병합 방향">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={direction === 'into-a'}
                    className={cx(direction === 'into-a' && 'on')}
                    onClick={() => setDirection('into-a')}
                  >
                    B → A (A가 남음)
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={direction === 'into-b'}
                    className={cx(direction === 'into-b' && 'on')}
                    onClick={() => setDirection('into-b')}
                  >
                    A → B (B가 남음)
                  </button>
                </div>
                {keep && gone && (
                  <dl className="issue-merge-facts">
                    <dt>남는 이슈</dt>
                    <dd>{keep.title}</dd>
                    <dt>합친 뒤 기사</dt>
                    <dd>최대 {a.members.length + b.members.length}건 (중복은 서버가 정리)</dd>
                    <dt>사라지는 이슈</dt>
                    <dd>{gone.title}</dd>
                  </dl>
                )}
                <Btn variant="danger" size="sm" onClick={() => void runMerge()} disabled={busy}>
                  {merge.isPending ? '병합 중…' : '병합 실행'}
                </Btn>
              </div>
            )}

            {splitTarget && (
              <div className="issue-merge-block">
                <div className="issue-merge-block-title">분리</div>
                <p>
                  ‘{splitTarget.title}’을 새 이슈로 분리 → A는 {a.members.length - 1}건
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Btn variant="danger" size="sm" onClick={() => void runSplit()} disabled={busy}>
                    {split.isPending ? '분리 중…' : '분리 실행'}
                  </Btn>
                  <Btn variant="outline" size="sm" onClick={() => setSplitPostId(null)} disabled={busy}>
                    선택 해제
                  </Btn>
                </div>
              </div>
            )}

            {!b && !splitTarget && (
              <p className="issue-merge-hint">
                병합하려면 오른쪽에서 B 이슈를 고르고, 분리하려면 A의 구성 기사에서 “분리 선택”을 누르세요.
              </p>
            )}
          </section>

          {b ? (
            <IssueColumn
              issue={b}
              side="B"
              onClear={() => {
                setOtherId(null)
                setDirection('into-a')
              }}
            />
          ) : (
            <section className="card card-pad issue-merge-col">
              <div className="issue-merge-col-head">
                <span className="issue-merge-tag">B</span>
                <h3>병합할 이슈</h3>
              </div>
              {otherId && other.isLoading ? (
                <p className="issue-merge-hint">불러오는 중…</p>
              ) : (
                <IssueSearchBox
                  label="병합할 이슈 검색…"
                  exclude={selectedId ?? undefined}
                  onSelect={(item) => setOtherId(item.id)}
                />
              )}
            </section>
          )}
        </div>
      )}

      {a && (
        <section className="card card-pad" style={{ marginTop: 16 }}>
          <h3 style={{ fontSize: 13, margin: '0 0 10px' }}>A 수정 이력</h3>
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
                <span style={{ color: 'var(--ink3, #999)', marginLeft: 8 }}>· {rev.actor.name}</span>
              )}
            </div>
          ))}
        </section>
      )}
    </PageShell>
  )
}
