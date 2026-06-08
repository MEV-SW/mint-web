import { NavLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchDashboardStats } from '../../api/statsApi'
import { useAuthStore } from '../../store/authStore'
import { cx } from '../../utils/cx'
import { Icon } from '../common/Icon'
import { MintLogo } from '../common/MintLogo'

const NAV = [
  {
    group: '개요',
    items: [
      { path: '/', label: '대시보드', icon: 'dashboard' },
      { path: '/help', label: '도움말', icon: 'help' },
    ],
  },
  {
    group: '게시판',
    items: [
      { path: '/trusted', label: '중요 게시판', icon: 'shield' },
      { path: '/discovery', label: 'AI 발견 게시판', icon: 'sparkles', countKey: 'pending' as const },
    ],
  },
  {
    group: '운영',
    items: [
      { path: '/sources', label: '소스 관리', icon: 'feed' },
      { path: '/reports', label: '데일리 리포트', icon: 'doc' },
      { path: '/slack', label: 'Slack 설정', icon: 'slack' },
    ],
  },
]

interface SidebarProps {
  onNavigate?: () => void
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { data: stats } = useQuery({ queryKey: ['dashboard-stats'], queryFn: fetchDashboardStats })
  const pending = stats?.pending_discovery ?? 0

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <MintLogo />
        <div>
          <div className="name">MINT</div>
        </div>
        <span className="ver">v1.0</span>
      </div>

      {NAV.map((g) => (
        <div key={g.group}>
          <div className="nav-group-label">{g.group}</div>
          {g.items.map((it) => (
            <NavLink
              key={it.path}
              to={it.path}
              end={it.path === '/'}
              className={({ isActive }) => cx('nav-item', isActive && 'active')}
              onClick={onNavigate}
            >
              <Icon name={it.icon} />
              <span>{it.label}</span>
              {'countKey' in it && pending > 0 && <span className="count">{pending}</span>}
            </NavLink>
          ))}
        </div>
      ))}

      <div className="sidebar-foot">
        <div className="nav-group-label">계정</div>
        <div className="user-chip">
          <div className="avatar">{(user?.name || '?')[0]}</div>
          <div className="meta">
            <div className="nm">{user?.name}</div>
            <div className="rl">관리자 · {user?.role}</div>
          </div>
          <button
            type="button"
            className="icon-btn"
            style={{ width: 32, height: 32, border: 'none', marginLeft: 'auto' }}
            title="로그아웃"
            onClick={logout}
          >
            <Icon name="logout" />
          </button>
        </div>
      </div>
    </aside>
  )
}
