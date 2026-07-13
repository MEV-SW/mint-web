import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { generateReport, listReports } from '../api/reportApi'
import { Btn } from '../components/common/Btn'
import { PageShell } from '../components/layout/PageShell'
import { useToast } from '../components/common/Toast'
import { usePermissions } from '../hooks/usePermissions'
import { apiErrorDetail } from '../utils/apiError'

function ReportListRow({
  date,
  title,
  meta,
  to,
}: {
  date: string
  title: string
  meta: string
  to: string
}) {
  return (
    <Link to={to} className="report-list-row">
      <time>{date}</time>
      <span>{title}</span>
      <small>{meta}</small>
    </Link>
  )
}

export function ReportsPage() {
  const toast = useToast()
  const qc = useQueryClient()
  const { isAdmin } = usePermissions()
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: listReports,
  })

  const generate = useMutation({
    mutationFn: () => generateReport(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reports'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      qc.invalidateQueries({ queryKey: ['jobs'] })
      toast('조직 데일리 리포트 생성을 시작했습니다.')
    },
    onError: (e: unknown) => toast(apiErrorDetail(e) || '리포트 생성 실패', 'err'),
  })

  return (
    <PageShell
      section="DAILY REPORT"
      title="조직 리포트"
      lead="조직 전체 EV·충전 수집 뉴스 기반 AI 일일 브리핑입니다."
      actions={
        isAdmin ? (
          <Btn
            variant="primary"
            icon="sparkles"
            onClick={() => generate.mutate()}
            disabled={generate.isPending}
          >
            {generate.isPending ? '생성 중…' : '오늘 리포트 생성'}
          </Btn>
        ) : undefined
      }
    >
      <section className="reports-column">
        {isLoading && <div className="personal-empty">불러오는 중…</div>}

        {!isLoading && reports.length === 0 && (
          <div className="personal-empty">
            아직 조직 데일리 리포트가 없습니다.
            {isAdmin && ' 상단 버튼으로 수동 생성할 수 있습니다.'}
          </div>
        )}

        <div className="report-list">
          {reports.map((report) => (
            <ReportListRow
              key={report.id}
              date={report.report_date}
              title={report.title}
              meta={report.slack_sent ? '발송됨' : '미발송'}
              to={`/reports/${report.id}`}
            />
          ))}
        </div>
      </section>
    </PageShell>
  )
}
