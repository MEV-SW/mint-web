import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useJobsQuery } from '../../hooks/useJobsQuery'
import type { BackgroundJob, JobStatus } from '../../types/job'
import { JOB_STATUS_LABEL } from '../../types/job'
import { formatDate } from '../../utils/date'
import { Icon } from '../common/Icon'

function isActive(status: JobStatus) {
  return status === 'pending' || status === 'running'
}

function progressPct(job: BackgroundJob) {
  if (job.progress_total <= 0) return null
  return Math.min(100, Math.round((job.progress_current / job.progress_total) * 100))
}

export function JobStatusPanel() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const prevActiveRef = useRef(0)
  const { data: jobs = [] } = useJobsQuery()

  const activeCount = jobs.filter((j) => isActive(j.status)).length

  useEffect(() => {
    if (prevActiveRef.current > 0 && activeCount === 0) {
      qc.invalidateQueries({ queryKey: ['sources'] })
      qc.invalidateQueries({ queryKey: ['posts'] })
      qc.invalidateQueries({ queryKey: ['reports'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
    }
    prevActiveRef.current = activeCount
  }, [activeCount, qc])

  useEffect(() => {
    if (activeCount > 0) setOpen(true)
  }, [activeCount])

  return (
    <div className={`job-status-wrap${open ? ' open' : ''}`}>
      <button
        type="button"
        className={`job-status-trigger${activeCount ? ' active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="백그라운드 작업 상태"
      >
        <Icon name="refresh" className={activeCount ? 'spin' : ''} />
        {activeCount > 0 ? (
          <span>작업 {activeCount}건 실행 중</span>
        ) : (
          <span>백그라운드 작업</span>
        )}
      </button>

      {open && (
        <div className="job-status-panel" role="region" aria-label="작업 목록">
          <div className="job-status-head">
            <strong>백그라운드 작업</strong>
            <button type="button" className="job-status-close" onClick={() => setOpen(false)} aria-label="닫기">
              <Icon name="x" />
            </button>
          </div>
          <p className="job-status-hint">
            다른 크롤링·리포트 작업이 실행 중이면 새 작업을 시작할 수 없습니다. 완료 후 다시 시도해 주세요.
          </p>
          <ul className="job-status-list">
            {jobs.map((job) => {
              const pct = progressPct(job)
              return (
                <li key={job.id} className={`job-status-item status-${job.status}`}>
                  <div className="job-status-item-top">
                    <span className="job-status-label">{job.label}</span>
                    <span className={`job-status-badge badge-${job.status}`}>
                      {JOB_STATUS_LABEL[job.status]}
                    </span>
                  </div>
                  {(job.status === 'running' || job.status === 'pending') && job.progress_message && (
                    <div className="job-status-msg">{job.progress_message}</div>
                  )}
                  {pct !== null && isActive(job.status) && (
                    <div className="job-status-bar" aria-hidden>
                      <div className="job-status-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                  {job.status === 'success' && job.result_message && (
                    <div className="job-status-result">{job.result_message}</div>
                  )}
                  {job.status === 'failed' && job.error && (
                    <div className="job-status-error">{job.error}</div>
                  )}
                  <div className="job-status-time">{formatDate(job.created_at)}</div>
                </li>
              )
            })}
            {!jobs.length && (
              <li className="job-status-empty">최근 작업 내역이 없습니다.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
