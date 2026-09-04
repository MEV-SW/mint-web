import { Outlet, useLocation, useSearchParams } from 'react-router-dom'
import { ChatWidget } from '../chat/ChatWidget'
import { TopNav } from './TopNav'

export function AppLayout() {
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  const kioskOn = pathname === '/' && params.get('kiosk') === '1'
  const showChat = !kioskOn && (pathname === '/' || pathname.startsWith('/news'))

  return (
    <div className={kioskOn ? 'app app-topnav app-kiosk' : 'app app-topnav'}>
      {!kioskOn && <TopNav />}
      <div className="main">
        <div className="content">
          <Outlet />
        </div>
      </div>
      {showChat && <ChatWidget />}
    </div>
  )
}
