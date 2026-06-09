import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { ChatWidget } from '../chat/ChatWidget'
import { JobStatusPanel } from '../jobs/JobStatusPanel'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

const PAGE_META: Record<string, { title: string; crumb: string }> = {
  '/': { title: '대시보드', crumb: 'MINT / 개요' },
  '/trusted': { title: '중요 게시판', crumb: 'MINT / 게시판' },
  '/discovery': { title: 'AI 발견 게시판', crumb: 'MINT / 게시판' },
  '/sources': { title: '소스 관리', crumb: 'MINT / 운영' },
  '/reports': { title: '데일리 리포트', crumb: 'MINT / 운영' },
  '/slack': { title: 'Slack 설정', crumb: 'MINT / 운영' },
  '/help': { title: '도움말', crumb: 'MINT / 안내' },
}

export function AppLayout() {
  const { pathname } = useLocation()
  const [navOpen, setNavOpen] = useState(false)
  const base = pathname.startsWith('/posts/') ? '/trusted' : pathname
  const meta = PAGE_META[base] || { title: 'MINT', crumb: 'MINT' }
  const isDetail = pathname.startsWith('/posts/')

  useEffect(() => {
    setNavOpen(false)
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = navOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [navOpen])

  return (
    <div className={`app${navOpen ? ' nav-open' : ''}`}>
      <button
        type="button"
        className="sidebar-backdrop"
        aria-label="메뉴 닫기"
        onClick={() => setNavOpen(false)}
      />
      <Sidebar onNavigate={() => setNavOpen(false)} />
      <div className="main">
        <Header
          title={isDetail ? '게시글 상세' : meta.title}
          crumb={isDetail ? 'MINT / 게시판' : meta.crumb}
          onMenuToggle={() => setNavOpen((v) => !v)}
          navOpen={navOpen}
        />
        <JobStatusPanel />
        <div className="content">
          <Outlet />
        </div>
      </div>
      <ChatWidget />
    </div>
  )
}
