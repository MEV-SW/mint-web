import { Link } from 'react-router-dom'
import type { DashboardPostPreview, DashboardStats } from '../../api/statsApi'
import { ImportanceBadge } from '../common/Badges'
import { Icon } from '../common/Icon'
import { CommunityVoicesStrip } from './CommunityVoicesStrip'
import { DailyCorner } from './DailyCorner'
import { NewspaperMasthead } from './NewspaperMasthead'
import { formatDate } from '../../utils/date'
import { mediaUrl } from '../../utils/mediaUrl'

interface MintFrontPageProps {
  dateLabel: string
  year: number
  stats: DashboardStats | undefined
  loading?: boolean
}

function TrustedStory({ post }: { post: DashboardPostPreview }) {
  return (
    <Link to={`/posts/${post.id}`} className="np-story-card np-story-card-compact">
      <div className="np-story-card-kicker">{post.source_name ?? '신뢰 소스'}</div>
      <h3>{post.title}</h3>
      {post.ai_summary && <p>{post.ai_summary}</p>}
      <footer>
        <span>{formatDate(post.collected_at)}</span>
        <ImportanceBadge level={post.importance} />
      </footer>
    </Link>
  )
}

export function MintFrontPage({ dateLabel, year, stats, loading }: MintFrontPageProps) {
  const orgReport = stats?.latest_report
  const trusted = stats?.trusted_preview ?? []
  const voices = stats?.community_voices_preview ?? []
  const heroTrusted = trusted[0]
  const gridTrusted = trusted.slice(1, 5)

  return (
    <article className="np-newspaper-body">
      <NewspaperMasthead
        edition="DAILY EDITION"
        headline="MINT의 1면"
        dek="조직 전체 수집 · AI 브리핑 · 오늘의 판"
        dateLabel={dateLabel}
        volume={year}
      />

      <div className="np-front np-front-mint">
        <main className="np-briefing">
          {orgReport ? (
            <Link to={`/reports/${orgReport.id}`} className="np-briefing-link">
              <article className="np-lead-story">
                <div className="np-byline">
                  <span className="np-byline-source">AI Daily Briefing</span>
                  <span className="np-byline-date">{orgReport.report_date}</span>
                  {orgReport.slack_sent && (
                    <span className="np-briefing-sent">
                      <Icon name="slack" /> Slack
                    </span>
                  )}
                </div>
                <div className="np-lead-layout">
                  <div className="np-lead-copy">
                    <h2 className="np-lead-headline">{orgReport.title}</h2>
                    <p className="np-lead-dek">{orgReport.summary}</p>
                  </div>
                  {mediaUrl(orgReport.illustration_url) && (
                    <figure className="np-briefing-illustration">
                      <img src={mediaUrl(orgReport.illustration_url)!} alt="" />
                      <figcaption>오늘의 스케치</figcaption>
                    </figure>
                  )}
                </div>
              </article>
            </Link>
          ) : (
            <div className="np-briefing-empty">
              <p>오늘의 조직 브리핑이 아직 없습니다.</p>
              <Link to="/reports" className="np-read-more">
                리포트 보기 →
              </Link>
            </div>
          )}

          {orgReport && orgReport.highlights?.length > 0 && (
            <ol className="np-briefing-picks">
              {orgReport.highlights.slice(0, 4).map((item, index) => (
                <li key={`${item.title}-${index}`}>
                  <div className="np-pick-row np-pick-row-static">
                    <span className="np-pick-num">{index + 1}</span>
                    <span className="np-pick-body">
                      <strong>{item.title}</strong>
                      {item.description && <span>{item.description}</span>}
                    </span>
                    {item.importance && (
                      <span className="np-pick-badge">
                        <ImportanceBadge
                          level={item.importance as 'high' | 'medium' | 'low' | 'unknown'}
                        />
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}

          {!loading && heroTrusted && (
            <section className="np-subsection">
              <div className="np-section-label">중요 뉴스</div>
              <Link to={`/posts/${heroTrusted.id}`} className="np-briefing-link">
                <article className="np-sub-lead">
                  <h3>{heroTrusted.title}</h3>
                  {heroTrusted.ai_summary && <p>{heroTrusted.ai_summary}</p>}
                </article>
              </Link>
              {gridTrusted.length > 0 && (
                <div className="np-story-grid">
                  {gridTrusted.map((post) => (
                    <TrustedStory key={post.id} post={post} />
                  ))}
                </div>
              )}
            </section>
          )}

          <Link to="/reports" className="np-edition-cta">
            조직 리포트 전체 보기
            <Icon name="arrowRight" />
          </Link>
        </main>

        <aside className="np-edition-panel">
          <div className="np-section-label">오늘의 판</div>
          <dl className="np-stats">
            <div>
              <dt>오늘 수집</dt>
              <dd>{stats?.new_today ?? '—'}</dd>
            </div>
            <div>
              <dt>중요 뉴스</dt>
              <dd>{stats?.trusted_count ?? '—'}</dd>
            </div>
            <div>
              <dt>검수 대기</dt>
              <dd className={stats?.pending_discovery ? 'np-stat-alert' : undefined}>
                {stats?.pending_discovery ?? '—'}
              </dd>
            </div>
            <div>
              <dt>활성 소스</dt>
              <dd>
                {stats?.active_sources ?? '—'}
                <span className="np-stat-sub">/{stats?.total_sources ?? '—'}</span>
              </dd>
            </div>
          </dl>

          <DailyCorner />
        </aside>
      </div>

      <CommunityVoicesStrip voices={voices} loading={loading} />
    </article>
  )
}
