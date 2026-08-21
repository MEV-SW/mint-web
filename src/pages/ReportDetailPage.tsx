import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteReport, getReport, sendReportSlack } from '../api/reportApi'
import { ImportanceBadge } from '../components/common/Badges'
import { Btn } from '../components/common/Btn'
import { Icon } from '../components/common/Icon'
import { ListenButton, buildBriefingSpeech } from '../components/common/ListenButton'
import { useToast } from '../components/common/Toast'
import { usePermissions } from '../hooks/usePermissions'
import { apiErrorDetail } from '../utils/apiError'
import { mediaUrl } from '../utils/mediaUrl'
import type { KeyChange } from '../types/report'

export function ReportDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const qc = useQueryClient()
  const { canWrite } = usePermissions()

  const { data: report, isLoading } = useQuery({
    queryKey: ['report', id],
    queryFn: () => getReport(id!),
    enabled: !!id,
  })

  const sendSlack = useMutation({
    mutationFn: () => sendReportSlack(id!),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['report', id] })
      qc.invalidateQueries({ queryKey: ['reports'] })
      toast(res.success ? '웹훅 발송 완료' : res.message, res.success ? 'ok' : 'err')
    },
    onError: (e: unknown) => {
      toast(apiErrorDetail(e) || '웹훅 발송 실패 — Webhook을 등록하세요.', 'err')
    },
  })

  const remove = useMutation({
    mutationFn: () => deleteReport(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reports'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast('리포트를 삭제했습니다.')
      navigate('/reports')
    },
    onError: (e: unknown) => {
      toast(apiErrorDetail(e) || '리포트 삭제 실패', 'err')
    },
  })

  function confirmDelete() {
    if (!report) return
    if (!window.confirm(`「${report.title}」 리포트를 삭제할까요?\n삭제 후에는 복구할 수 없습니다.`)) return
    remove.mutate()
  }

  if (isLoading || !report) return <div className="content-inner np-sheet">로딩 중…</div>

  const keyChanges = (report.key_changes as KeyChange[] | null) || []

  return (
    <div className="content-inner page-fade np-sheet">
      <Link to="/reports" className="back-link">
        <Icon name="chevL" /> 리포트 목록
      </Link>

      <article className="pg-briefing-block">
        <div className="np-section-label">AI 데일리 브리핑</div>
        <div style={{ marginBottom: 12 }}>
          <ListenButton
            label="데일리 듣기"
            text={buildBriefingSpeech({
              title: report.title,
              summary: report.summary,
              extras: [
                ...keyChanges.slice(0, 4).map((k) => `${k.title}. ${k.description ?? ''}`),
                ...(report.action_items?.slice(0, 3) ?? []),
              ],
            })}
          />
        </div>
        <div className="pg-briefing-hero">
          <div className="pg-briefing-copy">
            <h1 className="pg-title">{report.title}</h1>
            {report.summary && <p className="pg-briefing-lead">{report.summary}</p>}
          </div>
          {mediaUrl(report.illustration_url) && (
            <figure className="np-briefing-illustration np-briefing-illustration-lg">
              <img src={mediaUrl(report.illustration_url)!} alt="" />
              <figcaption>오늘의 스케치</figcaption>
            </figure>
          )}
        </div>
        {canWrite && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Btn
            variant="outline"
            size="sm"
            icon="slack"
            onClick={() => sendSlack.mutate()}
            disabled={sendSlack.isPending}
          >
            {sendSlack.isPending ? '발송 중…' : report.slack_sent ? '웹훅 재발송' : '웹훅 발송'}
          </Btn>
          <Btn variant="outline" size="sm" icon="trash" onClick={confirmDelete} disabled={remove.isPending}>
            {remove.isPending ? '삭제 중…' : '삭제'}
          </Btn>
        </div>
        )}
      </article>

      {keyChanges.length > 0 && (
        <section className="pg-section-block">
          <h3>오늘 보면 좋은 소식</h3>
          <ol className="np-briefing-picks">
            {keyChanges.map((k, i) => {
              const relatedItem = report.items.find((item) =>
                k.related_post_ids?.includes(item.post_id),
              )
              return (
                <li key={i}>
                  <div className="np-pick-row" style={{ cursor: 'default' }}>
                    <span className="np-pick-num">{i + 1}</span>
                    <span className="np-pick-body">
                      <strong>{k.title}</strong>
                      {k.description && <span>{k.description}</span>}
                      {relatedItem?.post && (
                        <Link to={`/posts/${relatedItem.post_id}`} className="link" style={{ fontSize: 13 }}>
                          게시글 보기 →
                        </Link>
                      )}
                    </span>
                    {k.importance && (
                      <span className="np-pick-badge">
                        <ImportanceBadge level={k.importance} />
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </section>
      )}

      {report.items.length > 0 && (
        <section className="pg-section-block">
          <h3>관련 게시글 ({report.items.length})</h3>
          {report.items.map((item) => (
            <div key={item.id} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
              {item.post ? (
                <Link to={`/posts/${item.post_id}`} className="link" style={{ fontFamily: 'var(--serif)', fontWeight: 650 }}>
                  {item.post.title}
                </Link>
              ) : (
                <span className="mono">{item.post_id}</span>
              )}
              {item.reason && (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{item.reason}</div>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
