import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchDashboardStats } from '../../api/statsApi'
import { useAuthStore } from '../../store/authStore'
import { cx } from '../../utils/cx'
import { Icon } from '../common/Icon'
import { MintLogo } from '../common/MintLogo'
import { GlobalSearch } from './GlobalSearch'
import {
  APP_NAV_MAIN,
  APP_NAV_SETTINGS,
  SETTINGS_PATHS,
} from './navItems'
import { JobStatusPanel } from '../jobs/JobStatusPanel'

const PATH_LABELS: Record<string, string> = {
  '/': '1면',
  '/trusted': '중요',
  '/discovery': 'AI 발견',
  '/reports': '리포트',
  '/sources': '설정 · 소스',
  '/slack': '설정 · Slack',
  '/help': '도움말',
}

function NavSeparator() {
  return <span className="topnav-link-sep" aria-hidden />
}

export function TopNav() {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { data: stats } = useQuery({ queryKey: ['dashboard-stats'], queryFn: fetchDashboardStats })
  const pending = stats?.pending_discovery ?? 0

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
  const sectionLabel = PATH_LABELS[location.pathname] ?? location.pathname

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
          {APP_NAV_MAIN.map((item, index) => (
            <span key={item.path} className="topnav-link-wrap">
              {index > 0 && <NavSeparator />}
              <NavLink
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
            </span>
          ))}

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
                  {APP_NAV_SETTINGS.map((item) => (
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

      <div className="topnav-section-bar">
        <span className="topnav-section-label">현재 섹션</span>
        <span className="topnav-section-name">{sectionLabel}</span>
      </div>

      <div className="topnav-rule topnav-rule-thin" aria-hidden />

      {menuOpen && (
        <nav className="topnav-mobile" aria-label="모바일 메뉴">
          {APP_NAV_MAIN.map((item) => (
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
          <div className="topnav-mobile-group">
            <div className="topnav-mobile-group-label">설정</div>
            {APP_NAV_SETTINGS.map((item) => (
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
        </nav>
      )}
    </header>
  )
}
