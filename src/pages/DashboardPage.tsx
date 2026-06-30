import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import {
  getLatestPersonalReport,
  getPersonalFeed,
  listCategories,
  listKeywords,
} from '../api/personalizationApi'
import { fetchDashboardStats } from '../api/statsApi'
import {
  FrontPageSpread,
  type FrontSpreadPage,
} from '../components/dashboard/FrontPageSpread'
import { MintFrontPage } from '../components/dashboard/MintFrontPage'
import { MyFrontPage } from '../components/dashboard/MyFrontPage'
import { useActiveJobs } from '../hooks/useJobsQuery'

export function DashboardPage() {
  const [page, setPage] = useState<FrontSpreadPage>('mint')
  const { busy: crawlBusy } = useActiveJobs()
  const stats = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
    refetchInterval: crawlBusy ? 5000 : false,
  })
  const keywords = useQuery({ queryKey: ['keywords'], queryFn: () => listKeywords() })
  const categories = useQuery({ queryKey: ['categories'], queryFn: listCategories })
  const feed = useQuery({ queryKey: ['personal-feed'], queryFn: () => getPersonalFeed(1, 8) })
  const personalReport = useQuery({
    queryKey: ['personal-reports', 'latest'],
    queryFn: getLatestPersonalReport,
  })

  const selected = (keywords.data ?? []).filter((item) => item.selected)
  const selectedCategories = (categories.data ?? []).filter((item) => item.selected)
  const needsKeywords =
    !keywords.isLoading &&
    !categories.isLoading &&
    selectedCategories.length < 1 &&
    selected.length < 3
  const items = feed.data?.items ?? []
  const now = new Date()
  const dateLabel = now.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') setPage('mine')
    if (e.key === 'ArrowLeft') setPage('mint')
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onKeyDown])

  return (
    <div className="content-inner np-page page-fade">
      <FrontPageSpread
        page={page}
        onPageChange={setPage}
        mine={
          <MyFrontPage
            dateLabel={dateLabel}
            year={now.getFullYear()}
            needsKeywords={needsKeywords}
            missingKeywordCount={
              selectedCategories.length < 1 ? Math.max(0, 3 - selected.length) : 0
            }
            selectedKeywords={
              selectedCategories.length > 0
                ? selectedCategories.map((category) => ({
                    id: category.id,
                    name: category.name,
                  }))
                : selected
            }
            feedTotal={feed.data?.total ?? 0}
            hero={items[0]}
            picks={items.slice(1)}
            personalReport={personalReport.data}
          />
        }
        mint={
          <MintFrontPage
            dateLabel={dateLabel}
            year={now.getFullYear()}
            stats={stats.data}
            loading={stats.isLoading}
          />
        }
      />
    </div>
  )
}
