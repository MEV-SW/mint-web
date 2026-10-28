import { apiClient } from './client'
import type { BackgroundJob } from '../types/job'
import type {
  WeeklyReportDetail,
  WeeklyReportEdit,
  WeeklyReportListItem,
  WeeklyReportUpdate,
} from '../types/weeklyReport'

export const WEEKLY_PAGE_SIZE = 12

export async function listWeeklyReports(
  editionId: string,
  before?: string,
): Promise<WeeklyReportListItem[]> {
  const { data } = await apiClient.get<WeeklyReportListItem[]>('/api/v1/weekly-reports', {
    params: { edition_id: editionId, limit: WEEKLY_PAGE_SIZE, ...(before ? { before } : {}) },
  })
  return data
}

export async function getWeeklyReport(id: string): Promise<WeeklyReportDetail> {
  const { data } = await apiClient.get<WeeklyReportDetail>(`/api/v1/weekly-reports/${id}`)
  return data
}

export async function updateWeeklyReport(id: string, body: WeeklyReportUpdate): Promise<WeeklyReportDetail> {
  const { data } = await apiClient.patch<WeeklyReportDetail>(`/api/v1/weekly-reports/${id}`, body)
  return data
}

export async function listWeeklyReportEdits(id: string): Promise<WeeklyReportEdit[]> {
  const { data } = await apiClient.get<WeeklyReportEdit[]>(`/api/v1/weekly-reports/${id}/edits`)
  return data
}

export async function generateWeeklyReports(body: {
  week_start?: string
  edition_id?: string
}): Promise<BackgroundJob> {
  const { data } = await apiClient.post<BackgroundJob>('/api/v1/weekly-reports/generate', body)
  return data
}

export async function deleteWeeklyReport(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/weekly-reports/${id}`)
}
