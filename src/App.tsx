/**
 * MINT app shell: public auth routes, member layout, admin-only section.
 * See README.md for the full route map.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ToastProvider } from './components/common/Toast'
import { AdminIndexRedirect, AdminLayout } from './components/layout/AdminLayout'
import { AppLayout } from './components/layout/AppLayout'
import { DashboardPage } from './pages/DashboardPage'
import { LegacyLoginPage as LoginPage } from './pages/LoginPage.legacy'
import { RegisterPage } from './pages/RegisterPage'
import { PostDetailPage } from './pages/PostDetailPage'
import { ReportDetailPage } from './pages/ReportDetailPage'
import { ReportsPage } from './pages/ReportsPage'
import { SlackSettingsPage } from './pages/SlackSettingsPage'
import { HelpPage } from './pages/HelpPage'
import { SourcesPage } from './pages/SourcesPage'
import { InquiriesPage } from './pages/InquiriesPage'
import { AdminAccountsPage } from './pages/AdminAccountsPage'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { AdminRoute } from './routes/AdminRoute'
import { NewsPage } from './pages/NewsPage'
import { PersonalReportDetailPage } from './pages/PersonalReportDetailPage'
import { ReviewQueuePage } from './pages/ReviewQueuePage'
import { SettingsPage } from './pages/SettingsPage'

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
            <Route path="/register" element={<RegisterPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/news" element={<NewsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/keywords" element={<Navigate to="/settings" replace />} />
                <Route path="/trusted" element={<Navigate to="/news" replace />} />
                <Route path="/discovery" element={<Navigate to="/news" replace />} />
                <Route path="/posts/:id" element={<PostDetailPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/reports/:id" element={<ReportDetailPage />} />
                <Route path="/personal-reports/:id" element={<PersonalReportDetailPage />} />
                <Route path="/inquiries" element={<InquiriesPage />} />
                <Route path="/help" element={<HelpPage />} />
              </Route>
              <Route element={<AdminRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<AdminIndexRedirect />} />
                    <Route path="review-queue" element={<ReviewQueuePage />} />
                    <Route path="accounts" element={<AdminAccountsPage />} />
                    <Route path="accounts/users" element={<Navigate to="/admin/accounts" replace />} />
                    <Route path="accounts/inquiries" element={<Navigate to="/admin/accounts" replace />} />
                    <Route path="users" element={<Navigate to="/admin/accounts" replace />} />
                    <Route path="inquiries" element={<Navigate to="/admin/accounts" replace />} />
                    <Route path="sources" element={<SourcesPage />} />
                    <Route path="webhooks" element={<SlackSettingsPage />} />
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
