import { apiClient } from './client'
import type { BackgroundJob } from '../types/job'
import type { DailyReport, DailyReportDetail } from '../types/report'

export async function listReports(): Promise<DailyReport[]> {
  const { data } = await apiClient.get<DailyReport[]>('/api/v1/reports')
  return data
}

export async function getReport(id: string): Promise<DailyReportDetail> {
  const { data } = await apiClient.get<DailyReportDetail>(`/api/v1/reports/${id}`)
  return data
}

export async function generateReport(reportDate?: string): Promise<BackgroundJob> {
  const { data } = await apiClient.post<BackgroundJob>('/api/v1/reports/generate', {
    report_date: reportDate || null,
  })
  return data
}

export async function sendReportSlack(id: string): Promise<{ success: boolean; message: string }> {
  const { data } = await apiClient.post(`/api/v1/reports/${id}/send-slack`)
  return data
}

export async function deleteReport(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/reports/${id}`)
}
