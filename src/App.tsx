import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ToastProvider } from './components/common/Toast'
import { AppLayout } from './components/layout/AppLayout'
import { BoardPage } from './pages/BoardPage'
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
import { AdminUsersPage } from './pages/AdminUsersPage'
import { AdminInquiriesPage } from './pages/AdminInquiriesPage'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { AdminRoute } from './routes/AdminRoute'

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
                <Route path="/trusted" element={<BoardPage boardType="trusted" />} />
                <Route path="/discovery" element={<BoardPage boardType="discovery" />} />
                <Route path="/posts/:id" element={<PostDetailPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/reports/:id" element={<ReportDetailPage />} />
                <Route path="/inquiries" element={<InquiriesPage />} />
                <Route path="/help" element={<HelpPage />} />
              </Route>
              <Route element={<AdminRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/sources" element={<SourcesPage />} />
                  <Route path="/slack" element={<SlackSettingsPage />} />
                  <Route path="/admin/users" element={<AdminUsersPage />} />
                  <Route path="/admin/inquiries" element={<AdminInquiriesPage />} />
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
