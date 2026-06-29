import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { cancelJob, clearFinishedJobs, deleteJob } from '../../api/jobApi'
import { useJobsQuery } from '../../hooks/useJobsQuery'
import { usePermissions } from '../../hooks/usePermissions'
import type { BackgroundJob, JobStatus } from '../../types/job'
import { JOB_STATUS_LABEL } from '../../types/job'
import { apiErrorDetail } from '../../utils/apiError'
import { formatDate } from '../../utils/date'
import { isActiveJobStatus, jobProgressPercent, jobProgressSummary } from '../../utils/jobProgress'
import { useToast } from '../common/Toast'
import { Icon } from '../common/Icon'

function isActive(status: JobStatus) {
  return isActiveJobStatus(status)
}

function isFinished(status: JobStatus) {
  return status === 'success' || status === 'failed' || status === 'cancelled'
}

function progressPct(job: BackgroundJob) {
  return jobProgressPercent(job)
}

export function JobStatusPanel() {
  const qc = useQueryClient()
  const toast = useToast()
  const { canWrite } = usePermissions()
  const [open, setOpen] = useState(false)
  const prevActiveRef = useRef(0)
  const { data: jobs = [] } = useJobsQuery()

  const activeCount = jobs.filter((j) => isActive(j.status)).length
  const primaryActiveJob = jobs.find((j) => isActive(j.status))
  const primaryProgress = jobProgressSummary(primaryActiveJob)
  const finishedCount = jobs.filter((j) => isFinished(j.status)).length

  const invalidate = () => qc.invalidateQueries({ queryKey: ['jobs'] })

  const cancelMut = useMutation({
    mutationFn: cancelJob,
    onSuccess: () => {
      toast('작업을 취소했습니다.', 'info')
      invalidate()
    },
    onError: (e) => toast(apiErrorDetail(e) || '작업 취소 실패', 'err'),
  })

  const deleteMut = useMutation({
    mutationFn: deleteJob,
    onSuccess: () => {
      toast('작업 내역을 삭제했습니다.')
      invalidate()
    },
    onError: (e) => toast(apiErrorDetail(e) || '삭제 실패', 'err'),
  })

  const clearMut = useMutation({
    mutationFn: clearFinishedJobs,
    onSuccess: (res) => {
      toast(res.deleted ? `완료된 작업 ${res.deleted}건을 정리했습니다.` : '정리할 작업이 없습니다.', 'info')
      invalidate()
    },
    onError: (e) => toast(apiErrorDetail(e) || '정리 실패', 'err'),
  })

  const actionBusy = cancelMut.isPending || deleteMut.isPending || clearMut.isPending

  useEffect(() => {
    if (prevActiveRef.current > 0 && activeCount === 0) {
      qc.invalidateQueries({ queryKey: ['sources'] })
      qc.invalidateQueries({ queryKey: ['posts'] })
      qc.invalidateQueries({ queryKey: ['reports'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      qc.invalidateQueries({ queryKey: ['review-queue'] })
      qc.invalidateQueries({ queryKey: ['keywords'] })
      qc.invalidateQueries({ queryKey: ['news'] })
      qc.invalidateQueries({ queryKey: ['personal-feed'] })
      qc.invalidateQueries({ queryKey: ['personal-reports'] })
      qc.invalidateQueries({ queryKey: ['personal-reports', 'latest'] })
    }
    prevActiveRef.current = activeCount
  }, [activeCount, qc])

  useEffect(() => {
    if (activeCount > 0) setOpen(true)
  }, [activeCount])

  const handleCancel = (job: BackgroundJob) => {
    if (!window.confirm(`「${job.label}」 작업을 취소할까요?`)) return
    cancelMut.mutate(job.id)
  }

  const handleDelete = (job: BackgroundJob) => {
    if (!window.confirm(`「${job.label}」 작업 내역을 삭제할까요?`)) return
    deleteMut.mutate(job.id)
  }

  const handleClearFinished = () => {
    if (!finishedCount) return
    if (!window.confirm('완료·실패·취소된 모든 작업 내역을 목록에서 정리할까요?')) return
    clearMut.mutate()
  }

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
          <span>
            작업 {activeCount}건 실행 중
            {primaryProgress && (
              <span className="job-status-trigger-progress"> · {primaryProgress}</span>
            )}
          </span>
        ) : (
          <span>백그라운드 작업</span>
        )}
      </button>

      {open && (
        <div className="job-status-panel" role="region" aria-label="작업 목록">
          <div className="job-status-head">
            <strong>백그라운드 작업</strong>
            <div className="job-status-head-actions">
              {canWrite && finishedCount > 0 && (
                <button
                  type="button"
                  className="job-status-clear"
                  onClick={handleClearFinished}
                  disabled={actionBusy}
                >
                  완료 정리
                </button>
              )}
              <button type="button" className="job-status-close" onClick={() => setOpen(false)} aria-label="닫기">
                <Icon name="x" />
              </button>
            </div>
          </div>
          <p className="job-status-hint">
            {canWrite
              ? '잘못 시작한 작업은 취소할 수 있습니다. 완료된 내역은 개별 삭제 또는 「완료 정리」로 목록에서 제거하세요.'
              : '진행 중인 백그라운드 작업 상태를 확인할 수 있습니다.'}
          </p>
          <ul className="job-status-list">
            {jobs.map((job) => {
              const pct = progressPct(job)
              const summary = jobProgressSummary(job)
              return (
                <li key={job.id} className={`job-status-item status-${job.status}`}>
                  <div className="job-status-item-top">
                    <span className="job-status-label">{job.label}</span>
                    <div className="job-status-item-meta">
                      <span className={`job-status-badge badge-${job.status}`}>
                        {JOB_STATUS_LABEL[job.status]}
                      </span>
                      {canWrite && isActive(job.status) && (
                        <button
                          type="button"
                          className="job-status-action cancel"
                          onClick={() => handleCancel(job)}
                          disabled={actionBusy}
                          aria-label="작업 취소"
                        >
                          취소
                        </button>
                      )}
                      {canWrite && isFinished(job.status) && (
                        <button
                          type="button"
                          className="job-status-action delete"
                          onClick={() => handleDelete(job)}
                          disabled={actionBusy}
                          aria-label="작업 내역 삭제"
                        >
                          <Icon name="trash" />
                        </button>
                      )}
                    </div>
                  </div>
                  {(job.status === 'running' || job.status === 'pending') && job.progress_total > 0 && (
                    <div className="job-status-count" aria-live="polite">
                      {job.progress_current} / {job.progress_total}건
                    </div>
                  )}
                  {(job.status === 'running' || job.status === 'pending') && summary && (
                    <div className="job-status-msg">{summary}</div>
                  )}
                  {pct !== null && isActive(job.status) && (
                    <div className="job-status-bar" aria-hidden>
                      <div className="job-status-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                  {job.status === 'success' && job.result_message && (
                    <div className="job-status-result">{job.result_message}</div>
                  )}
                  {job.status === 'cancelled' && job.result_message && (
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
