export type AdminNavGroup = '운영' | '콘텐츠' | '사람' | '연동'
export type BadgeTone = 'red' | 'amber' | 'gray'

export interface NavItem {
  path: string
  label: string
  icon: string
  end?: boolean
  countKey?: 'openInquiries' | 'pendingUsers'
  adminOnly?: boolean
  superAdminOnly?: boolean
  sourceReviewOnly?: boolean
  /** Admin sidebar (R5): display number "01"–"10", group, badge color. */
  no?: string
  group?: AdminNavGroup
  badgeTone?: BadgeTone
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

// R5 order. 01 관리 홈 (#96), 02 작업 로그 (#94) and 05 탐문 후보 (phase 2) are
// added together with their screens so the sidebar never links to an empty page.
export const APP_NAV_ADMIN_SUB: NavItem[] = [
  { path: SETTINGS_PATH, label: '주제', icon: 'settings', no: '03', group: '콘텐츠' },
  { path: '/admin/sources', label: '소스', icon: 'feed', adminOnly: true, no: '04', group: '콘텐츠' },
  {
    path: '/admin/categories',
    label: '카테고리',
    icon: 'book',
    adminOnly: true,
    sourceReviewOnly: true,
    no: '06',
    group: '콘텐츠',
  },
  {
    path: '/admin/issues',
    label: '이슈 병합',
    icon: 'inbox',
    adminOnly: true,
    superAdminOnly: true,
    no: '07',
    group: '콘텐츠',
  },
  {
    path: '/admin/accounts',
    label: '계정',
    icon: 'shield',
    countKey: 'pendingUsers',
    adminOnly: true,
    superAdminOnly: true,
    no: '08',
    group: '사람',
    badgeTone: 'red',
  },
  {
    path: '/admin/inquiries',
    label: '문의',
    icon: 'message',
    countKey: 'openInquiries',
    adminOnly: true,
    superAdminOnly: true,
    no: '09',
    group: '사람',
    badgeTone: 'amber',
  },
  {
    path: '/admin/webhooks',
    label: '웹훅',
    icon: 'slack',
    adminOnly: true,
    superAdminOnly: true,
    no: '10',
    group: '연동',
  },
]

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = ['운영', '콘텐츠', '사람', '연동']

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

/** Sidebar badge text: hidden at 0, "99+" above 99. */
export function formatNavBadge(count: number): string | null {
  if (count <= 0) return null
  return count > 99 ? '99+' : String(count)
}
