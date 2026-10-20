import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { getOpenInquiryCount } from '../../api/inquiryApi'
import { listUsers } from '../../api/usersApi'
import { useAdminSummaryQuery } from '../../hooks/useAdminSummaryQuery'
import { useJobsQuery } from '../../hooks/useJobsQuery'
import { usePermissions } from '../../hooks/usePermissions'
import { useUnsavedStore } from '../../store/unsavedStore'
import type { BackgroundJob } from '../../types/job'
import { cx } from '../../utils/cx'
import { jobProgressSummary, pickPrimaryActiveJob } from '../../utils/jobProgress'
import { Icon } from '../common/Icon'
import {
  ADMIN_NAV_GROUPS,
  adminNavBadgeCount,
  currentAdminNavItem,
  formatNavBadge,
  visibleAdminNav,
  type NavItem,
} from './navItems'

const PIPELINE_SCHEDULE = '매일 06:00·06:30'
const RECENT_FAILURE_MS = 24 * 60 * 60 * 1000

type PipelineState = { tone: 'ok' | 'info' | 'err'; text: string }

function pipelineState(jobs: BackgroundJob[]): PipelineState {
  const active = pickPrimaryActiveJob(jobs)
  if (active) {
    return { tone: 'info', text: jobProgressSummary(active) ?? `${active.label} 실행 중` }
  }
  const since = Date.now() - RECENT_FAILURE_MS
  const failed = jobs.filter(
    (job) => job.status === 'failed' && new Date(job.finished_at ?? job.created_at).getTime() >= since,
  ).length
  if (failed > 0) return { tone: 'err', text: `최근 24시간 작업 실패 ${failed}` }
  return { tone: 'ok', text: `수집 파이프라인 정상 · ${PIPELINE_SCHEDULE}` }
}

export function AdminLayout() {
  const { isAdmin, canEditAny, canReviewSources } = usePermissions()
  const location = useLocation()
  const [sheetOpen, setSheetOpen] = useState(false)
  const dirtyPaths = useUnsavedStore((state) => state.dirtyPaths)

  // Same query keys as TopNav, so the sidebar adds no requests.
  const inquiriesQuery = useQuery({
    queryKey: ['inquiries-open-count'],
    queryFn: getOpenInquiryCount,
    enabled: isAdmin,
  })
  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: listUsers,
    enabled: isAdmin,
  })
  const { data: jobs = [] } = useJobsQuery(isAdmin || canEditAny)
  const summaryQuery = useAdminSummaryQuery()

  const items = visibleAdminNav(isAdmin, canEditAny, canReviewSources)
  const counts = {
    openInquiries: inquiriesQuery.data ?? 0,
    pendingUsers: (usersQuery.data ?? []).filter((user) => user.approval_status === 'pending').length,
    failedSources: summaryQuery.data?.failed_sources ?? 0,
  }
  const countsLoading = isAdmin && (inquiriesQuery.isLoading || usersQuery.isLoading)
  const current = currentAdminNavItem(items, location.pathname) ?? items[0]
  const pipeline = isAdmin || canEditAny ? pipelineState(jobs) : null

  useEffect(() => {
    if (!sheetOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSheetOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sheetOpen])

  function badgeFor(item: NavItem) {
    if (!item.countKey) return null
    const loading = item.countKey === 'failedSources' ? summaryQuery.isLoading : countsLoading
    if (loading) return <span className="admin-nav-badge is-loading" aria-hidden>·</span>
    const text = formatNavBadge(adminNavBadgeCount(item, counts))
    if (!text) return null
    return (
      <span className={cx('admin-nav-badge', `tone-${item.badgeTone ?? 'gray'}`)} aria-label={`${text}건`}>
        {text}
      </span>
    )
  }

  const renderNav = (onNavigate?: () => void) => (
    <>
      {ADMIN_NAV_GROUPS.map((group) => {
        const groupItems = items.filter((item) => item.group === group)
        if (groupItems.length === 0) return null
        return (
          <div key={group} className="admin-nav-group">
            <div className="admin-nav-group-title">{group}</div>
            {groupItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) => cx('admin-nav-link', isActive && 'active')}
                onClick={onNavigate}
              >
                <span className="admin-nav-no" aria-hidden>
                  {item.no}
                </span>
                <span className="admin-nav-label">{item.label}</span>
                {dirtyPaths.includes(item.path) && (
                  <span className="admin-nav-unsaved" title="저장하지 않은 변경이 있습니다" aria-label="저장하지 않은 변경" />
                )}
                {badgeFor(item)}
              </NavLink>
            ))}
          </div>
        )
      })}
    </>
  )

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar" aria-label="관리 메뉴">
        <div className="admin-sidebar-head">
          <h2 className="admin-sidebar-title">관리</h2>
          {pipeline && (
            <p className={cx('admin-pipeline', `tone-${pipeline.tone}`)}>
              <span className="admin-pipeline-dot" aria-hidden />
              {pipeline.text}
            </p>
          )}
        </div>
        <nav className="admin-nav">{renderNav()}</nav>
      </aside>

      <div className="admin-mobile-bar">
        <button
          type="button"
          className="admin-mobile-trigger"
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
          onClick={() => setSheetOpen(true)}
        >
          <span>관리</span>
          <span aria-hidden>·</span>
          {current && (
            <>
              <span className="admin-nav-no" aria-hidden>
                {current.no}
              </span>
              <span className="admin-mobile-current">{current.label}</span>
            </>
          )}
          <Icon name="chevD" />
        </button>
      </div>

      {sheetOpen && (
        <div className="admin-sheet-backdrop" onMouseDown={() => setSheetOpen(false)}>
          <div
            className="admin-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="관리 메뉴"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {pipeline && (
              <p className={cx('admin-pipeline', `tone-${pipeline.tone}`)}>
                <span className="admin-pipeline-dot" aria-hidden />
                {pipeline.text}
              </p>
            )}
            <nav className="admin-nav">{renderNav(() => setSheetOpen(false))}</nav>
          </div>
        </div>
      )}

      <div className="admin-body">
        <Outlet />
      </div>
    </div>
  )
}

