import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { generatePersonalReport, listCategories, listKeywords, listPersonalReports } from '../api/personalizationApi'
import { generateReport, listReports } from '../api/reportApi'
import { Btn } from '../components/common/Btn'
import { PageShell } from '../components/layout/PageShell'
import { useToast } from '../components/common/Toast'
import { usePermissions } from '../hooks/usePermissions'
import { apiErrorDetail } from '../utils/apiError'
import { cx } from '../utils/cx'

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

function PersonalReportsColumn() {
  const toast = useToast()
  const qc = useQueryClient()
  const { data: keywords = [] } = useQuery({
    queryKey: ['keywords'],
    queryFn: () => listKeywords(),
  })
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: listCategories,
  })
  const selectedCount = keywords.filter((k) => k.selected).length
  const selectedCategoryCount = categories.filter((c) => c.selected).length
  const canGenerate = selectedCategoryCount >= 1 || selectedCount >= 3

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['personal-reports'],
    queryFn: listPersonalReports,
  })

  const generate = useMutation({
    mutationFn: () => generatePersonalReport(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['personal-reports'] })
      qc.invalidateQueries({ queryKey: ['personal-reports', 'latest'] })
      qc.invalidateQueries({ queryKey: ['jobs'] })
      toast('개인 데일리 리포트 생성을 시작했습니다.')
    },
    onError: (e: unknown) => toast(apiErrorDetail(e) || '리포트 생성 실패', 'err'),
  })

  return (
    <section className="reports-column">
      <header className="reports-column-head">
        <div>
          <h2>내 리포트</h2>
          <p>관심 키워드에 맞춘 개인 데일리 브리핑</p>
        </div>
        <Btn
          variant="primary"
          icon="sparkles"
          size="sm"
          onClick={() => generate.mutate()}
          disabled={generate.isPending || !canGenerate}
          title={
            canGenerate
              ? undefined
              : '관심 분야 1개 이상 또는 키워드 3개 이상 선택 후 생성할 수 있습니다.'
          }
        >
          {generate.isPending ? '생성 중…' : '오늘 리포트 생성'}
        </Btn>
      </header>

      {!canGenerate && (
        <div className="personal-empty personal-empty-inline">
          관심 분야를 <Link to="/settings">1개 이상</Link> 선택하면 개인 리포트를 생성할 수
          있습니다.
        </div>
      )}

      {isLoading && <div className="personal-empty">불러오는 중…</div>}

      {!isLoading && reports.length === 0 && canGenerate && (
        <div className="personal-empty">
          아직 생성된 개인 리포트가 없습니다. 상단 버튼으로 오늘 리포트를 만들 수 있습니다.
        </div>
      )}

      <div className="report-list">
        {reports.map((report) => (
          <ReportListRow
            key={report.id}
            date={report.report_date}
            title={report.title}
            meta={`${report.item_count}건`}
            to={`/personal-reports/${report.id}`}
          />
        ))}
      </div>
    </section>
  )
}

function OrgReportsColumn() {
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
    <section className="reports-column">
      <header className="reports-column-head">
        <div>
          <h2>조직 리포트</h2>
          <p>조직 전체 수집 뉴스 기반 AI 일일 브리핑</p>
        </div>
        {isAdmin && (
          <Btn
            variant="primary"
            icon="sparkles"
            size="sm"
            onClick={() => generate.mutate()}
            disabled={generate.isPending}
          >
            {generate.isPending ? '생성 중…' : '오늘 리포트 생성'}
          </Btn>
        )}
      </header>

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
  )
}

export function ReportsPage() {
  const { isAdmin } = usePermissions()

  return (
    <PageShell
      section="DAILY REPORT"
      title="데일리 리포트"
      lead="개인 맞춤 브리핑과 조직 전체 일일 리포트를 확인합니다."
    >
      <div className={cx('reports-split', !isAdmin && 'reports-split-single')}>
        <PersonalReportsColumn />
        {isAdmin && <OrgReportsColumn />}
      </div>
    </PageShell>
  )
}
