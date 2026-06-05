import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchDashboardStats, type DashboardPostPreview } from '../api/statsApi'
import { ImportanceBadge, StatusPill } from '../components/common/Badges'
import { Icon } from '../components/common/Icon'
import { useAuthStore } from '../store/authStore'
import { formatDate } from '../utils/date'

function StatCard({
  icon,
  iconClass,
  label,
  value,
  unit,
  delta,
  to,
}: {
  icon: string
  iconClass: string
  label: string
  value: number
  unit: string
  delta: string
  to?: string
}) {
  const inner = (
    <div className="stat">
      <div className={`ic ${iconClass}`}>
        <Icon name={icon} />
      </div>
      <div className="lbl">{label}</div>
      <div className="val">
        {value}
        <span className="u">{unit}</span>
      </div>
      <div className="delta delta-flat">{delta}</div>
    </div>
  )
  if (to) {
    return (
      <Link to={to} className="stat-link">
        {inner}
      </Link>
    )
  }
  return inner
}

function PostPreviewList({
  items,
  emptyMessage,
  emptyAction,
}: {
  items: DashboardPostPreview[]
  emptyMessage: string
  emptyAction?: { label: string; to: string }
}) {
  if (!items.length) {
    return (
      <div className="dash-empty">
        <p>{emptyMessage}</p>
        {emptyAction && (
          <Link to={emptyAction.to} className="link">
            {emptyAction.label}
          </Link>
        )}
      </div>
    )
  }

  return (
    <>
      {items.map((p) => (
        <Link key={p.id} to={`/posts/${p.id}`} className="mini-row">
          <div className="mini-body">
            <div className="mini-t">{p.title}</div>
            <div className="mini-meta">
              <span className="src">{p.source_name || '출처 없음'}</span>
              <span>·</span>
              <span>{formatDate(p.collected_at)}</span>
            </div>
            {p.ai_summary && <div className="mini-summary">{p.ai_summary}</div>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
            <ImportanceBadge level={p.importance} />
            {p.board_type === 'discovery' && <StatusPill status={p.status} />}
          </div>
        </Link>
      ))}
    </>
  )
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
  })

  const todayLabel = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })

  return (
    <div className="content-inner page-fade">
      <div className="page-intro dash-intro">
        <div>
          <h2>안녕하세요, {user?.name}님</h2>
          <p>{todayLabel} · EV 충전·에너지 업계 동향을 한눈에 확인하세요.</p>
        </div>
        <div className="dash-quick-actions">
          <Link to="/sources" className="btn btn-soft">
            <Icon name="sparkles" /> AI 발견 실행
          </Link>
          <Link to="/reports" className="btn btn-outline">
            <Icon name="doc" /> 리포트
          </Link>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard
          icon="inbox"
          iconClass="ic-mint"
          label="오늘 신규 수집"
          value={stats?.new_today ?? 0}
          unit="건"
          delta="KST 기준"
          to="/discovery"
        />
        <StatCard
          icon="shield"
          iconClass="ic-info"
          label="중요 게시판"
          value={stats?.trusted_count ?? 0}
          unit="건"
          delta="게시 중"
          to="/trusted"
        />
        <StatCard
          icon="sparkles"
          iconClass="ic-med"
          label="AI 발견 검토 대기"
          value={stats?.pending_discovery ?? 0}
          unit="건"
          delta="승인·승격 필요"
          to="/discovery"
        />
        <StatCard
          icon="alert"
          iconClass="ic-high"
          label="중요도 높음"
          value={stats?.high_importance ?? 0}
          unit="건"
          delta="high · 검토·게시"
        />
      </div>

      <div className="dash-highlight">
        {stats?.latest_report ? (
          <div className="card card-pad report-hero dash-panel dash-report">
            <div className="section-head">
              <h3>최신 데일리 리포트</h3>
              <Link className="link" to={`/reports/${stats.latest_report.id}`}>
                상세 보기
              </Link>
            </div>
            <h4 className="dash-report-title">{stats.latest_report.title}</h4>
            <p className="dash-report-meta">
              기준일 {stats.latest_report.report_date}
              {stats.latest_report.slack_sent && (
                <span className="badge badge-mint" style={{ marginLeft: 8 }}>
                  <Icon name="slack" style={{ width: 12, height: 12 }} /> Slack 발송됨
                </span>
              )}
            </p>
          </div>
        ) : (
          <div className="card card-pad dash-panel dash-report">
            <div className="section-head">
              <h3>데일리 리포트</h3>
              <Link className="link" to="/reports">
                생성하기
              </Link>
            </div>
            <p className="dash-empty">아직 생성된 리포트가 없습니다. 게시글 수집 후 리포트를 만들어 보세요.</p>
          </div>
        )}

        <div className="card card-pad dash-panel dash-ops">
          <div className="section-head">
            <h3>운영 현황</h3>
          </div>
          <ul className="dash-ops-list">
            <li>
              <span>활성 소스</span>
              <strong>
                {stats?.active_sources ?? 0} / {stats?.total_sources ?? 0}
              </strong>
            </li>
            <li>
              <span>자동 스케줄</span>
              <strong>06:00 크롤 · 08:00 리포트</strong>
            </li>
            <li>
              <span>수동 작업</span>
              <Link to="/sources" className="link">
                소스 관리 · AI 발견
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="dash-boards">
        <div className="card card-pad dash-panel">
          <div className="section-head">
            <h3>중요 게시판</h3>
            <Link className="link" to="/trusted">
              전체 보기 <Icon name="chevR" style={{ width: 14, height: 14 }} />
            </Link>
          </div>
          {isLoading ? (
            <p className="dash-empty">불러오는 중…</p>
          ) : (
            <PostPreviewList
              items={stats?.trusted_preview ?? []}
              emptyMessage="중요 게시판에 등록된 글이 없습니다."
              emptyAction={{ label: '소스에서 수집하기', to: '/sources' }}
            />
          )}
        </div>

        <div className="card card-pad dash-panel">
          <div className="section-head">
            <h3>AI 발견 · 검토 대기</h3>
            <Link className="link" to="/discovery">
              전체 보기 <Icon name="chevR" style={{ width: 14, height: 14 }} />
            </Link>
          </div>
          {isLoading ? (
            <p className="dash-empty">불러오는 중…</p>
          ) : (
            <PostPreviewList
              items={stats?.discovery_preview ?? []}
              emptyMessage="검토 대기 중인 AI 발견 글이 없습니다."
              emptyAction={{ label: 'AI 발견 파이프라인 실행', to: '/sources' }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
