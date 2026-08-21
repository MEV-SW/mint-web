import { useQuery } from '@tanstack/react-query'
import { NavLink, Navigate, Outlet } from 'react-router-dom'
import { getOpenInquiryCount } from '../../api/inquiryApi'
import { fetchDashboardStats } from '../../api/statsApi'
import { cx } from '../../utils/cx'
import { APP_NAV_ADMIN_SUB, adminNavBadgeCount } from './navItems'
import { usePermissions } from '../../hooks/usePermissions'

export function AdminLayout() {
  const { isAdmin } = usePermissions()
  const { data: stats } = useQuery({ queryKey: ['dashboard-stats'], queryFn: fetchDashboardStats })
  const { data: openInquiries = 0 } = useQuery({
    queryKey: ['inquiries-open-count'],
    queryFn: getOpenInquiryCount,
    enabled: isAdmin,
  })

  const items = APP_NAV_ADMIN_SUB.filter((item) => isAdmin || !item.superAdminOnly)
  const counts = {
    pending: stats?.review_queue_pending ?? 0,
    openInquiries,
    pendingUsers: 0,
  }

  return (
    <div className="admin-layout">
      <nav className="admin-subnav" aria-label="관리 메뉴">
        {items.map((item) => {
          const badge = adminNavBadgeCount(item, counts)
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/admin'}
              className={({ isActive }) => cx('admin-subnav-link', isActive && 'active')}
            >
              <span>{item.label}</span>
              {badge > 0 && <span className="admin-subnav-badge">{badge}</span>}
            </NavLink>
          )
        })}
      </nav>
      <Outlet />
    </div>
  )
}

export function AdminIndexRedirect() {
  return <Navigate to="/admin/review-queue" replace />
}
