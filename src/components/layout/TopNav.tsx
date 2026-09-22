import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getOpenInquiryCount } from '../../api/inquiryApi'
import { listUsers } from '../../api/usersApi'
import { usePermissions } from '../../hooks/usePermissions'
import { useAuthStore } from '../../store/authStore'
import { logout as logoutRequest } from '../../api/authApi'
import { cx } from '../../utils/cx'
import { Icon } from '../common/Icon'
import { GlobalSearch } from './GlobalSearch'
import {
  ADMIN_PATHS,
  APP_NAV_ADMIN_HUB,
  APP_NAV_MAIN,
  adminNavBadgeCount,
  type NavItem,
} from './navItems'
import { JobStatusPanel } from '../jobs/JobStatusPanel'

function NavSeparator() {
  return <span className="topnav-link-sep" aria-hidden />
}

export function TopNav() {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const user = useAuthStore((s) => s.user)
  const { isAdmin, canEditAny, roleLabel } = usePermissions()
  const { data: openInquiries = 0 } = useQuery({
    queryKey: ['inquiries-open-count'],
    queryFn: getOpenInquiryCount,
    enabled: isAdmin,
  })
  const { data: pendingUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: listUsers,
    enabled: isAdmin,
  })

  async function handleLogout() {
    setUserMenuOpen(false)
    setMenuOpen(false)
    await logoutRequest()
  }

  const counts = {
    openInquiries,
    pendingUsers: isAdmin
      ? pendingUsers.filter((u) => u.approval_status === 'pending').length
      : 0,
  }

  const adminBadgeTotal = counts.openInquiries + counts.pendingUsers
  const adminActive =
    location.pathname === APP_NAV_ADMIN_HUB.path ||
    ADMIN_PATHS.some((path) => location.pathname.startsWith(path))

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const now = new Date()
  const renderNavLink = (item: NavItem, badgeOverride?: number) => {
    const badge = badgeOverride ?? adminNavBadgeCount(item, counts)
    return (
      <NavLink
        key={item.path}
        to={item.path}
        end={item.end ?? item.path === '/admin'}
        className={({ isActive }) =>
          cx('topnav-link', (isActive || (item.path === '/admin' && adminActive)) && 'active')
        }
        onClick={() => setMenuOpen(false)}
      >
        {item.label}
        {badge > 0 && <span className="topnav-badge">{badge}</span>}
      </NavLink>
    )
  }

  const mobileNav: NavItem[] = [...APP_NAV_MAIN, APP_NAV_ADMIN_HUB]

  return (
    <header className="topnav">
      <div className="topnav-bar">
        <Link to="/" className="topnav-brand" onClick={() => setMenuOpen(false)}>
          <div className="topnav-brand-mark" aria-hidden>
            M
          </div>
          <div className="topnav-brand-text">
            <span className="topnav-brand-name">MOTREXEV</span>
            <span className="topnav-brand-sub">Intelligence News &amp; Trend</span>
          </div>
          <span className="topnav-volume">VOL. {String(now.getMonth() + 1).padStart(2, '0')} / {now.getFullYear()}</span>
        </Link>

        <nav className="topnav-links" aria-label="주 메뉴">
          {APP_NAV_MAIN.map((item, index) => (
            <span key={item.path} className="topnav-link-wrap">
              {index > 0 && <NavSeparator />}
              {renderNavLink(item)}
            </span>
          ))}

          <span className="topnav-link-wrap">
            <NavSeparator />
            {renderNavLink(APP_NAV_ADMIN_HUB, adminBadgeTotal)}
          </span>
        </nav>

        <div className="topnav-actions">
          {canEditAny && <JobStatusPanel />}
          <GlobalSearch />
          <div
            className={cx('topnav-settings topnav-user-menu', userMenuOpen && 'open')}
            ref={userMenuRef}
          >
            <button
              type="button"
              className="topnav-user topnav-user-trigger topnav-user-chip"
              aria-expanded={userMenuOpen}
              aria-haspopup="true"
              onClick={() => setUserMenuOpen((v) => !v)}
            >
              <div className="topnav-user-avatar">{(user?.name || '?')[0]}</div>
              <div className="topnav-user-meta">
                <span className="topnav-user-name">{user?.name}</span>
                {roleLabel && <span className="topnav-user-role">{roleLabel}</span>}
              </div>
              <Icon name="chevD" className="topnav-settings-chev" />
            </button>
            {userMenuOpen && (
              <div className="topnav-settings-menu topnav-user-dropdown" role="menu">
                <NavLink
                  to="/inquiries"
                  role="menuitem"
                  className={({ isActive }) => cx('topnav-settings-item', isActive && 'active')}
                  onClick={() => {
                    setUserMenuOpen(false)
                    setMenuOpen(false)
                  }}
                >
                  <Icon name="message" />
                  <span>문의</span>
                </NavLink>
                <NavLink
                  to="/help"
                  role="menuitem"
                  className={({ isActive }) => cx('topnav-settings-item', isActive && 'active')}
                  onClick={() => {
                    setUserMenuOpen(false)
                    setMenuOpen(false)
                  }}
                >
                  <Icon name="book" />
                  <span>도움말</span>
                </NavLink>
                <button
                  type="button"
                  role="menuitem"
                  className="topnav-settings-item topnav-settings-item-btn"
                  onClick={() => {
                    void handleLogout()
                  }}
                >
                  <Icon name="logout" />
                  <span>로그아웃</span>
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            className="topnav-menu-btn"
            aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Icon name="menu" />
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="topnav-mobile" aria-label="모바일 메뉴">
          {mobileNav.map((item) => {
            const badge =
              item.path === '/admin' ? adminBadgeTotal : adminNavBadgeCount(item, counts)
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end ?? item.path === '/admin'}
                className={({ isActive }) =>
                  cx(
                    'topnav-mobile-link',
                    (isActive || (item.path === '/admin' && adminActive)) && 'active',
                  )
                }
                onClick={() => setMenuOpen(false)}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
                {badge > 0 && <span className="topnav-badge">{badge}</span>}
              </NavLink>
            )
          })}
          <div className="topnav-mobile-group">
            <div className="topnav-mobile-group-label">내 계정</div>
            <NavLink
              to="/inquiries"
              className={({ isActive }) => cx('topnav-mobile-link', isActive && 'active')}
              onClick={() => setMenuOpen(false)}
            >
              <Icon name="message" />
              <span>문의</span>
            </NavLink>
            <NavLink
              to="/help"
              className={({ isActive }) => cx('topnav-mobile-link', isActive && 'active')}
              onClick={() => setMenuOpen(false)}
            >
              <Icon name="book" />
              <span>도움말</span>
            </NavLink>
            <button
              type="button"
              className="topnav-mobile-link topnav-mobile-link-btn"
              onClick={() => {
                void handleLogout()
              }}
            >
              <Icon name="logout" />
              <span>로그아웃</span>
            </button>
          </div>
        </nav>
      )}
    </header>
  )
}
