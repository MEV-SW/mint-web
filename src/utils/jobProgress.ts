import type { BackgroundJob, JobStatus } from '../types/job'

export function isActiveJobStatus(status: JobStatus) {
  return status === 'pending' || status === 'running'
}

export function jobProgressPercent(job: BackgroundJob) {
  if (job.progress_total <= 0) return null
  return Math.min(100, Math.round((job.progress_current / job.progress_total) * 100))
}

export function jobProgressSummary(job: BackgroundJob | undefined): string | null {
  if (!job || !isActiveJobStatus(job.status)) return null
  if (job.progress_message) return job.progress_message
  if (job.progress_total > 0) {
    return `${job.progress_current} / ${job.progress_total}건 처리 중`
  }
  if (job.status === 'pending') return '워커 시작 대기 중…'
  return '실행 중…'
}
