import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteReport, getReport, sendReportSlack } from '../api/reportApi'
import { ImportanceBadge } from '../components/common/Badges'
import { Btn } from '../components/common/Btn'
import { Icon } from '../components/common/Icon'
import { useToast } from '../components/common/Toast'
import { apiErrorDetail } from '../utils/apiError'
import type { KeyChange } from '../types/report'

export function ReportDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const qc = useQueryClient()

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
      toast(res.success ? 'Slack 발송 완료' : res.message, res.success ? 'ok' : 'err')
    },
    onError: (e: unknown) => {
      toast(apiErrorDetail(e) || 'Slack 발송 실패 — Webhook을 등록하세요.', 'err')
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

  if (isLoading || !report) return <div className="content-inner">로딩 중…</div>

  const keyChanges = (report.key_changes as KeyChange[] | null) || []

  return (
    <div className="content-inner page-fade">
      <Link to="/reports" className="back-link">
        <Icon name="chevL" /> 리포트 목록
      </Link>

      <div
        className="card card-pad"
        style={{
          background: 'linear-gradient(135deg, oklch(0.55 0.11 168), oklch(0.48 0.1 175))',
          color: '#fff',
          marginBottom: 20,
        }}
      >
        <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 6 }}>한눈에</div>
        <h2 style={{ margin: '0 0 8px' }}>{report.title}</h2>
        <p style={{ opacity: 0.9, margin: 0, lineHeight: 1.6 }}>{report.summary}</p>
        <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Btn
            variant="outline"
            size="sm"
            icon="slack"
            onClick={() => sendSlack.mutate()}
            disabled={sendSlack.isPending}
            style={{ background: 'oklch(1 0 0 / 0.15)', borderColor: 'oklch(1 0 0 / 0.3)', color: '#fff' }}
          >
            {sendSlack.isPending ? '발송 중…' : report.slack_sent ? 'Slack 재발송' : 'Slack 발송'}
          </Btn>
          <Btn
            variant="outline"
            size="sm"
            icon="trash"
            onClick={confirmDelete}
            disabled={remove.isPending}
            style={{ background: 'oklch(1 0 0 / 0.1)', borderColor: 'oklch(1 0 0 / 0.25)', color: '#fff' }}
          >
            {remove.isPending ? '삭제 중…' : '삭제'}
          </Btn>
        </div>
      </div>

      {keyChanges.length > 0 && (
        <div className="card card-pad" style={{ marginBottom: 20 }}>
          <h3 style={{ marginTop: 0 }}>오늘 보면 좋은 소식</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {keyChanges.map((k, i) => {
              const relatedItem = report.items.find((item) =>
                k.related_post_ids?.includes(item.post_id),
              )
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: 10,
                    background: 'var(--surface-2, oklch(0.97 0 0))',
                    border: '1px solid var(--border)',
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: 'var(--accent-muted, oklch(0.55 0.11 168 / 0.15))',
                      color: 'var(--accent)',
                      fontSize: 13,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {i + 1}
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: 15 }}>{k.title}</strong>
                      {k.importance && <ImportanceBadge level={k.importance} />}
                    </div>
                    {k.description && (
                      <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '6px 0 0' }}>
                        {k.description}
                      </p>
                    )}
                    {relatedItem?.post && (
                      <Link
                        to={`/posts/${relatedItem.post_id}`}
                        className="link"
                        style={{ fontSize: 13, display: 'inline-block', marginTop: 8 }}
                      >
                        게시글 보기 →
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {report.items.length > 0 && (
        <div className="card card-pad">
          <h3 style={{ marginTop: 0 }}>관련 게시글 ({report.items.length})</h3>
          {report.items.map((item) => (
            <div key={item.id} style={{ marginBottom: 12 }}>
              {item.post ? (
                <Link to={`/posts/${item.post_id}`} className="link">
                  {item.post.title}
                </Link>
              ) : (
                <span className="mono">{item.post_id}</span>
              )}
              {item.reason && (
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{item.reason}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
