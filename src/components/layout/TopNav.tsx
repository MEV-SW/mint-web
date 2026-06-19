import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchDashboardStats } from '../../api/statsApi'
import { useAuthStore } from '../../store/authStore'
import { cx } from '../../utils/cx'
import { Icon } from '../common/Icon'
import { MintLogo } from '../common/MintLogo'
import { GlobalSearch } from './GlobalSearch'
import { APP_NAV } from './navItems'
import { JobStatusPanel } from '../jobs/JobStatusPanel'

export function TopNav() {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { data: stats } = useQuery({ queryKey: ['dashboard-stats'], queryFn: fetchDashboardStats })
  const pending = stats?.pending_discovery ?? 0

  const dateShort = new Date().toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })

  return (
    <header className="topnav">
      <div className="topnav-bar">
        <Link to="/" className="topnav-brand" onClick={() => setMenuOpen(false)}>
          <MintLogo size={28} />
          <div className="topnav-brand-text">
            <span className="topnav-brand-name">MINT</span>
            <span className="topnav-brand-sub">Daily Intelligence</span>
          </div>
        </Link>

        <nav className="topnav-links" aria-label="주 메뉴">
          {APP_NAV.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) => cx('topnav-link', isActive && 'active')}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
              {item.countKey === 'pending' && pending > 0 && (
                <span className="topnav-badge">{pending}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="topnav-actions">
          <JobStatusPanel />
          <GlobalSearch />
          <Link to="/help" className="topnav-icon-btn" title="도움말" aria-label="도움말">
            <Icon name="help" />
          </Link>
          <div className="topnav-user">
            <div className="avatar">{(user?.name || '?')[0]}</div>
            <span className="topnav-user-name">{user?.name}</span>
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

      <div className="topnav-meta">
        <span>{dateShort}</span>
        <span className="topnav-meta-sep">·</span>
        <span>EV · 충전 · CSMS</span>
        {location.pathname !== '/' && (
          <>
            <span className="topnav-meta-sep">·</span>
            <span className="topnav-meta-path">{location.pathname}</span>
          </>
        )}
      </div>

      {menuOpen && (
        <nav className="topnav-mobile" aria-label="모바일 메뉴">
          {APP_NAV.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) => cx('topnav-mobile-link', isActive && 'active')}
              onClick={() => setMenuOpen(false)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.countKey === 'pending' && pending > 0 && (
                <span className="topnav-badge">{pending}</span>
              )}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  )
}
