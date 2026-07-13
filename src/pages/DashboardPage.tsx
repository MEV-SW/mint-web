import { useEffect, useRef } from 'react'
import { MintFrontPage } from '../components/dashboard/MintFrontPage'
import { useToast } from '../components/common/Toast'
import { useDashboardStatsQuery } from '../hooks/useDashboardStatsQuery'

export function DashboardPage() {
  const toast = useToast()
  const stats = useDashboardStatsQuery()
  const seenReportId = useRef<string | null | undefined>(undefined)

  useEffect(() => {
    const reportId = stats.data?.latest_report?.id ?? null
    if (seenReportId.current === undefined) {
      seenReportId.current = reportId
      return
    }
    if (reportId && reportId !== seenReportId.current) {
      seenReportId.current = reportId
      toast('오늘의 MINT Daily가 갱신되었습니다.')
    } else {
      seenReportId.current = reportId
    }
  }, [stats.data?.latest_report?.id, toast])

  const now = new Date()
  const dateLabel = now.toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })

  return (
    <div className="content-inner np-page page-fade">
      <MintFrontPage
        key={stats.data?.latest_report?.id ?? 'none'}
        dateLabel={dateLabel}
        year={Number(
          new Intl.DateTimeFormat('en', {
            timeZone: 'Asia/Seoul',
            year: 'numeric',
          }).format(now),
        )}
        stats={stats.data}
        loading={stats.isLoading}
      />
    </div>
  )
}
