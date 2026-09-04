import { Link } from 'react-router-dom'
import type { DashboardPostPreview, DashboardStats } from '../../api/statsApi'
import { CommunityVoicesStrip } from './CommunityVoicesStrip'
import { DailyCorner } from './DailyCorner'
import { EditorialPhotoSlot } from './EditorialPhotoSlot'
import { usePermissions } from '../../hooks/usePermissions'
import { formatDate } from '../../utils/date'
import { mediaUrl } from '../../utils/mediaUrl'

type OrgReport = NonNullable<DashboardStats['latest_report']>

interface MintFrontPageProps {
  dateLabel: string
  year: number
  stats: DashboardStats | undefined
  loading?: boolean
  editionName?: string
  editionSlug?: string
  missingSources?: boolean
  featuredKeywords?: { id: string; name: string }[]
  stories?: DashboardPostPreview[]
  report?: OrgReport | null
}

function levelLabel(level: string | null | undefined): string {
  if (level === 'high') return '높음'
  if (level === 'medium') return '보통'
  if (level === 'low') return '낮음'
  return '미정'
}

function levelClass(level: string | null | undefined): string {
  if (level === 'high') return 'np-level-high'
  if (level === 'medium') return 'np-level-med'
  return 'np-level-low'
}

function shortDate(iso: string): string {
  try {
    const d = new Date(iso)
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${m}-${day}`
  } catch {
    return formatDate(iso)
  }
}

export function MintFrontPage({
  dateLabel: _dateLabel,
  year: _year,
  stats,
  loading,
  editionName,
  editionSlug,
  missingSources,
  featuredKeywords = [],
  stories,
  report,
}: MintFrontPageProps) {
  const { isAdmin } = usePermissions()
  const orgReport = report === undefined ? stats?.latest_report : report
  const trusted = stories ?? stats?.trusted_preview ?? []
  const discovery = stats?.discovery_preview ?? []
  const voices = stats?.community_voices_preview ?? []

  const MAJOR_NEWS_COUNT = 7
  const DEEPER_COUNT = 4
  const WIRE_COUNT = 4

  const heroTrusted = trusted[0]
  const secondary = trusted.slice(1, 3)
  const listNews = heroTrusted
    ? trusted.slice(3, 3 + MAJOR_NEWS_COUNT)
    : trusted.slice(0, MAJOR_NEWS_COUNT)

  const usedIds = new Set<string>([
    ...(heroTrusted ? [heroTrusted.id] : []),
    ...secondary.map((p) => p.id),
    ...listNews.map((p) => p.id),
  ])

  const deeperTrusted = trusted.filter((p) => !usedIds.has(p.id)).slice(0, DEEPER_COUNT)
  deeperTrusted.forEach((p) => usedIds.add(p.id))
  const deeperFill = discovery
    .filter((p) => !usedIds.has(p.id))
    .slice(0, Math.max(0, DEEPER_COUNT - deeperTrusted.length))
  deeperFill.forEach((p) => usedIds.add(p.id))
  const deeper = [...deeperTrusted, ...deeperFill]

  const wireNews = discovery.filter((p) => !usedIds.has(p.id)).slice(0, WIRE_COUNT)

  const heroIllustration = mediaUrl(orgReport?.illustration_url)
  const highlights = orgReport?.highlights?.slice(0, 4) ?? []
  const keywordLabel = featuredKeywords.slice(0, 4).map((item) => item.name).join(' · ')

  return (
    <article className="np-newspaper-body np-edition-sample">
      {(editionName || featuredKeywords.length > 0 || missingSources) && (
        <div className="np-personal-strip">
          <div className="np-personal-strip-left">
            <span className="np-personal-strip-title">{editionName ?? '조직 지면'}</span>
            {featuredKeywords.length > 0 && (
              <>
                <span className="np-personal-strip-sep" aria-hidden />
                <span className="np-personal-strip-meta">
                  메인 키워드 <b>{keywordLabel || `${featuredKeywords.length}개`}</b>
                </span>
              </>
            )}
          </div>
          {isAdmin && (
            <div className="np-personal-strip-right">
              <Link to="/admin/settings#editions" className="np-personal-edit">
                지면 설정
              </Link>
            </div>
          )}
        </div>
      )}

      {missingSources && (
        <div className="np-onboarding-banner">
          <p>
            이 지면은 관련 소스가 없어 비어 있을 수 있습니다. 소스에 분야 태그를 붙이거나 일반
            소스를 등록해 주세요.
          </p>
          {isAdmin && (
            <Link to="/sources" className="btn btn-outline btn-sm">
              소스 등록
            </Link>
          )}
        </div>
      )}

      <section className="np-brief-band" aria-label="AI 데일리 브리핑">
        <div className="np-brief-band-main">
          <div className="np-brief-band-meta">
            <span className="np-brief-band-kicker">AI Daily Briefing</span>
            {orgReport ? (
              <span className="np-brief-band-meta-sub">
                {orgReport.report_date}
                {orgReport.slack_sent ? ' · Slack 전송됨' : ''}
              </span>
            ) : (
              <span className="np-brief-band-meta-sub">
                {editionName ? `${editionName} 브리핑` : '조직 브리핑'}
              </span>
            )}
            <span className="np-brief-band-rule" aria-hidden />
          </div>
          {orgReport ? (
            <>
              <Link to={`/reports/${orgReport.id}`} className="np-brief-band-title">
                {orgReport.title}
              </Link>
              {orgReport.summary && <p className="np-brief-band-copy">{orgReport.summary}</p>}
            </>
          ) : (
            <div className="np-briefing-empty np-briefing-empty-inline">
              <p>오늘의 조직 브리핑이 아직 없습니다.</p>
              <Link to="/reports" className="np-read-more">
                리포트 보기 →
              </Link>
            </div>
          )}
        </div>
        <div className="np-brief-band-picks">
          {highlights.length > 0 ? (
            highlights.map((item, index) => {
              const postId = item.related_post_ids?.[0]
              const inner = (
                <>
                  <span className="np-brief-pick-n">{index + 1}</span>
                  <span className="np-brief-pick-title">{item.title}</span>
                </>
              )
              return postId ? (
                <Link key={`${item.title}-${index}`} to={`/posts/${postId}`} className="np-brief-pick">
                  {inner}
                </Link>
              ) : (
                <div key={`${item.title}-${index}`} className="np-brief-pick np-brief-pick-static">
                  {inner}
                </div>
              )
            })
          ) : (
            <p className="np-brief-band-empty">주요 브리핑 항목이 준비되면 이곳에 표시됩니다.</p>
          )}
        </div>
      </section>

      <div className="np-trio">
        <div className="np-trio-a">
          {!loading && heroTrusted ? (
            <>
              <div className="np-top-kicker">
                <span className="np-top-kicker-label">Top Story</span>
                <span className="np-top-kicker-meta">
                  중요도 {levelLabel(heroTrusted.importance)}
                </span>
              </div>
              <Link to={`/posts/${heroTrusted.id}`} className="np-top-headline">
                {heroTrusted.title}
              </Link>
              <div className="np-top-body">
                {heroTrusted.ai_summary ? (
                  <p className="np-top-dek">{heroTrusted.ai_summary}</p>
                ) : (
                  <p className="np-top-dek">요약이 준비되면 이곳에 표시됩니다.</p>
                )}
                <EditorialPhotoSlot
                  src={heroIllustration}
                  seed={
                    orgReport?.report_date ??
                    heroTrusted.id ??
                    heroTrusted.title
                  }
                  canRegenerate={isAdmin}
                  request={{
                    reportId: orgReport?.id,
                    title: orgReport?.title ?? heroTrusted.title,
                    summary: orgReport?.summary ?? heroTrusted.ai_summary,
                    seed: orgReport?.report_date ?? heroTrusted.id,
                  }}
                />
              </div>
              <div className="np-top-meta">
                {heroTrusted.source_name ?? '신뢰 소스'} · {formatDate(heroTrusted.collected_at)}
              </div>

              {secondary.length > 0 && (
                <>
                  <div className="np-top-rule" aria-hidden />
                  <div className="np-subpair">
                    {secondary.map((post, i) => (
                      <article
                        key={post.id}
                        className={`np-subpair-item${i === 0 ? ' np-subpair-item-lead' : ''}`}
                      >
                        <div className="np-subpair-kicker">
                          {post.source_name ?? '뉴스'}
                        </div>
                        <Link to={`/posts/${post.id}`} className="np-subpair-title">
                          {post.title}
                        </Link>
                        {post.ai_summary && <p className="np-subpair-dek">{post.ai_summary}</p>}
                        <div className="np-subpair-meta">
                          {post.source_name ?? '출처'} · {shortDate(post.collected_at)}
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}

              {deeper.length > 0 && (
                <section className="np-col-digest" aria-label="이어서 읽기">
                  <div className="np-col-digest-head">
                    <span>이어서 읽기</span>
                    <span>{deeper.length}건</span>
                  </div>
                  <ul className="np-col-digest-list">
                    {deeper.map((post) => (
                      <li key={post.id}>
                        <Link to={`/posts/${post.id}`} className="np-col-digest-row">
                          <span className="np-col-digest-body">
                            <strong>{post.title}</strong>
                            {post.ai_summary && <em>{post.ai_summary}</em>}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {wireNews.length > 0 && (
                <section className="np-col-wire" aria-label="탐문 속보">
                  <div className="np-col-digest-head">
                    <span>탐문 속보</span>
                    <Link to="/news" className="np-col-wire-link">
                      더보기
                    </Link>
                  </div>
                  <ul className="np-col-wire-list">
                    {wireNews.map((post) => (
                      <li key={post.id}>
                        <Link to={`/posts/${post.id}`} className="np-col-wire-row">
                          <span className="np-col-wire-dot" aria-hidden />
                          <span className="np-col-wire-title">{post.title}</span>
                          <span className="np-col-wire-meta">
                            {post.source_name ?? '탐문'} · {shortDate(post.collected_at)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          ) : (
            <div className="np-briefing-empty">
              <p>
                {loading
                  ? '헤드라인을 불러오는 중…'
                  : missingSources
                    ? '관련 소스가 없어 이 지면이 비어 있습니다.'
                    : '표시할 톱기사가 아직 없습니다.'}
              </p>
              <Link to={missingSources && isAdmin ? '/sources' : '/news'} className="np-read-more">
                {missingSources && isAdmin ? '소스 등록 →' : '뉴스 보기 →'}
              </Link>
            </div>
          )}
        </div>

        <div className="np-trio-b">
          <div className="np-list-head">
            <div className="np-list-head-title">주요 뉴스</div>
            <div className="np-list-head-count">{listNews.length}건</div>
          </div>
          {listNews.length > 0 ? (
            listNews.map((post: DashboardPostPreview) => (
              <Link key={post.id} to={`/posts/${post.id}`} className="np-list-row">
                <div className="np-list-row-meta">
                  <span className={`np-list-level ${levelClass(post.importance)}`}>
                    ● {levelLabel(post.importance)}
                  </span>
                  <span className="np-list-kicker">{post.source_name ?? '뉴스'}</span>
                </div>
                <h4 className="np-list-title">{post.title}</h4>
                {post.ai_summary && <p className="np-list-dek">{post.ai_summary}</p>}
                <div className="np-list-foot">
                  {post.source_name ?? '출처'} · {shortDate(post.collected_at)}
                </div>
              </Link>
            ))
          ) : (
            <p className="np-brief-band-empty">수집된 뉴스가 없습니다.</p>
          )}
          <Link to="/news" className="np-list-more">
            전체 뉴스 보기 →
          </Link>
        </div>

        <aside className="np-trio-c">
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
              <dt>탐문 대기</dt>
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
          <DailyCorner editionSlug={editionSlug} />
        </aside>
      </div>

      <CommunityVoicesStrip voices={voices} loading={loading} />
    </article>
  )
}
