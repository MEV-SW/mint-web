import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchDashboardStats, type DashboardPostPreview } from '../api/statsApi'
import type { Importance } from '../types/post'
import { ImportanceBadge, StatusPill } from '../components/common/Badges'
import { Icon } from '../components/common/Icon'
import { DailyCorner } from '../components/dashboard/DailyCorner'
import { formatDate } from '../utils/date'

function ArticleByline({ post }: { post: DashboardPostPreview }) {
  return (
    <div className="np-byline">
      {post.source_name && <span className="np-byline-source">{post.source_name}</span>}
      <span className="np-byline-date">{formatDate(post.collected_at)}</span>
      <ImportanceBadge level={post.importance} />
      {post.board_type === 'discovery' && <StatusPill status={post.status} />}
    </div>
  )
}

function LeadArticle({ post }: { post: DashboardPostPreview }) {
  return (
    <Link to={`/posts/${post.id}`} className="np-article np-article-lead">
      <h3 className="np-headline np-headline-lead">{post.title}</h3>
      {post.ai_summary && <p className="np-dek">{post.ai_summary}</p>}
      <ArticleByline post={post} />
    </Link>
  )
}

function StandardArticle({ post }: { post: DashboardPostPreview }) {
  return (
    <Link to={`/posts/${post.id}`} className="np-article np-article-standard">
      <h4 className="np-headline">{post.title}</h4>
      {post.ai_summary && <p className="np-snippet">{post.ai_summary}</p>}
      <ArticleByline post={post} />
    </Link>
  )
}

function CompactArticle({ post }: { post: DashboardPostPreview }) {
  return (
    <Link to={`/posts/${post.id}`} className="np-article np-article-compact">
      <h4 className="np-headline np-headline-sm">{post.title}</h4>
      <ArticleByline post={post} />
    </Link>
  )
}

function EmptyBlock({ message, action }: { message: string; action?: { label: string; to: string } }) {
  return (
    <div className="np-empty">
      <p>{message}</p>
      {action && (
        <Link to={action.to} className="np-empty-link">
          {action.label} →
        </Link>
      )}
    </div>
  )
}

export function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
  })

  const now = new Date()
  const dateLine = now.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })

  const trusted = stats?.trusted_preview ?? []
  const discovery = stats?.discovery_preview ?? []
  const [lead, ...restTrusted] = trusted
  const sideTrusted = restTrusted.slice(0, 2)
  const gridTrusted = restTrusted.slice(2)

  return (
    <div className="content-inner page-fade np-page">
      <header className="np-masthead">
        <div className="np-masthead-top">
          <span className="np-edition">EV · 충전 · CSMS Intelligence</span>
          <span className="np-date">{dateLine}</span>
        </div>
        <h1 className="np-masthead-title">MINT Daily</h1>
        <p className="np-masthead-tagline">MotrexEV Intelligence &amp; News Tracker</p>
      </header>

      <div className="np-front">
        <section className="np-briefing">
          <div className="np-section-label">
            <span>AI 데일리 브리핑</span>
            {stats?.latest_report?.slack_sent && (
              <span className="np-briefing-sent">
                <Icon name="slack" /> Slack 발송
              </span>
            )}
          </div>

          {stats?.latest_report ? (
            <>
              <Link to={`/reports/${stats.latest_report.id}`} className="np-briefing-link">
                <h2 className="np-briefing-headline">{stats.latest_report.title}</h2>
              </Link>
              {stats.latest_report.summary && (
                <p className="np-briefing-lead">{stats.latest_report.summary}</p>
              )}
              {stats.latest_report.highlights.length > 0 && (
                <ol className="np-briefing-picks">
                  {stats.latest_report.highlights.map((h, i) => (
                    <li key={i}>
                      <Link to={`/reports/${stats.latest_report!.id}`} className="np-pick-row">
                        <span className="np-pick-num">{i + 1}</span>
                        <span className="np-pick-body">
                          <strong>{h.title}</strong>
                          {h.description && <span>{h.description}</span>}
                        </span>
                        {h.importance && (
                          <span className="np-pick-badge">
                            <ImportanceBadge level={h.importance as Importance} />
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
              <Link to={`/reports/${stats.latest_report.id}`} className="np-read-more">
                브리핑 전문 보기 →
              </Link>
            </>
          ) : (
            <div className="np-briefing-empty">
              <p>생성된 데일리 브리핑이 없습니다. 게시글이 쌓이면 AI가 하루 동향을 정리합니다.</p>
              <Link to="/reports" className="np-read-more">
                리포트 생성 →
              </Link>
            </div>
          )}
        </section>

        <aside className="np-edition-panel">
          <div className="np-section-label">오늘의 판</div>
          {isLoading ? (
            <p className="np-empty">집계 중…</p>
          ) : (
            <dl className="np-stats">
              <div>
                <dt>오늘 수집</dt>
                <dd>{stats?.new_today ?? 0}</dd>
              </div>
              <div>
                <dt>중요 게시판</dt>
                <dd>{stats?.trusted_count ?? 0}</dd>
              </div>
              <div>
                <dt>고중요도</dt>
                <dd>{stats?.high_importance ?? 0}</dd>
              </div>
              <div>
                <dt>AI 발견 대기</dt>
                <dd className={stats?.pending_discovery ? 'np-stat-alert' : undefined}>
                  {stats?.pending_discovery ?? 0}
                </dd>
              </div>
            </dl>
          )}
          {(stats?.pending_discovery ?? 0) > 0 && (
            <Link to="/discovery" className="np-edition-cta">
              <Icon name="sparkles" />
              발견 후보 {stats!.pending_discovery}건 검토
            </Link>
          )}
          {stats?.latest_report && (
            <p className="np-edition-note">
              최신 브리핑 · {stats.latest_report.report_date}
            </p>
          )}
          <DailyCorner />
        </aside>
      </div>

      <section className="np-section">
        <div className="np-section-head">
          <h2 className="np-section-title">중요 뉴스</h2>
          <Link to="/trusted" className="np-section-more">
            전체 보기 →
          </Link>
        </div>

        {isLoading ? (
          <p className="np-empty">불러오는 중…</p>
        ) : !lead ? (
          <EmptyBlock
            message="중요 게시판에 등록된 기사가 없습니다."
            action={{ label: '소스 관리', to: '/sources' }}
          />
        ) : (
          <div className="np-news-grid">
            <div className="np-news-lead-col">
              <LeadArticle post={lead} />
            </div>
            <div className="np-news-side-col">
              {sideTrusted.map((p) => (
                <StandardArticle key={p.id} post={p} />
              ))}
            </div>
            {gridTrusted.length > 0 && (
              <div className="np-news-rest-col">
                {gridTrusted.map((p) => (
                  <CompactArticle key={p.id} post={p} />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="np-section np-section-discovery">
        <div className="np-section-head">
          <h2 className="np-section-title">AI 발견 · 검토 대기</h2>
          <Link to="/discovery" className="np-section-more">
            전체 보기 →
          </Link>
        </div>

        {isLoading ? (
          <p className="np-empty">불러오는 중…</p>
        ) : discovery.length === 0 ? (
          <EmptyBlock
            message="검토할 AI 발견 후보가 없습니다."
            action={{ label: 'AI 발견 실행', to: '/sources' }}
          />
        ) : (
          <div className="np-discovery-row">
            {discovery.map((p) => (
              <StandardArticle key={p.id} post={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
