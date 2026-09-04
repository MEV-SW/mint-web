/**
 * MINT app shell: public auth routes, member layout, admin-only section.
 * See README.md for the full route map.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useSearchParams } from 'react-router-dom'
import { ToastProvider } from './components/common/Toast'
import { AdminIndexRedirect, AdminLayout } from './components/layout/AdminLayout'
import { AppLayout } from './components/layout/AppLayout'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { LoginCallbackPage } from './pages/LoginCallbackPage'
import { PostDetailPage } from './pages/PostDetailPage'
import { ReportDetailPage } from './pages/ReportDetailPage'
import { ReportsPage } from './pages/ReportsPage'
import { SlackSettingsPage } from './pages/SlackSettingsPage'
import { HelpPage } from './pages/HelpPage'
import { SourcesPage } from './pages/SourcesPage'
import { InquiriesPage } from './pages/InquiriesPage'
import { AdminAccountsPage } from './pages/AdminAccountsPage'
import { AdminInquiriesPage } from './pages/AdminInquiriesPage'
import { OnboardingGate } from './routes/OnboardingGate'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { AdminRoute, SuperAdminRoute } from './routes/AdminRoute'
import { NewsPage } from './pages/NewsPage'
import { ReviewQueuePage } from './pages/ReviewQueuePage'
import { SettingsPage } from './pages/SettingsPage'
import { TopicHubPage } from './pages/TopicHubPage'
import { legacyBoardToNewsPath } from './utils/newsListState'

function LegacyBoardRedirect({ board }: { board: 'trusted' | 'discovery' }) {
  const [params] = useSearchParams()
  return <Navigate to={legacyBoardToNewsPath(board, params)} replace />
}

function RedirectWithHash({ to }: { to: string }) {
  const { hash } = useLocation()
  return <Navigate to={`${to}${hash}`} replace />
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/login/callback" element={<LoginCallbackPage />} />
            <Route path="/register" element={<Navigate to="/login" replace />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route element={<OnboardingGate />}>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/news" element={<NewsPage />} />
                  <Route path="/settings" element={<RedirectWithHash to="/admin/settings" />} />
                  <Route path="/topics/:keywordId" element={<TopicHubPage />} />
                  <Route path="/keywords" element={<Navigate to="/admin/settings#editions" replace />} />
                  <Route path="/trusted" element={<LegacyBoardRedirect board="trusted" />} />
                  <Route path="/discovery" element={<LegacyBoardRedirect board="discovery" />} />
                  <Route path="/posts/:id" element={<PostDetailPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/reports/:id" element={<ReportDetailPage />} />
                  <Route path="/personal-reports/:id" element={<Navigate to="/" replace />} />
                  <Route path="/inquiries" element={<InquiriesPage />} />
                  <Route path="/help" element={<HelpPage />} />
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<AdminIndexRedirect />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route element={<AdminRoute />}>
                      <Route path="review-queue" element={<ReviewQueuePage />} />
                      <Route path="sources" element={<SourcesPage />} />
                      <Route element={<SuperAdminRoute />}>
                        <Route path="accounts" element={<AdminAccountsPage />} />
                        <Route path="accounts/users" element={<Navigate to="/admin/accounts" replace />} />
                        <Route path="accounts/inquiries" element={<Navigate to="/admin/inquiries" replace />} />
                        <Route path="users" element={<Navigate to="/admin/accounts" replace />} />
                        <Route path="inquiries" element={<AdminInquiriesPage />} />
                        <Route path="webhooks" element={<SlackSettingsPage />} />
                      </Route>
                    </Route>
                  </Route>
                  <Route path="/sources" element={<Navigate to="/admin/sources" replace />} />
                  <Route path="/slack" element={<Navigate to="/admin/webhooks" replace />} />
                </Route>
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  )
}
