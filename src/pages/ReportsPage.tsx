import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listEditions } from '../api/editionApi'
import { generateReport, listReports } from '../api/reportApi'
import { ReportCalendar } from '../components/reports/ReportCalendar'
import { PageShell } from '../components/layout/PageShell'
import { useToast } from '../components/common/Toast'
import { usePermissions } from '../hooks/usePermissions'
import { apiErrorDetail } from '../utils/apiError'

export function ReportsPage() {
  const toast = useToast()
  const qc = useQueryClient()
  const { canEditAny } = usePermissions()

  const orgReports = useQuery({
    queryKey: ['reports'],
    queryFn: listReports,
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

  return (
    <PageShell
      section="DAILY REPORT"
      title="리포트"
      lead="날짜를 골라 배정된 분야 브리핑을 확인합니다."
    >
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
    </PageShell>
  )
}
