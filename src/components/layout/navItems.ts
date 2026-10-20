export type AdminNavGroup = '운영' | '콘텐츠' | '사람' | '연동'
export type BadgeTone = 'red' | 'amber' | 'gray'

export interface NavItem {
  path: string
  label: string
  icon: string
  end?: boolean
  countKey?: 'openInquiries' | 'pendingUsers' | 'adminTotal' | 'failedSources'
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

// R5 order. 05 탐문 후보 (phase 2) is added together with its screen so the
// sidebar never links to an empty page.
export const APP_NAV_ADMIN_SUB: NavItem[] = [
  {
    path: '/admin',
    label: '관리 홈',
    icon: 'dashboard',
    end: true,
    countKey: 'adminTotal',
    adminOnly: true,
    superAdminOnly: true,
    no: '01',
    group: '운영',
    badgeTone: 'red',
  },
  {
    path: '/admin/jobs',
    label: '작업 로그',
    icon: 'refresh',
    adminOnly: true,
    superAdminOnly: true,
    no: '02',
    group: '운영',
  },
  { path: SETTINGS_PATH, label: '주제', icon: 'settings', no: '03', group: '콘텐츠' },
  {
    path: '/admin/sources',
    label: '소스',
    icon: 'feed',
    countKey: 'failedSources',
    adminOnly: true,
    no: '04',
    group: '콘텐츠',
    badgeTone: 'red',
  },
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

export const ADMIN_PATHS = APP_NAV_ADMIN_SUB.filter((item) => item.path !== '/admin').map((item) => item.path)

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
  counts: { openInquiries: number; pendingUsers: number; failedSources?: number },
): number {
  if (item.countKey === 'openInquiries') return counts.openInquiries
  if (item.countKey === 'pendingUsers') return counts.pendingUsers
  // Same value as TopNav's adminBadgeTotal.
  if (item.countKey === 'adminTotal') return counts.openInquiries + counts.pendingUsers
  if (item.countKey === 'failedSources') return counts.failedSources ?? 0
  return 0
}

/** The sidebar entry for a path: exact match for `end` items, otherwise the longest prefix. */
export function currentAdminNavItem(items: NavItem[], pathname: string): NavItem | undefined {
  const matches = items.filter((item) =>
    item.end ? pathname === item.path || pathname === `${item.path}/` : pathname.startsWith(item.path),
  )
  return matches.sort((a, b) => b.path.length - a.path.length)[0]
}

/** Sidebar badge text: hidden at 0, "99+" above 99. */
export function formatNavBadge(count: number): string | null {
  if (count <= 0) return null
  return count > 99 ? '99+' : String(count)
}
