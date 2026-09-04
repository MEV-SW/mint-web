import { Outlet, useLocation } from 'react-router-dom'
import { ChatWidget } from '../chat/ChatWidget'
import { TopNav } from './TopNav'

export function AppLayout() {
  const { pathname } = useLocation()
  const showChat = pathname === '/' || pathname.startsWith('/news')

  return (
    <div className="app app-topnav">
      <TopNav />
      <div className="main">
        <div className="content">
          <Outlet />
        </div>
      </div>
      {showChat && <ChatWidget />}
    </div>
  )
}
