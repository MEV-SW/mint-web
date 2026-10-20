import { isAxiosError } from 'axios'
import { Link, Navigate } from 'react-router-dom'
import { Btn } from '../components/common/Btn'
import { PageShell } from '../components/layout/PageShell'
import { SETTINGS_PATH } from '../components/layout/navItems'
import { useAdminSummaryQuery } from '../hooks/useAdminSummaryQuery'
import { useJobsQuery } from '../hooks/useJobsQuery'
import { usePermissions } from '../hooks/usePermissions'
import { JOB_STATUS_LABEL } from '../types/job'
import { cx } from '../utils/cx'
import { formatDateTime } from '../utils/date'
import { jobProgressSummary, pickPrimaryActiveJob } from '../utils/jobProgress'

interface KpiCardProps {
  label: string
  value: number | null | undefined
  to: string
  tone: 'red' | 'amber'
  loading: boolean
}

function KpiCard({ label, value, to, tone, loading }: KpiCardProps) {
  const count = value ?? 0
  return (
    <Link to={to} className={cx('admin-kpi', count > 0 ? `tone-${tone}` : 'is-zero')}>
      <span className="admin-kpi-label">{label}</span>
      {loading ? (
        <span className="admin-kpi-skeleton" aria-hidden />
      ) : (
        <strong className="admin-kpi-value">{count.toLocaleString('ko-KR')}</strong>
      )}
    </Link>
  )
}

function TodayPipeline() {
  const { data: jobs = [] } = useJobsQuery()
  const active = pickPrimaryActiveJob(jobs)
  const last = jobs[0]
  return (
    <section className="card card-pad admin-home-pipeline" aria-labelledby="admin-home-pipeline">
      <div className="admin-home-section-head">
        <h2 id="admin-home-pipeline">오늘 파이프라인</h2>
        <Link to="/admin/jobs">02 작업 로그 →</Link>
      </div>
      {active ? (
        <p className="admin-home-pipeline-line tone-info">
          {active.label} 실행 중{jobProgressSummary(active) ? ` · ${jobProgressSummary(active)}` : ''}
        </p>
      ) : last ? (
        <p className={cx('admin-home-pipeline-line', last.status === 'failed' && 'tone-err')}>
          마지막 작업: {last.label} · {JOB_STATUS_LABEL[last.status]} ·{' '}
          {formatDateTime(last.finished_at ?? last.started_at ?? last.created_at)}
        </p>
      ) : (
        <p className="admin-home-pipeline-line">아직 실행한 작업이 없습니다.</p>
      )}
    </section>
  )
}

/** 01 관리 홈 (mint-web#96). Admin only; data from mint-server#174. */
export function AdminHomePage() {
  const summary = useAdminSummaryQuery()
  const forbidden = isAxiosError(summary.error) && summary.error.response?.status === 403
  const loading = summary.isLoading
  const data = summary.data

  return (
    <PageShell
      section="관리 · 관리 홈"
      title="관리 홈"
      lead="승인·문의·수집 실패·탐문 후보처럼 지금 처리할 일을 한눈에 봅니다."
    >
      {forbidden ? (
        <p className="admin-home-note">요약을 볼 권한이 없습니다. 권한이 바뀌었다면 다시 로그인해 주세요.</p>
      ) : summary.isError ? (
        <div className="job-log-error" role="alert">
          관리 요약을 불러오지 못했습니다.
          <Btn variant="outline" size="sm" onClick={() => void summary.refetch()}>
            다시 시도
          </Btn>
        </div>
      ) : (
        <>
          <div className="admin-kpi-grid">
            <KpiCard label="승인 대기" value={data?.pending_users} to="/admin/accounts" tone="red" loading={loading} />
            <KpiCard label="미답변 문의" value={data?.open_inquiries} to="/admin/inquiries" tone="amber" loading={loading} />
            <KpiCard label="수집 실패 소스" value={data?.failed_sources} to="/admin/sources" tone="red" loading={loading} />
            <KpiCard label="탐문 후보" value={data?.pending_candidates} to="/discovery" tone="amber" loading={loading} />
          </div>

          <TodayPipeline />

          <section className="card card-pad admin-home-editions" aria-labelledby="admin-home-editions">
            <div className="admin-home-section-head">
              <h2 id="admin-home-editions">분야별 상태</h2>
            </div>
            {!loading && (data?.editions.length ?? 0) === 0 ? (
              <p className="admin-home-note">활성 분야가 없습니다.</p>
            ) : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>분야</th>
                      <th className="num">소스</th>
                      <th className="num">실패 소스</th>
                      <th className="num">탐문 후보</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.editions ?? []).map((edition) => (
                      <tr key={edition.edition_id}>
                        <td>{edition.name}</td>
                        <td className="num">{edition.source_count}</td>
                        <td className={cx('num', edition.failed_source_count > 0 && 'admin-home-failed')}>
                          {edition.failed_source_count}
                        </td>
                        <td className="num">{edition.pending_candidate_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </PageShell>
  )
}

/** `/admin` index: admins get the home; everyone else keeps landing on 03 주제. */
export function AdminIndexRoute() {
  const { isAdmin } = usePermissions()
  if (!isAdmin) return <Navigate to={SETTINGS_PATH} replace />
  return <AdminHomePage />
}
