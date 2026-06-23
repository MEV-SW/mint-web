import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { deleteReport, generateReport, listReports } from '../api/reportApi'
import { Btn } from '../components/common/Btn'
import { Icon } from '../components/common/Icon'
import { PageShell } from '../components/layout/PageShell'
import { useToast } from '../components/common/Toast'
import { useActiveJobs } from '../hooks/useJobsQuery'
import { usePermissions } from '../hooks/usePermissions'
import { apiErrorDetail } from '../utils/apiError'
import { formatDate } from '../utils/date'
import { DISCOVERY_BOARD_LABEL } from '../constants/boardLabels'

function todayInputValue(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function ReportsPage() {
  const toast = useToast()
  const qc = useQueryClient()
  const { busy, activeLabel } = useActiveJobs()
  const { canWrite } = usePermissions()
  const [reportDate, setReportDate] = useState(todayInputValue)
  const { data: reports = [] } = useQuery({ queryKey: ['reports'], queryFn: listReports })

  const gen = useMutation({
    mutationFn: () => generateReport(reportDate),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jobs'] })
      toast('리포트 생성을 백그라운드에서 시작했습니다. 작업 패널에서 진행 상태를 확인하세요.', 'info')
    },
    onError: (e: unknown) => {
      toast(apiErrorDetail(e) || '리포트 생성 요청 실패', 'err')
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteReport(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reports'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast('리포트를 삭제했습니다.')
    },
    onError: (e: unknown) => {
      toast(apiErrorDetail(e) || '리포트 삭제 실패', 'err')
    },
  })

  function confirmDelete(id: string, title: string) {
    if (!window.confirm(`「${title}」 리포트를 삭제할까요?\n삭제 후에는 복구할 수 없습니다.`)) return
    remove.mutate(id)
  }

  return (
    <PageShell
      section="운영 · 브리핑"
      title="데일리 리포트"
      lead={`선택한 날짜에 수집된 중요 게시판과 ${DISCOVERY_BOARD_LABEL}를 함께 분석해 하루 전체 인사이트 리포트를 생성합니다.`}
      leadSingleLine
      actions={
        canWrite ? (
          <>
            <input
              className="input"
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              style={{ width: 160 }}
            />
            <Btn
              variant="primary"
              icon="doc"
              onClick={() => gen.mutate()}
              disabled={busy || gen.isPending}
              title={busy ? `진행 중인 작업: ${activeLabel ?? '백그라운드 작업'}` : undefined}
            >
              {busy ? '다른 작업 실행 중…' : gen.isPending ? '요청 중…' : '리포트 수동 생성'}
            </Btn>
          </>
        ) : undefined
      }
    >
      {busy && (
        <div className="busy-banner" role="status">
          <Icon name="clock" />
          <span>
            이미 진행 중인 작업이 있습니다
            {activeLabel ? ` (${activeLabel})` : ''}. 완료 후 다시 시도해 주세요.
          </span>
        </div>
      )}

      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 120 }}>날짜</th>
              <th>제목</th>
              <th style={{ width: 160 }}>생성일</th>
              <th style={{ width: 120 }}>웹훅</th>
              {canWrite && <th style={{ width: 56 }} />}
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id}>
                <td className="mono">{r.report_date}</td>
                <td>
                  <Link to={`/reports/${r.id}`} className="link" style={{ fontWeight: 600 }}>
                    {r.title}
                  </Link>
                </td>
                <td className="mono" style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                  {formatDate(r.created_at)}
                </td>
                <td>
                  {r.slack_sent ? (
                    <span className="badge badge-info">
                      <Icon name="slack" style={{ width: 12, height: 12 }} /> 발송됨
                    </span>
                  ) : (
                    <span className="badge badge-unknown">미발송</span>
                  )}
                </td>
                {canWrite && (
                <td>
                  <Btn
                    variant="outline"
                    size="sm"
                    icon="trash"
                    title="리포트 삭제"
                    disabled={remove.isPending}
                    onClick={() => confirmDelete(r.id, r.title)}
                  />
                </td>
                )}
              </tr>
            ))}
            {!reports.length && (
              <tr>
                <td colSpan={5} style={{ color: 'var(--text-muted)' }}>
                  리포트가 없습니다. 게시글 수집 후 생성하세요.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </PageShell>
  )
}
