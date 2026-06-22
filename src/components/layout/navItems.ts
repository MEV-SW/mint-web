import { DISCOVERY_BOARD_LABEL } from '../../constants/boardLabels'

export interface NavItem {
  path: string
  label: string
  icon: string
  end?: boolean
  countKey?: 'pending'
}

export const APP_NAV_MAIN: NavItem[] = [
  { path: '/', label: '1면', icon: 'dashboard', end: true },
  { path: '/trusted', label: '중요', icon: 'shield' },
  { path: '/discovery', label: DISCOVERY_BOARD_LABEL, icon: 'sparkles', countKey: 'pending' },
  { path: '/reports', label: '리포트', icon: 'doc' },
]

export const APP_NAV_SETTINGS: NavItem[] = [
  { path: '/sources', label: '소스', icon: 'feed' },
  { path: '/slack', label: '웹훅', icon: 'slack' },
]

export const SETTINGS_PATHS = APP_NAV_SETTINGS.map((item) => item.path)

export const APP_NAV: NavItem[] = [...APP_NAV_MAIN, ...APP_NAV_SETTINGS]
