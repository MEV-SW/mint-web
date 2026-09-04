export interface NavItem {
  path: string
  label: string
  icon: string
  end?: boolean
  countKey?: 'pending' | 'openInquiries' | 'pendingUsers'
  adminOnly?: boolean
  superAdminOnly?: boolean
}

export const APP_NAV_MAIN: NavItem[] = [
  { path: '/', label: '1면', icon: 'dashboard', end: true },
  { path: '/news', label: '뉴스', icon: 'feed' },
  { path: '/reports', label: '리포트', icon: 'doc' },
]

export const SETTINGS_PATH = '/admin/settings'

export const APP_NAV_ADMIN_HUB: NavItem = {
  path: '/admin',
  label: '관리',
  icon: 'shield',
}

export const APP_NAV_ADMIN_SUB: NavItem[] = [
  { path: SETTINGS_PATH, label: '설정', icon: 'settings' },
  { path: '/admin/review-queue', label: '검수함', icon: 'inbox', countKey: 'pending', adminOnly: true },
  {
    path: '/admin/accounts',
    label: '계정',
    icon: 'shield',
    countKey: 'pendingUsers',
    adminOnly: true,
    superAdminOnly: true,
  },
  {
    path: '/admin/inquiries',
    label: '문의',
    icon: 'message',
    countKey: 'openInquiries',
    adminOnly: true,
    superAdminOnly: true,
  },
  { path: '/admin/sources', label: '소스', icon: 'feed', adminOnly: true },
  {
    path: '/admin/webhooks',
    label: '웹훅',
    icon: 'slack',
    adminOnly: true,
    superAdminOnly: true,
  },
]

export const ADMIN_PATHS = APP_NAV_ADMIN_SUB.map((item) => item.path)

export const APP_NAV: NavItem[] = [...APP_NAV_MAIN, APP_NAV_ADMIN_HUB, ...APP_NAV_ADMIN_SUB]

export function visibleAdminNav(isAdmin: boolean, canEditAny: boolean): NavItem[] {
  return APP_NAV_ADMIN_SUB.filter((item) => {
    if (item.superAdminOnly) return isAdmin
    if (item.adminOnly) return isAdmin || canEditAny
    return true
  })
}

export function adminNavBadgeCount(
  item: NavItem,
  counts: { pending: number; openInquiries: number; pendingUsers: number },
): number {
  if (item.countKey === 'pending') return counts.pending
  if (item.countKey === 'openInquiries') return counts.openInquiries
  if (item.countKey === 'pendingUsers') return counts.pendingUsers
  return 0
}
