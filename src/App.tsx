import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ToastProvider } from './components/common/Toast'
import { AppLayout } from './components/layout/AppLayout'
import { BoardPage } from './pages/BoardPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { PostDetailPage } from './pages/PostDetailPage'
import { ReportDetailPage } from './pages/ReportDetailPage'
import { ReportsPage } from './pages/ReportsPage'
import { SlackSettingsPage } from './pages/SlackSettingsPage'
import { SourcesPage } from './pages/SourcesPage'
import { ProtectedRoute } from './routes/ProtectedRoute'

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
                <Route path="/sources" element={<SourcesPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/reports/:id" element={<ReportDetailPage />} />
                <Route path="/slack" element={<SlackSettingsPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  )
}
