import { useQuery } from '@tanstack/react-query'
import { NavLink, Navigate, Outlet } from 'react-router-dom'
import { getOpenInquiryCount } from '../../api/inquiryApi'
import { fetchDashboardStats } from '../../api/statsApi'
import { listUsers } from '../../api/usersApi'
import { cx } from '../../utils/cx'
import { SETTINGS_PATH, adminNavBadgeCount, visibleAdminNav } from './navItems'
import { usePermissions } from '../../hooks/usePermissions'

export function AdminLayout() {
  const { isAdmin, canEditAny } = usePermissions()
  const { data: stats } = useQuery({ queryKey: ['dashboard-stats'], queryFn: fetchDashboardStats })
  const { data: openInquiries = 0 } = useQuery({
    queryKey: ['inquiries-open-count'],
    queryFn: getOpenInquiryCount,
    enabled: isAdmin,
  })
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: listUsers,
    enabled: isAdmin,
  })

  const items = visibleAdminNav(isAdmin, canEditAny)
  const counts = {
    pending: stats?.review_queue_pending ?? 0,
    openInquiries,
    pendingUsers: users.filter((user) => user.approval_status === 'pending').length,
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
  const { isAdmin, canEditAny } = usePermissions()
  return <Navigate to={isAdmin || canEditAny ? '/admin/review-queue' : SETTINGS_PATH} replace />
}
