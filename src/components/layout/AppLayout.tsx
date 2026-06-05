import { Outlet, useLocation } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

const PAGE_META: Record<string, { title: string; crumb: string }> = {
  '/': { title: '대시보드', crumb: 'MINT / 개요' },
  '/trusted': { title: '중요 게시판', crumb: 'MINT / 게시판' },
  '/discovery': { title: 'AI 발견 게시판', crumb: 'MINT / 게시판' },
  '/sources': { title: '소스 관리', crumb: 'MINT / 운영' },
  '/reports': { title: '데일리 리포트', crumb: 'MINT / 운영' },
  '/slack': { title: 'Slack 설정', crumb: 'MINT / 운영' },
}

export function AppLayout() {
  const { pathname } = useLocation()
  const base = pathname.startsWith('/posts/') ? '/trusted' : pathname
  const meta = PAGE_META[base] || { title: 'MINT', crumb: 'MINT' }
  const isDetail = pathname.startsWith('/posts/')

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <Header title={isDetail ? '게시글 상세' : meta.title} crumb={isDetail ? 'MINT / 게시판' : meta.crumb} />
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
