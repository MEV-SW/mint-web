import { useQuery } from '@tanstack/react-query'
import { NavLink, Navigate, Outlet } from 'react-router-dom'
import { getOpenInquiryCount } from '../../api/inquiryApi'
import { fetchDashboardStats } from '../../api/statsApi'
import { listUsers } from '../../api/usersApi'
import { cx } from '../../utils/cx'
import { APP_NAV_ADMIN_SUB, adminNavBadgeCount } from './navItems'

export function AdminLayout() {
  const { data: stats } = useQuery({ queryKey: ['dashboard-stats'], queryFn: fetchDashboardStats })
  const { data: openInquiries = 0 } = useQuery({
    queryKey: ['inquiries-open-count'],
    queryFn: getOpenInquiryCount,
  })
  const { data: pendingUsers = [] } = useQuery({
    queryKey: ['users', 'pending'],
    queryFn: () => listUsers('pending'),
  })

  const counts = {
    pending: stats?.review_queue_pending ?? 0,
    openInquiries,
    pendingUsers: pendingUsers.length,
  }

  return (
    <div className="admin-layout">
      <nav className="admin-subnav" aria-label="관리 메뉴">
        {APP_NAV_ADMIN_SUB.map((item) => {
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
