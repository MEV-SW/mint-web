import { Outlet, useLocation, useSearchParams } from 'react-router-dom'
import { ChatWidget } from '../chat/ChatWidget'
import { TopNav } from './TopNav'
import { TopicsBar } from './TopicsBar'

export function AppLayout() {
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  const kioskOn = pathname === '/' && params.get('kiosk') === '1'
  const showTopics = pathname === '/'
  const showChat = !kioskOn && (pathname === '/' || pathname.startsWith('/news'))
  const appClassName = [
    'app',
    'app-topnav',
    kioskOn && 'app-kiosk',
    !kioskOn && showTopics && 'app-has-topics',
  ].filter(Boolean).join(' ')

  return (
    <div className={appClassName}>
      {!kioskOn && (
        <TopNav />
      )}
      <div className="main">
        <div className="content">
          {!kioskOn && showTopics && <TopicsBar />}
          <Outlet />
        </div>
      </div>
      {showChat && <ChatWidget />}
    </div>
  )
}
