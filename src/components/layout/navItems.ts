export interface NavItem {
  path: string
  label: string
  icon: string
  end?: boolean
  countKey?: 'openInquiries' | 'pendingUsers'
  adminOnly?: boolean
  superAdminOnly?: boolean
  sourceReviewOnly?: boolean
}

export const APP_NAV_MAIN: NavItem[] = [
  { path: '/', label: '1면', icon: 'dashboard', end: true },
  { path: '/news', label: '뉴스', icon: 'feed' },
  { path: '/issues', label: '이슈', icon: 'inbox' },
  { path: '/reports', label: '리포트', icon: 'doc' },
]

export const SETTINGS_PATH = '/admin/settings'

export const APP_NAV_ADMIN_HUB: NavItem = {
  path: '/admin',
  label: '관리',
  icon: 'shield',
}

export const APP_NAV_ADMIN_SUB: NavItem[] = [
  { path: SETTINGS_PATH, label: '주제 관리', icon: 'settings' },
  {
    path: '/admin/accounts',
    label: '계정 관리',
    icon: 'shield',
    countKey: 'pendingUsers',
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
  {
    path: '/admin/issues',
    label: '이슈 정리',
    icon: 'inbox',
    adminOnly: true,
    superAdminOnly: true,
  },
  {
    path: '/admin/categories',
    label: '카테고리',
    icon: 'book',
    adminOnly: true,
    sourceReviewOnly: true,
  },
  {
    path: '/admin/inquiries',
    label: '문의',
    icon: 'message',
    countKey: 'openInquiries',
    adminOnly: true,
    superAdminOnly: true,
  },
]

export const ADMIN_PATHS = APP_NAV_ADMIN_SUB.map((item) => item.path)

export const APP_NAV: NavItem[] = [...APP_NAV_MAIN, APP_NAV_ADMIN_HUB, ...APP_NAV_ADMIN_SUB]

export function visibleAdminNav(
  isAdmin: boolean,
  canEditAny: boolean,
  canReviewSources: boolean,
): NavItem[] {
  return APP_NAV_ADMIN_SUB.filter((item) => {
    if (item.sourceReviewOnly) return canReviewSources
    if (item.superAdminOnly) return isAdmin
    if (item.adminOnly) return isAdmin || canEditAny
    return true
  })
}

export function adminNavBadgeCount(
  item: NavItem,
  counts: { openInquiries: number; pendingUsers: number },
): number {
  if (item.countKey === 'openInquiries') return counts.openInquiries
  if (item.countKey === 'pendingUsers') return counts.pendingUsers
  return 0
}
