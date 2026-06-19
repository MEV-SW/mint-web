export interface NavItem {
  path: string
  label: string
  icon: string
  end?: boolean
  countKey?: 'pending'
}

export const APP_NAV: NavItem[] = [
  { path: '/', label: '대시보드', icon: 'dashboard', end: true },
  { path: '/trusted', label: '중요', icon: 'shield' },
  { path: '/discovery', label: 'AI 발견', icon: 'sparkles', countKey: 'pending' },
  { path: '/sources', label: '소스', icon: 'feed' },
  { path: '/reports', label: '리포트', icon: 'doc' },
  { path: '/slack', label: 'Slack', icon: 'slack' },
]
