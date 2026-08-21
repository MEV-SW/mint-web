import { Link } from 'react-router-dom'
import type { PersonalizedNews, PersonalReport } from '../../types/personalization'
import { formatDate } from '../../utils/date'

interface MyFrontPageProps {
  dateLabel: string
  year: number
  needsKeywords: boolean
  selectedKeywords: { id: string; name: string }[]
  feedTotal: number
  hero: PersonalizedNews | undefined
  picks: PersonalizedNews[]
  personalReport: PersonalReport | null | undefined
}

function contentKindLabel(post: PersonalizedNews): string {
  if (post.is_community) return '커뮤니티'
  if (post.board_type === 'discovery') return '탐문'
  return '뉴스'
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

export function MyFrontPage({
  dateLabel: _dateLabel,
  year: _year,
  needsKeywords,
  selectedKeywords,
  feedTotal,
  hero,
  picks,
  personalReport,
}: MyFrontPageProps) {
  const allItems = hero ? [hero, ...picks] : []
  const secondary = allItems.slice(1, 3)
  const listNews = allItems.slice(1, 8)
  const topicLabels = selectedKeywords.slice(0, 3).map((k) => k.name).join(' · ')
  const keywordLanes = selectedKeywords
    .map((keyword) => ({
      keyword,
      items: allItems
        .filter((post) => post.matched_keywords.some((match) => match.id === keyword.id))
        .slice(0, 3),
    }))
    .filter((lane) => lane.items.length > 0)

  return (
    <article className="np-newspaper-body np-edition-sample">
      <div className="np-personal-strip">
        <div className="np-personal-strip-left">
          <span className="np-personal-strip-title">나만의 판</span>
          {selectedKeywords.length > 0 ? (
            <>
              <span className="np-personal-strip-sep" aria-hidden />
              <span className="np-personal-strip-meta">
                관심 키워드 <b>{topicLabels || `${selectedKeywords.length}개`}</b>
              </span>
              <span className="np-personal-strip-meta">
                구독 <b>{selectedKeywords.length}</b>
              </span>
            </>
          ) : (
            <>
              <span className="np-personal-strip-sep" aria-hidden />
              <span className="np-personal-strip-meta">관심 분야를 설정해 주세요</span>
            </>
          )}
        </div>
        <div className="np-personal-strip-right">
          <span className="np-personal-strip-meta">
            내 관심 기사 <b className="np-pine">{feedTotal}</b>건
          </span>
          <Link to="/settings#my-interests" className="np-personal-edit">
            판 편집
          </Link>
        </div>
      </div>

      {needsKeywords && (
        <div className="np-onboarding-banner">
          <p>
            <strong>관심 분야를 1개 이상 선택</strong>하면 나만의 1면이 완성됩니다.
          </p>
          <Link to="/settings#my-interests" className="btn btn-outline btn-sm">
            분야 설정
          </Link>
        </div>
      )}

      {keywordLanes.length > 1 && (
        <div className="np-keyword-lanes" aria-label="키워드별 최신 기사">
          {keywordLanes.map((lane) => (
            <section key={lane.keyword.id} className="np-keyword-lane">
              <div className="np-keyword-lane-head">
                <span>{lane.keyword.name}</span>
                <span>{lane.items.length}건</span>
              </div>
              <ul>
                {lane.items.map((post) => (
                  <li key={post.id}>
                    <Link to={`/posts/${post.id}`}>{post.title}</Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <section className="np-brief-band" aria-label="개인 브리핑">
        <div className="np-brief-band-main">
          <div className="np-brief-band-meta">
            <span className="np-brief-band-kicker">My Briefing</span>
            <span className="np-brief-band-meta-sub">
              {personalReport
                ? `${personalReport.report_date} · 관심 기사 ${personalReport.item_count}건`
                : '관심 분야 기준 맞춤 요약'}
            </span>
            <span className="np-brief-band-rule" aria-hidden />
          </div>
          {personalReport ? (
            <>
              <Link
                to={`/personal-reports/${personalReport.id}`}
                className="np-brief-band-title"
              >
                {personalReport.title}
              </Link>
              <p className="np-brief-band-copy">{personalReport.summary}</p>
            </>
          ) : (
            <p className="np-brief-band-copy">
              {needsKeywords
                ? '관심 분야를 설정하면 맞춤 브리핑이 이곳에 표시됩니다.'
                : '아직 생성된 개인 브리핑이 없습니다. 수집이 쌓이면 자동으로 채워집니다.'}
            </p>
          )}
        </div>
        <div className="np-brief-band-picks np-brief-band-keywords">
          <div className="np-keyword-match-label">내 키워드</div>
          <div className="np-keyword-match-chips">
            {selectedKeywords.length > 0 ? (
              selectedKeywords.map((keyword) => (
                <Link key={keyword.id} to={`/topics/${keyword.id}`} className="np-keyword-chip">
                  {keyword.name}
                </Link>
              ))
            ) : (
              <span className="np-brief-band-empty">구독한 키워드가 없습니다.</span>
            )}
          </div>
        </div>
      </section>

      <div className="np-trio">
        <div className="np-trio-a">
          {hero ? (
            <>
              <div className="np-top-kicker">
                <span className="np-top-kicker-label">My Top Story</span>
                <span className="np-top-kicker-meta">
                  {contentKindLabel(hero)}
                  {hero.category ? ` · ${hero.category}` : ''}
                </span>
              </div>
              <Link to={`/posts/${hero.id}`} className="np-top-headline">
                {hero.title}
              </Link>
              <div className="np-top-body np-top-body-solo">
                {hero.summary ? (
                  <p className="np-top-dek">{hero.summary}</p>
                ) : (
                  <p className="np-top-dek">요약이 준비되면 이곳에 표시됩니다.</p>
                )}
              </div>
              <div className="np-top-meta">
                {hero.source_name ?? '출처'} · {formatDate(hero.collected_at)}
                {hero.matched_keywords[0] ? ` · ${hero.matched_keywords[0].name}` : ''}
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
                          {post.matched_keywords[0]?.name ?? post.category ?? contentKindLabel(post)}
                        </div>
                        <Link to={`/posts/${post.id}`} className="np-subpair-title">
                          {post.title}
                        </Link>
                        {post.summary && <p className="np-subpair-dek">{post.summary}</p>}
                        <div className="np-subpair-meta">
                          {post.source_name ?? '출처'} · {shortDate(post.collected_at)}
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="np-briefing-empty">
              <p>
                {needsKeywords
                  ? '관심 분야를 설정하면 맞춤 헤드라인이 이곳에 표시됩니다.'
                  : '선택한 분야에 맞는 새 소식이 아직 없습니다.'}
              </p>
              <Link to={needsKeywords ? '/settings#my-interests' : '/news'} className="np-read-more">
                {needsKeywords ? '분야 설정하기 →' : '전체 뉴스 보기 →'}
              </Link>
            </div>
          )}
        </div>

        <div className="np-trio-b">
          <div className="np-list-head">
            <div className="np-list-head-title">맞춤 뉴스</div>
            <div className="np-list-head-count">{listNews.length}건</div>
          </div>
          {listNews.length > 0 ? (
            listNews.map((post) => (
              <Link key={post.id} to={`/posts/${post.id}`} className="np-list-row">
                <div className="np-list-row-meta">
                  <span className={`np-list-level ${levelClass(post.importance)}`}>
                    ● {levelLabel(post.importance)}
                  </span>
                  <span className="np-list-kicker">
                    {post.matched_keywords[0]?.name ?? post.category ?? contentKindLabel(post)}
                  </span>
                </div>
                <h4 className="np-list-title">{post.title}</h4>
                <div className="np-list-foot">
                  {post.source_name ?? '출처'} · {shortDate(post.collected_at)}
                </div>
              </Link>
            ))
          ) : (
            <p className="np-brief-band-empty">맞춤 뉴스가 아직 없습니다.</p>
          )}
          <Link to="/news" className="np-list-more">
            전체 뉴스 보기 →
          </Link>
        </div>

        <aside className="np-trio-c">
          {personalReport ? (
            <div className="np-sidebar-box">
              <div className="np-section-label">오늘의 개인 브리핑</div>
              <Link
                to={`/personal-reports/${personalReport.id}`}
                className="np-personal-brief-link"
              >
                <p className="np-sidebar-copy">{personalReport.summary}</p>
                <div className="np-personal-brief-foot">
                  <span className="np-personal-brief-count">
                    관심 기사 {personalReport.item_count}건
                  </span>
                  <span className="np-read-more">읽기 →</span>
                </div>
              </Link>
            </div>
          ) : !needsKeywords ? (
            <div className="np-sidebar-box">
              <div className="np-section-label">오늘의 개인 브리핑</div>
              <p className="np-sidebar-copy">아직 생성된 개인 브리핑이 없습니다.</p>
            </div>
          ) : null}

          <div className="np-sidebar-box">
            <div className="np-section-label">더 읽기</div>
            <Link to="/news" className="np-read-more">
              전체 뉴스 →
            </Link>
            <Link to="/settings#my-interests" className="np-read-more">
              관심사 설정 →
            </Link>
          </div>
        </aside>
      </div>
    </article>
  )
}
