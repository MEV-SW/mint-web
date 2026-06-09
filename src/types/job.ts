export type JobType =
  | 'crawl_source'
  | 'crawl_source_discovery'
  | 'crawl_all_discovery'
  | 'crawl_all'
  | 'discovery_pipeline'
  | 'generate_report'
  | 'send_slack_report'
  | 'summarize_post'

export type JobStatus = 'pending' | 'running' | 'success' | 'failed'

export interface BackgroundJob {
  id: string
  organization_id: string
  job_type: JobType
  status: JobStatus
  label: string
  progress_current: number
  progress_total: number
  progress_message: string | null
  result_message: string | null
  error: string | null
  triggered_by: string | null
  started_at: string | null
  finished_at: string | null
  created_at: string
}

export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  pending: '대기',
  running: '실행 중',
  success: '완료',
  failed: '실패',
}
