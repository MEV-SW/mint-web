import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { listJobs, runDailySequence } from '../api/jobApi'
import {
  crawlAllSources,
  crawlAllToDiscovery,
  getCollectionSettings,
  listSources,
  updateCollectionSettings,
} from '../api/sourceApi'
import { Btn } from '../components/common/Btn'
import { Icon } from '../components/common/Icon'
import { useToast } from '../components/common/Toast'
import { useConfirm } from '../components/common/useConfirm'
import { PageShell } from '../components/layout/PageShell'
import { DISCOVERY_BOARD_LABEL, DISCOVERY_PIPELINE_LABEL } from '../constants/boardLabels'
import { useJobActions } from '../hooks/useJobActions'
import { ACTIVE_JOB_POLL_MS } from '../hooks/useJobsQuery'
import { JOB_STATUS_LABEL, type BackgroundJob } from '../types/job'
import { COMMUNITY_SOURCE_TYPES } from '../types/source'
import { apiErrorDetail } from '../utils/apiError'
import { formatDateTime, formatShortDateTime } from '../utils/date'
import { isActiveJobStatus, jobProgressSummary, pickPrimaryActiveJob } from '../utils/jobProgress'

const LOG_LIMIT = 50
const SKELETON_DELAY_MS = 300

function isFinished(job: BackgroundJob) {
  return job.status === 'success' || job.status === 'failed' || job.status === 'cancelled'
}

function useDelayedFlag(flag: boolean, delayMs: number) {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    if (!flag) return
    const timer = window.setTimeout(() => setShown(true), delayMs)
    return () => {
      window.clearTimeout(timer)
      setShown(false)
    }
  }, [flag, delayMs])
  return flag && shown
}

/** 02 작업 로그 (mint-web#94) — pipeline runs, retention and recent jobs. Admin only. */
export function AdminJobsPage() {
  const toast = useToast()
  const confirm = useConfirm()
  const qc = useQueryClient()
  const jobActions = useJobActions()
  const [running, setRunning] = useState<string | null>(null)
  const [retentionDraft, setRetentionDraft] = useState<string | null>(null)

  const jobsQuery = useQuery({
    queryKey: ['jobs', 'log'],
    queryFn: () => listJobs({ limit: LOG_LIMIT }),
    refetchInterval: (query) =>
      query.state.data?.some((job) => isActiveJobStatus(job.status)) ? ACTIVE_JOB_POLL_MS : false,
  })
  const jobs = jobsQuery.data ?? []
  const activeJob = pickPrimaryActiveJob(jobs)
  const busy = Boolean(activeJob) || running !== null
  const blockedTitle = activeJob ? `진행 중인 작업: ${activeJob.label}` : undefined
  const showSkeleton = useDelayedFlag(jobsQuery.isLoading, SKELETON_DELAY_MS)

  const { data: sources = [] } = useQuery({ queryKey: ['sources'], queryFn: listSources })
  const communityCount = sources.filter((s) => COMMUNITY_SOURCE_TYPES.includes(s.source_type)).length

  const { data: collectionSettings } = useQuery({
    queryKey: ['collection-settings'],
    queryFn: getCollectionSettings,
  })
  const retentionDays = retentionDraft ?? String(collectionSettings?.discovery_pending_retention_days ?? 14)
  const retentionValid =
    retentionDays.trim() !== '' &&
    Number.isInteger(Number(retentionDays)) &&
    Number(retentionDays) >= 0 &&
    Number(retentionDays) <= 365
  const retentionDirty =
    collectionSettings != null &&
    retentionValid &&
    Number(retentionDays) !== collectionSettings.discovery_pending_retention_days

  const saveRetention = useMutation({
    mutationFn: () => updateCollectionSettings(Number(retentionDays)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collection-settings'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      setRetentionDraft(null)
      toast('탐문 후보 삭제 기한을 저장했습니다.')
    },
    onError: (e) => toast(apiErrorDetail(e) || '저장 실패', 'err'),
  })

  async function run(
    key: string,
    ask: { title: string; body?: string; confirmLabel: string; danger?: boolean },
    action: () => Promise<unknown>,
    okMessage: string,
    failMessage: string,
  ) {
    if (busy) return
    if (!(await confirm(ask))) return
    setRunning(key)
    try {
      await action()
      qc.invalidateQueries({ queryKey: ['jobs'] })
      toast(okMessage, 'info')
    } catch (e) {
      toast(apiErrorDetail(e) || failMessage, 'err')
    } finally {
      setRunning(null)
    }
  }

  const finishedCount = jobs.filter(isFinished).length

  return (
    <PageShell
      section="관리 · 작업 로그"
      title="작업 로그"
      lead="수집·탐문 파이프라인을 실행하고, 최근 작업 진행과 결과를 확인합니다. 실패한 소스는 소스 화면에서 다시 수집할 수 있습니다."
    >
      {activeJob && (
        <div className="busy-banner" role="status">
          <Icon name="clock" />
          <span>
            진행 중인 작업 ({activeJob.label}){jobProgressSummary(activeJob) ? ` — ${jobProgressSummary(activeJob)}` : ''}.
            완료 후 다시 실행할 수 있습니다.
          </span>
        </div>
      )}

      <section className="sources-block" aria-label="파이프라인 실행">
        <div className="sources-ops-grid">
          <article className="sources-op-card">
            <div className="sources-op-card-top">
              <div className="sources-op-card-icon sources-op-card-icon-crawl" aria-hidden>
                <Icon name="refresh" />
              </div>
              <div className="sources-op-card-text">
                <h3 className="sources-op-card-title">일일 수집 시퀀스</h3>
                <p className="sources-op-card-desc">
                  매일 05:30~08:10(KST) 자동 · 정리 → 전체 수집 → AI 발견 → 커뮤니티 탐문 → 리포트 (Slack 제외)
                </p>
              </div>
            </div>
            <div className="sources-op-card-controls">
              <Btn
                variant="soft"
                size="sm"
                icon="refresh"
                disabled={busy}
                title={blockedTitle}
                onClick={() =>
                  void run(
                    'crawl-all',
                    { title: '전체 소스 수집을 지금 실행할까요?', confirmLabel: '수집만 실행' },
                    crawlAllSources,
                    '전체 소스 수집을 백그라운드에서 시작했습니다.',
                    '전체 소스 수집 요청 실패',
                  )
                }
              >
                {running === 'crawl-all' ? '…' : '수집만'}
              </Btn>
              <Btn
                variant="primary"
                size="sm"
                icon="sparkles"
                disabled={busy}
                title={blockedTitle}
                onClick={() =>
                  void run(
                    'sequence',
                    {
                      title: '일일 작업 전체를 지금 실행할까요?',
                      body: '정리 단계에서 보존 기간이 지난 미승인 후보와 만료 기사가 삭제됩니다. Slack은 전송하지 않습니다.',
                      confirmLabel: '전체 실행',
                      danger: true,
                    },
                    runDailySequence,
                    '일일 전체 시퀀스를 백그라운드에서 시작했습니다.',
                    '일일 전체 시퀀스 요청 실패',
                  )
                }
              >
                {running === 'sequence' ? '…' : '전체 실행'}
              </Btn>
            </div>
          </article>

          <article className="sources-op-card">
            <div className="sources-op-card-top">
              <div className="sources-op-card-icon sources-op-card-icon-pipeline" aria-hidden>
                <Icon name="sparkles" />
              </div>
              <div className="sources-op-card-text">
                <h3 className="sources-op-card-title">{DISCOVERY_PIPELINE_LABEL}</h3>
                <p className="sources-op-card-desc">
                  신뢰 소스 전체 크롤링 · {DISCOVERY_BOARD_LABEL} 후보 수집 · 매일 06:00(KST)
                </p>
              </div>
            </div>
            <div className="sources-op-card-controls">
              <Btn
                variant="soft"
                size="sm"
                icon="sparkles"
                disabled={busy}
                title={blockedTitle}
                onClick={() =>
                  void run(
                    'discovery',
                    { title: `${DISCOVERY_PIPELINE_LABEL}을 지금 실행할까요?`, confirmLabel: '지금 실행' },
                    () => crawlAllToDiscovery({ trusted_only: true }),
                    '탐문 파이프라인을 백그라운드에서 시작했습니다.',
                    '탐문 파이프라인 요청 실패',
                  )
                }
              >
                {running === 'discovery' ? '…' : '지금 실행'}
              </Btn>
            </div>
          </article>

          <article className="sources-op-card">
            <div className="sources-op-card-top">
              <div className="sources-op-card-icon sources-op-card-icon-community" aria-hidden>
                <Icon name="feed" />
              </div>
              <div className="sources-op-card-text">
                <h3 className="sources-op-card-title">커뮤니티 탐문</h3>
                <p className="sources-op-card-desc">
                  국내 포럼·커뮤니티 소스 {communityCount}개 · 탐문 데스크 전용 · 매일 06:30(KST)
                </p>
              </div>
            </div>
            <div className="sources-op-card-controls">
              <Btn
                variant="soft"
                size="sm"
                icon="sparkles"
                disabled={busy}
                title={blockedTitle}
                onClick={() =>
                  void run(
                    'community',
                    { title: '커뮤니티 탐문을 지금 실행할까요?', confirmLabel: '지금 실행' },
                    () => crawlAllToDiscovery({ trusted_only: false, community_only: true }),
                    '커뮤니티 탐문 파이프라인을 백그라운드에서 시작했습니다.',
                    '커뮤니티 파이프라인 요청 실패',
                  )
                }
              >
                {running === 'community' ? '…' : '지금 실행'}
              </Btn>
            </div>
          </article>

          <article className="sources-op-card">
            <div className="sources-op-card-top">
              <div className="sources-op-card-icon sources-op-card-icon-policy" aria-hidden>
                <Icon name="clock" />
              </div>
              <div className="sources-op-card-text">
                <h3 className="sources-op-card-title">탐문 후보 삭제 기한</h3>
                <p className="sources-op-card-desc">검토 대기 {retentionDays}일 경과 시 05:30(KST) 자동 삭제</p>
              </div>
            </div>
            <div className="sources-op-card-controls">
              <label className="sources-retention-inline" htmlFor="discovery-retention-days">
                <span className="sources-retention-label">기한</span>
                <input
                  id="discovery-retention-days"
                  className="input"
                  type="number"
                  min={0}
                  max={365}
                  step={1}
                  inputMode="numeric"
                  value={retentionDays}
                  onChange={(e) => setRetentionDraft(e.target.value)}
                  aria-label="탐문 후보 삭제 기한(일)"
                  aria-invalid={!retentionValid}
                />
                <span className="sources-retention-unit">일</span>
              </label>
              <Btn
                variant="primary"
                size="sm"
                onClick={() => saveRetention.mutate()}
                disabled={!retentionDirty || !retentionValid || saveRetention.isPending}
              >
                {saveRetention.isPending ? '…' : '저장'}
              </Btn>
            </div>
          </article>
        </div>
      </section>

      <section className="sources-block job-log" aria-labelledby="job-log-heading">
        <header className="job-log-head">
          <h2 id="job-log-heading" className="sources-block-title">
            최근 작업
          </h2>
          {finishedCount > 0 && (
            <Btn variant="outline" size="sm" onClick={() => void jobActions.clearFinished()} disabled={jobActions.busy}>
              완료 정리
            </Btn>
          )}
        </header>

        {jobsQuery.isError && (
          <div className="job-log-error" role="alert">
            작업 목록을 불러오지 못했습니다.
            <Btn variant="outline" size="sm" onClick={() => void jobsQuery.refetch()}>
              다시 시도
            </Btn>
          </div>
        )}

        {showSkeleton && (
          <div className="job-log-skeleton" aria-busy="true" aria-label="작업 목록을 불러오는 중">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="job-log-skeleton-row" />
            ))}
          </div>
        )}

        {!jobsQuery.isLoading && !jobsQuery.isError && jobs.length === 0 && (
          <p className="job-log-empty">아직 실행한 작업이 없습니다. 위 카드에서 파이프라인을 실행할 수 있습니다.</p>
        )}

        {jobs.length > 0 && (
          <div className="tbl-wrap">
            <table className="tbl job-log-table">
              <thead>
                <tr>
                  <th className="job-log-col-label">작업</th>
                  <th className="job-log-col-status">상태</th>
                  <th className="job-log-col-progress">진행</th>
                  <th className="job-log-col-time">시작</th>
                  <th className="job-log-col-time">종료</th>
                  <th className="job-log-col-actions" aria-label="동작" />
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => {
                  const progress = isActiveJobStatus(job.status)
                    ? jobProgressSummary(job) ?? '진행 중'
                    : job.result_message || '—'
                  const startedAt = job.started_at ?? job.created_at
                  return (
                    <tr key={job.id} className={`job-log-row status-${job.status}`}>
                      <td data-label="작업">
                        <div className="job-log-label" title={job.label}>{job.label}</div>
                        {job.status === 'failed' && (
                          <div className="job-log-failure">
                            {job.error || job.result_message || '실패'}
                            <span className="job-log-failure-hint">
                              {' '}
                              실패한 소스는 <Link to="/admin/sources">소스 화면</Link>에서 ⋯ → 지금 수집으로 다시
                              돌릴 수 있습니다.
                            </span>
                          </div>
                        )}
                      </td>
                      <td data-label="상태">
                        <span className={`job-status-badge badge-${job.status}`}>{JOB_STATUS_LABEL[job.status]}</span>
                      </td>
                      <td data-label="진행">
                        <span className="job-log-progress" title={progress}>{progress}</span>
                      </td>
                      <td data-label="시작" className="mono job-log-time">
                        <time dateTime={startedAt} title={formatDateTime(startedAt)}>{formatShortDateTime(startedAt)}</time>
                      </td>
                      <td data-label="종료" className="mono job-log-time">
                        {job.finished_at ? (
                          <time dateTime={job.finished_at} title={formatDateTime(job.finished_at)}>
                            {formatShortDateTime(job.finished_at)}
                          </time>
                        ) : '—'}
                      </td>
                      <td className="job-log-actions">
                        {isActiveJobStatus(job.status) && (
                          <Btn
                            variant="outline"
                            size="sm"
                            onClick={() => void jobActions.cancel(job)}
                            disabled={jobActions.busy}
                          >
                            취소
                          </Btn>
                        )}
                        {isFinished(job) && (
                          <Btn
                            variant="ghost"
                            size="sm"
                            icon="trash"
                            aria-label="작업 내역 삭제"
                            onClick={() => void jobActions.remove(job)}
                            disabled={jobActions.busy}
                          />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PageShell>
  )
}
