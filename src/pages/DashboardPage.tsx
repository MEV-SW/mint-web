import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchDashboardStats, type DashboardPostPreview } from '../api/statsApi'
import { ImportanceBadge, StatusPill } from '../components/common/Badges'
import { Icon } from '../components/common/Icon'
import { useAuthStore } from '../store/authStore'
import { formatDate } from '../utils/date'

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
          <Link to={emptyAction.to} className="dash-empty-link">
            {emptyAction.label} <Icon name="arrowRight" />
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className="dash-feed-list">
      {items.map((p) => (
        <Link key={p.id} to={`/posts/${p.id}`} className="dash-feed-item">
          <div className="dash-feed-main">
            <div className="dash-feed-title">{p.title}</div>
            {p.ai_summary ? (
              <p className="dash-feed-summary">{p.ai_summary}</p>
            ) : null}
            <div className="dash-feed-meta">
              {p.source_name && <span>{p.source_name}</span>}
              <span>{formatDate(p.collected_at)}</span>
            </div>
          </div>
          <div className="dash-feed-badges">
            <ImportanceBadge level={p.importance} />
            {p.board_type === 'discovery' && <StatusPill status={p.status} />}
          </div>
        </Link>
      ))}
    </div>
  )
}

function contextLine(stats: {
  pending_discovery: number
  latest_report: { title: string } | null
  trusted_preview: DashboardPostPreview[]
}): string {
  if (stats.pending_discovery > 0) {
    return `AI가 찾아둔 후보 ${stats.pending_discovery}건이 검토를 기다리고 있어요.`
  }
  if (stats.latest_report) {
    return '최신 브리핑과 게시판에서 오늘의 이슈를 확인해 보세요.'
  }
  if (stats.trusted_preview.length > 0) {
    return '수집된 소식 중 핵심만 골라 정리해 두었습니다.'
  }
  return '소스를 등록하고 크롤링을 시작하면 여기에 소식이 쌓입니다.'
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
  })

  const todayLabel = new Date().toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })

  const pending = stats?.pending_discovery ?? 0

  return (
    <div className="content-inner page-fade dash-page">
      <header className="dash-hero">
        <p className="dash-hero-date">{todayLabel}</p>
        <h1 className="dash-hero-title">안녕하세요, {user?.name}님</h1>
        <p className="dash-hero-lead">
          {stats ? contextLine(stats) : 'EV 충전·에너지 업계 브리핑을 모아둡니다.'}
        </p>
        <div className="dash-hero-actions">
          {pending > 0 && (
            <Link to="/discovery" className="dash-hero-btn dash-hero-btn-primary">
              <Icon name="sparkles" />
              발견 후보 검토 ({pending})
            </Link>
          )}
          <Link to="/reports" className="dash-hero-btn">
            <Icon name="doc" />
            데일리 리포트
          </Link>
          <Link to="/trusted" className="dash-hero-btn">
            <Icon name="shield" />
            중요 게시판
          </Link>
        </div>
      </header>

      {stats?.latest_report ? (
        <Link to={`/reports/${stats.latest_report.id}`} className="dash-briefing">
          <div className="dash-briefing-label">
            <Icon name="doc" />
            오늘의 브리핑
            {stats.latest_report.slack_sent && (
              <span className="dash-briefing-tag">
                <Icon name="slack" /> Slack 발송됨
              </span>
            )}
          </div>
          <h2 className="dash-briefing-title">{stats.latest_report.title}</h2>
          {stats.latest_report.summary && (
            <p className="dash-briefing-summary">{stats.latest_report.summary}</p>
          )}
          <span className="dash-briefing-more">
            전체 읽기 <Icon name="arrowRight" />
          </span>
        </Link>
      ) : (
        <div className="dash-briefing dash-briefing-empty">
          <div className="dash-briefing-label">
            <Icon name="doc" />
            데일리 리포트
          </div>
          <p className="dash-briefing-summary">
            아직 생성된 브리핑이 없습니다. 게시글이 쌓이면 리포트로 하루 동향을 정리할 수 있어요.
          </p>
          <Link to="/reports" className="dash-briefing-more">
            리포트 만들기 <Icon name="arrowRight" />
          </Link>
        </div>
      )}

      <div className="dash-columns">
        <section className="dash-column">
          <div className="dash-column-head">
            <h3>
              <Icon name="shield" />
              핵심 이슈
            </h3>
            <Link to="/trusted" className="dash-column-link">
              더보기
            </Link>
          </div>
          {isLoading ? (
            <p className="dash-empty">불러오는 중…</p>
          ) : (
            <PostPreviewList
              items={stats?.trusted_preview ?? []}
              emptyMessage="아직 중요 게시판에 올라온 글이 없습니다."
              emptyAction={{ label: '소스 관리로 이동', to: '/sources' }}
            />
          )}
        </section>

        <section className="dash-column dash-column-discovery">
          <div className="dash-column-head">
            <h3>
              <Icon name="sparkles" />
              AI 발견 · 검토
            </h3>
            <Link to="/discovery" className="dash-column-link">
              더보기
            </Link>
          </div>
          {isLoading ? (
            <p className="dash-empty">불러오는 중…</p>
          ) : (
            <PostPreviewList
              items={stats?.discovery_preview ?? []}
              emptyMessage="검토할 AI 발견 후보가 없습니다."
              emptyAction={{ label: 'AI 발견 실행', to: '/sources' }}
            />
          )}
        </section>
      </div>
    </div>
  )
}
