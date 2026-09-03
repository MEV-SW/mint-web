import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { listEditions } from '../api/editionApi'
import { getEditorialFeed, listKeywords } from '../api/personalizationApi'
import { getLatestReport } from '../api/reportApi'
import type { DashboardPostPreview, DashboardStats } from '../api/statsApi'
import { FrontPageSpread, type SpreadSheet } from '../components/dashboard/FrontPageSpread'
import { MintFrontPage } from '../components/dashboard/MintFrontPage'
import { useToast } from '../components/common/Toast'
import { useDashboardStatsQuery } from '../hooks/useDashboardStatsQuery'
import { useActiveJobs } from '../hooks/useJobsQuery'
import { usePermissions } from '../hooks/usePermissions'
import type { DailyReport } from '../types/report'
import type { PersonalizedNews } from '../types/personalization'
import { invalidateFrontPageQueries } from '../utils/frontPageQueries'

const IDLE_POLL_MS = 60_000
const BUSY_POLL_MS = 5_000

function toPreview(item: PersonalizedNews): DashboardPostPreview {
  return {
    id: item.id,
    title: item.title,
    source_name: item.source_name,
    source_type: item.source_type ?? null,
    board_type: item.board_type === 'discovery' ? 'discovery' : 'trusted',
    status: 'published',
    importance: item.importance,
    collected_at: item.collected_at,
    original_url: item.original_url,
    ai_summary: item.summary,
  }
}

function toOrgReport(row: DailyReport | null | undefined): DashboardStats['latest_report'] {
  if (!row) return null
  const changes = Array.isArray(row.key_changes) ? row.key_changes : []
  return {
    id: row.id,
    title: row.title,
    report_date: String(row.report_date),
    summary: row.summary,
    slack_sent: row.slack_sent,
    illustration_url: row.illustration_url,
    highlights: changes.map((item) => {
      const change = item as {
        title?: string
        description?: string | null
        importance?: string | null
        related_post_ids?: string[]
      }
      return {
        title: change.title ?? '',
        description: change.description ?? null,
        importance: change.importance ?? null,
        related_post_ids: change.related_post_ids,
      }
    }),
  }
}

export function DashboardPage() {
  const toast = useToast()
  const qc = useQueryClient()
  const { isAdmin } = usePermissions()
  const { busy: crawlBusy } = useActiveJobs()
  const stats = useDashboardStatsQuery()
  const seenFrontSignature = useRef<string | undefined>(undefined)
  const [spreadPage, setSpreadPage] = useState<string>('')

  const pollMs = crawlBusy ? BUSY_POLL_MS : IDLE_POLL_MS

  const editionsQuery = useQuery({
    queryKey: ['editions', 'active'],
    queryFn: () => listEditions(true),
  })
  const keywordsQuery = useQuery({
    queryKey: ['keywords'],
    queryFn: () => listKeywords(false),
  })

  const editions = editionsQuery.data ?? []
  const editorialQueries = useQueries({
    queries: editions.map((edition) => ({
      queryKey: ['editorial-feed', edition.id],
      queryFn: () => getEditorialFeed(edition.id),
      refetchInterval: pollMs,
      refetchIntervalInBackground: false,
    })),
  })
  const reportQueries = useQueries({
    queries: editions.map((edition) => ({
      queryKey: ['edition-report', edition.id],
      queryFn: () => getLatestReport(edition.id),
      refetchInterval: pollMs,
      refetchIntervalInBackground: false,
    })),
  })

  useEffect(() => {
    if (spreadPage) return
    if (editions[0]) setSpreadPage(editions[0].id)
  }, [editions, spreadPage])

  const keywords = keywordsQuery.data ?? []
  const frontSignature = useMemo(() => {
    const reportSignature = editions
      .map((edition, index) => `${edition.id}:${reportQueries[index]?.data?.id ?? 'none'}`)
      .join('|')
    const feedSignature = editions
      .map((edition, index) => {
        const feed = editorialQueries[index]?.data
        const head = feed?.items?.[0]?.id ?? 'none'
        return `${edition.id}:${head}:${feed?.total ?? 0}`
      })
      .join('|')
    return `${reportSignature}::${feedSignature}`
  }, [editions, editorialQueries, reportQueries])

  const frontReady =
    !editionsQuery.isLoading &&
    editions.length > 0 &&
    reportQueries.every((query) => !query.isLoading) &&
    editorialQueries.every((query) => !query.isLoading)

  useEffect(() => {
    if (!frontReady) return
    if (seenFrontSignature.current === undefined) {
      seenFrontSignature.current = frontSignature
      return
    }
    if (frontSignature !== seenFrontSignature.current) {
      seenFrontSignature.current = frontSignature
      invalidateFrontPageQueries(qc)
      toast('오늘의 MINT Daily가 갱신되었습니다.')
    }
  }, [frontReady, frontSignature, qc, toast])

  const now = new Date()
  const dateLabel = now.toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
  const year = Number(
    new Intl.DateTimeFormat('en', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
    }).format(now),
  )

  const sheets = useMemo<SpreadSheet[]>(() => {
    const editionSheets: SpreadSheet[] = editions.map((edition, index) => {
      const feed = editorialQueries[index]?.data
      const report = toOrgReport(reportQueries[index]?.data)
      const featured = keywords.filter(
        (item) => item.edition_id === edition.id && item.is_featured,
      )
      return {
        key: edition.id,
        label: edition.name,
        subtitle: edition.name,
        node: (
          <MintFrontPage
            dateLabel={dateLabel}
            year={year}
            stats={stats.data}
            loading={stats.isLoading || editorialQueries[index]?.isLoading}
            editionName={edition.name}
            missingSources={edition.missing_sources}
            featuredKeywords={featured.map((item) => ({ id: item.id, name: item.name }))}
            stories={(feed?.items ?? []).map(toPreview)}
            report={report}
          />
        ),
      }
    })

    return editionSheets
  }, [
    editions,
    editorialQueries,
    reportQueries,
    keywords,
    dateLabel,
    year,
    stats.data,
    stats.isLoading,
  ])

  const currentPage =
    sheets.some((sheet) => sheet.key === spreadPage) ? spreadPage : sheets[0]?.key ?? ''

  if (editionsQuery.isLoading) {
    return (
      <div className="content-inner np-page page-fade">
        <div className="np-spread" aria-busy="true">
          <p className="np-spread-hint">지면을 불러오는 중</p>
        </div>
      </div>
    )
  }

  if (sheets.length === 0) {
    return (
      <div className="content-inner np-page page-fade">
        <div className="personal-empty" style={{ padding: '64px 24px', textAlign: 'center' }}>
          <h2 style={{ marginBottom: 8 }}>분야가 배정되지 않았습니다</h2>
          <p>
            {isAdmin
              ? '설정에서 사업 분야를 만들거나, 계정 관리에서 자신에게 분야를 배정하세요.'
              : '총관이 사업 분야를 배정하면 홈 지면이 열립니다.'}
          </p>
        </div>
      </div>
    )
  }

  if (sheets.length === 1) {
    return <div className="content-inner np-page page-fade">{sheets[0].node}</div>
  }

  return (
    <div className="content-inner np-page page-fade">
      <FrontPageSpread page={currentPage} onPageChange={setSpreadPage} sheets={sheets} />
    </div>
  )
}
