import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getOpenInquiryCount } from '../../api/inquiryApi'
import { fetchDashboardStats } from '../../api/statsApi'
import { listUsers } from '../../api/usersApi'
import { usePermissions } from '../../hooks/usePermissions'
import { useAuthStore } from '../../store/authStore'
import { cx } from '../../utils/cx'
import { Icon } from '../common/Icon'
import { MintLogo } from '../common/MintLogo'
import { GlobalSearch } from './GlobalSearch'
import {
  APP_NAV_ADMIN,
  APP_NAV_MAIN,
  APP_NAV_SETTINGS,
  SETTINGS_PATHS,
  type NavItem,
} from './navItems'
import { JobStatusPanel } from '../jobs/JobStatusPanel'
import { DISCOVERY_BOARD_LABEL } from '../../constants/boardLabels'

const PATH_LABELS: Record<string, string> = {
  '/': '1면',
  '/trusted': '중요',
  '/discovery': DISCOVERY_BOARD_LABEL,
  '/reports': '리포트',
  '/inquiries': '문의',
  '/admin/users': '가입 승인',
  '/admin/inquiries': '문의 관리',
  '/sources': '설정 · 소스',
  '/slack': '설정 · 웹훅',
  '/help': '도움말',
}

function resolveSectionLabel(pathname: string, state: unknown): string {
  const exact = PATH_LABELS[pathname]
  if (exact) return exact

  const from = (state as { from?: string } | null)?.from
  if (from) {
    const fromLabel = PATH_LABELS[from.split('?')[0]]
    if (fromLabel) return fromLabel
  }

  if (pathname.startsWith('/posts/')) return '기사'
  if (pathname.startsWith('/reports/')) return '리포트'

  return 'MINT'
}

function NavSeparator() {
  return <span className="topnav-link-sep" aria-hidden />
}

function navBadgeCount(
  item: NavItem,
  counts: { pending: number; openInquiries: number; pendingUsers: number },
): number {
  if (item.countKey === 'pending') return counts.pending
  if (item.countKey === 'openInquiries') return counts.openInquiries
  if (item.countKey === 'pendingUsers') return counts.pendingUsers
  return 0
}

function filterNavItems(items: NavItem[], isAdmin: boolean): NavItem[] {
  return items.filter((item) => {
    if (item.adminOnly && !isAdmin) return false
    if (item.viewerOnly && isAdmin) return false
    return true
  })
}

export function TopNav() {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { isAdmin, roleLabel } = usePermissions()
  const { data: stats } = useQuery({ queryKey: ['dashboard-stats'], queryFn: fetchDashboardStats })
  const { data: openInquiries = 0 } = useQuery({
    queryKey: ['inquiries-open-count'],
    queryFn: getOpenInquiryCount,
    enabled: isAdmin,
  })
  const { data: pendingUsers = [] } = useQuery({
    queryKey: ['users', 'pending'],
    queryFn: () => listUsers('pending'),
    enabled: isAdmin,
  })

  const mainNav = filterNavItems(APP_NAV_MAIN, isAdmin)
  const adminNav = filterNavItems(APP_NAV_ADMIN, isAdmin)
  const settingsNav = filterNavItems(APP_NAV_SETTINGS, isAdmin)
  const mobileNav = [...mainNav, ...adminNav]

  const counts = {
    pending: stats?.pending_discovery ?? 0,
    openInquiries,
    pendingUsers: pendingUsers.length,
  }

  const settingsActive = SETTINGS_PATHS.includes(location.pathname)

  useEffect(() => {
    setSettingsOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const now = new Date()
  const dateFull = now.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
  const sectionLabel = resolveSectionLabel(location.pathname, location.state)

  const renderNavLink = (item: NavItem) => {
    const badge = navBadgeCount(item, counts)
    return (
      <NavLink
        key={item.path}
        to={item.path}
        end={item.end}
        className={({ isActive }) => cx('topnav-link', isActive && 'active')}
        onClick={() => setMenuOpen(false)}
      >
        {item.label}
        {badge > 0 && <span className="topnav-badge">{badge}</span>}
      </NavLink>
    )
  }

  return (
    <header className="topnav">
      <div className="topnav-dateline">
        <span className="topnav-edition">MotrexEV Intelligence · Daily Edition</span>
        <span className="topnav-dateline-date">{dateFull}</span>
        <span className="topnav-dateline-topic">EV · 충전 · CSMS</span>
      </div>

      <div className="topnav-rule" aria-hidden />

      <div className="topnav-bar">
        <Link to="/" className="topnav-brand" onClick={() => setMenuOpen(false)}>
          <MintLogo size={32} />
          <div className="topnav-brand-text">
            <span className="topnav-brand-name">MINT</span>
            <span className="topnav-brand-sub">MotrexEV News Tracker</span>
          </div>
        </Link>

        <nav className="topnav-links" aria-label="주 메뉴">
          {mainNav.map((item, index) => (
            <span key={item.path} className="topnav-link-wrap">
              {index > 0 && <NavSeparator />}
              {renderNavLink(item)}
            </span>
          ))}

          {adminNav.map((item) => (
            <span key={item.path} className="topnav-link-wrap">
              <NavSeparator />
              {renderNavLink(item)}
            </span>
          ))}

          {settingsNav.length > 0 && (
            <span className="topnav-link-wrap">
              <NavSeparator />
              <div
                className={cx('topnav-settings', settingsOpen && 'open')}
                ref={settingsRef}
              >
                <button
                  type="button"
                  className={cx('topnav-link topnav-settings-trigger', settingsActive && 'active')}
                  aria-expanded={settingsOpen}
                  aria-haspopup="true"
                  onClick={() => setSettingsOpen((v) => !v)}
                >
                  설정
                  <Icon name="chevD" className="topnav-settings-chev" />
                </button>
                {settingsOpen && (
                  <div className="topnav-settings-menu" role="menu">
                    {settingsNav.map((item) => (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        role="menuitem"
                        className={({ isActive }) =>
                          cx('topnav-settings-item', isActive && 'active')
                        }
                        onClick={() => {
                          setSettingsOpen(false)
                          setMenuOpen(false)
                        }}
                      >
                        <Icon name={item.icon} />
                        <span>{item.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            </span>
          )}
        </nav>

        <div className="topnav-actions">
          <JobStatusPanel />
          <GlobalSearch />
          <Link to="/help" className="topnav-icon-btn" title="도움말" aria-label="도움말">
            <Icon name="help" />
          </Link>
          <div className="topnav-user">
            <div className="avatar">{(user?.name || '?')[0]}</div>
            <div className="topnav-user-meta">
              <span className="topnav-user-name">{user?.name}</span>
              {roleLabel && <span className="topnav-user-role">{roleLabel}</span>}
            </div>
            <button type="button" className="topnav-icon-btn" title="로그아웃" onClick={logout}>
              <Icon name="logout" />
            </button>
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

      <div className="topnav-section-bar">
        <span className="topnav-section-label">현재 섹션</span>
        <span className="topnav-section-name">{sectionLabel}</span>
      </div>

      <div className="topnav-rule topnav-rule-thin" aria-hidden />

      {menuOpen && (
        <nav className="topnav-mobile" aria-label="모바일 메뉴">
          {mobileNav.map((item) => {
            const badge = navBadgeCount(item, counts)
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) => cx('topnav-mobile-link', isActive && 'active')}
                onClick={() => setMenuOpen(false)}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
                {badge > 0 && <span className="topnav-badge">{badge}</span>}
              </NavLink>
            )
          })}
          {settingsNav.length > 0 && (
            <div className="topnav-mobile-group">
              <div className="topnav-mobile-group-label">설정</div>
              {settingsNav.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => cx('topnav-mobile-link', isActive && 'active')}
                  onClick={() => setMenuOpen(false)}
                >
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          )}
        </nav>
      )}
    </header>
  )
}
