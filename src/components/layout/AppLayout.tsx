import { Outlet } from 'react-router-dom'
import { ChatWidget } from '../chat/ChatWidget'
import { TopNav } from './TopNav'

export function AppLayout() {
  return (
    <div className="app app-topnav">
      <TopNav />
      <div className="main">
        <div className="content">
          <Outlet />
        </div>
      </div>
      <ChatWidget />
    </div>
  )
}
