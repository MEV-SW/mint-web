import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { listEditions } from '../api/editionApi'
import { generateReport, listReports } from '../api/reportApi'
import { ReportCalendar } from '../components/reports/ReportCalendar'
import { WeeklyReportView } from '../components/weekly/WeeklyReportView'
import { PageShell } from '../components/layout/PageShell'
import { LoadErrorBanner } from '../components/common/PageStates'
import { useToast } from '../components/common/Toast'
import { usePermissions } from '../hooks/usePermissions'
import { apiErrorDetail } from '../utils/apiError'

type ReportView = 'daily' | 'weekly'

function ViewSwitch({ view, onChange }: { view: ReportView; onChange: (next: ReportView) => void }) {
  return (
    <div className="wk-switch" role="group" aria-label="리포트 보기">
      {(['daily', 'weekly'] as const).map((item) => (
        <button
          key={item}
          type="button"
          className={item === view ? 'is-current' : undefined}
          aria-pressed={item === view}
          onClick={() => item !== view && onChange(item)}
        >
          {item === 'daily' ? '데일리' : '주간'}
        </button>
      ))}
    </div>
  )
}

export function ReportsPage() {
  const [params, setParams] = useSearchParams()
  const view: ReportView = params.get('view') === 'weekly' ? 'weekly' : 'daily'
  const toast = useToast()
  const qc = useQueryClient()
  const { canEditAny } = usePermissions()

  const orgReports = useQuery({
    queryKey: ['reports'],
    queryFn: listReports,
    enabled: view === 'daily',
  })
  const editionsQuery = useQuery({
    queryKey: ['editions', 'active'],
    queryFn: () => listEditions(true),
  })
  const editionNameById = new Map(
    (editionsQuery.data ?? []).map((edition) => [edition.id, edition.name]),
  )

  const generateOrg = useMutation({
    mutationFn: () => generateReport(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reports'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      qc.invalidateQueries({ queryKey: ['jobs'] })
      toast('조직 데일리 리포트 생성을 시작했습니다.')
    },
    onError: (e: unknown) => toast(apiErrorDetail(e) || '조직 리포트 생성 실패', 'err'),
  })

  const viewSwitch = (
    <ViewSwitch view={view} onChange={(next) => setParams(next === 'weekly' ? { view: 'weekly' } : {})} />
  )

  return (
    <PageShell section="REPORT" title="리포트" lead="데일리와 주간 리포트를 분야별로 확인합니다.">
      {view === 'weekly' ? (
        editionsQuery.isError ? (
          <LoadErrorBanner
            title="분야 목록을 불러오지 못했습니다"
            error={editionsQuery.error}
            failedAt={editionsQuery.errorUpdatedAt}
            onRetry={() => void editionsQuery.refetch()}
            retrying={editionsQuery.isFetching}
          />
        ) : editionsQuery.data ? (
          <WeeklyReportView editions={editionsQuery.data} viewSwitch={viewSwitch} />
        ) : (
          <div className="wk-toolbar">{viewSwitch}</div>
        )
      ) : (
        <>
          <div className="wk-toolbar">{viewSwitch}</div>
          {orgReports.isError && (
            <LoadErrorBanner
              title="리포트 목록을 불러오지 못했습니다"
              error={orgReports.error}
              failedAt={orgReports.errorUpdatedAt}
              onRetry={() => void orgReports.refetch()}
              retrying={orgReports.isFetching}
            />
          )}
          <ReportCalendar
            orgReports={(orgReports.data ?? []).map((report) => ({
              id: report.id,
              title: report.title,
              report_date: report.report_date,
              slack_sent: report.slack_sent,
              edition_id: report.edition_id ?? null,
              edition_name: report.edition_id ? editionNameById.get(report.edition_id) ?? null : null,
              created_at: report.created_at,
            }))}
            personalReports={[]}
            loading={orgReports.isLoading}
            hidePersonal
            canGenerateOrg={canEditAny}
            generatingOrg={generateOrg.isPending}
            onGenerateOrg={() => generateOrg.mutate()}
          />
        </>
      )}
    </PageShell>
  )
}
