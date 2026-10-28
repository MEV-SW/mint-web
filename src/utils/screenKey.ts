/**
 * mint-server#213 — route-level screen keys for visit counts. Path parameters and
 * query strings are left out; redirect-only paths map to null and are not counted.
 * Keep in sync with SCREEN_KEYS in mint-server app/services/usage_service.py.
 */

const ADMIN_SCREENS = new Set([
  'settings',
  'categories',
  'sources',
  'discovery',
  'jobs',
  'issues',
  'accounts',
  'inquiries',
  'webhooks',
])

const PLAIN_SCREENS: Record<string, string> = {
  news: 'news',
  issues: 'issues',
  reports: 'reports',
  inquiries: 'inquiries',
  help: 'help',
}

const DETAIL_SCREENS: Record<string, string> = {
  issues: 'issue',
  topics: 'topic',
  posts: 'article',
  reports: 'report',
}

export function screenKey(pathname: string, search: string): string | null {
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length === 0) {
    return new URLSearchParams(search).get('kiosk') === '1' ? 'kiosk' : 'front'
  }
  const [head, second, ...rest] = parts
  if (head === 'admin') {
    if (second === undefined) return 'admin_home'
    return rest.length === 0 && ADMIN_SCREENS.has(second) ? `admin_${second}` : null
  }
  if (rest.length > 0) return null
  if (second === undefined) return PLAIN_SCREENS[head] ?? null
  return DETAIL_SCREENS[head] ?? null
}

export const SCREEN_LABELS: Record<string, string> = {
  front: '1면',
  kiosk: '키오스크',
  news: '뉴스',
  issues: '이슈',
  issue: '이슈 상세',
  topic: '토픽',
  article: '기사',
  reports: '리포트',
  report: '리포트 상세',
  inquiries: '문의',
  help: '도움말',
  admin_home: '관리 홈',
  admin_settings: '관리 · 주제',
  admin_categories: '관리 · 카테고리',
  admin_sources: '관리 · 소스',
  admin_discovery: '관리 · 탐문 후보',
  admin_jobs: '관리 · 작업 로그',
  admin_issues: '관리 · 이슈 병합',
  admin_accounts: '관리 · 계정',
  admin_inquiries: '관리 · 문의',
  admin_webhooks: '관리 · 웹훅',
}

export function screenLabel(key: string): string {
  return SCREEN_LABELS[key] ?? key
}
