import { Link } from 'react-router-dom'
import type { PersonalizedNews, PersonalReport } from '../../types/personalization'
import { ImportanceBadge } from '../common/Badges'
import { Icon } from '../common/Icon'
import { formatDate } from '../../utils/date'
import { NewspaperMasthead } from './NewspaperMasthead'

interface MyFrontPageProps {
  dateLabel: string
  year: number
  needsKeywords: boolean
  missingKeywordCount: number
  selectedKeywords: { id: string; name: string }[]
  feedTotal: number
  hero: PersonalizedNews | undefined
  picks: PersonalizedNews[]
  personalReport: PersonalReport | null | undefined
}

export function MyFrontPage({
  dateLabel,
  year,
  needsKeywords,
  missingKeywordCount,
  selectedKeywords,
  feedTotal,
  hero,
  picks,
  personalReport,
}: MyFrontPageProps) {
  const leadPicks = picks.slice(0, 4)
  const morePicks = picks.slice(4)

  return (
    <article className="np-newspaper-body">
      <NewspaperMasthead
        edition="MY EDITION"
        headline="나만의 1면"
        dek="관심 키워드로 맞춘 오늘의 헤드라인"
        dateLabel={dateLabel}
        volume={year}
      />

      {needsKeywords && (
        <div className="np-onboarding-banner">
          <p>
            <strong>관심 키워드 {missingKeywordCount}개 더 선택</strong>하면 나만의 1면이
            완성됩니다. 나만의 1면은 드래그하여 넘겨보세요.
          </p>
          <Link to="/settings" className="btn btn-outline btn-sm">
            키워드 설정
          </Link>
        </div>
      )}

      {selectedKeywords.length > 0 && (
        <div className="np-kicker-bar">
          <span className="np-kicker-label">Today's Topics</span>
          <div className="np-kicker-tags">
            {selectedKeywords.map((keyword) => (
              <span key={keyword.id}>{keyword.name}</span>
            ))}
          </div>
          <span className="np-kicker-count">{feedTotal}건</span>
        </div>
      )}

      <div className="np-front np-front-personal">
        <main className="np-briefing">
          {hero ? (
            <>
              <Link to={`/posts/${hero.id}`} className="np-briefing-link">
                <article className="np-lead-story">
                  <div className="np-byline">
                    <span className="np-byline-source">{hero.source_name ?? '출처 미상'}</span>
                    <span className="np-byline-date">{formatDate(hero.collected_at)}</span>
                    <ImportanceBadge level={hero.importance} />
                  </div>
                  <div className="np-lead-kicker">
                    {hero.matched_keywords.map((k) => (
                      <span key={k.id}>{k.name}</span>
                    ))}
                    {hero.category && !hero.matched_keywords.length && (
                      <span>{hero.category}</span>
                    )}
                  </div>
                  <h2 className="np-lead-headline">{hero.title}</h2>
                  {hero.summary && <p className="np-lead-dek">{hero.summary}</p>}
                </article>
              </Link>

              {leadPicks.length > 0 && (
                <div className="np-story-grid">
                  {leadPicks.map((post) => (
                    <Link key={post.id} to={`/posts/${post.id}`} className="np-story-card">
                      <div className="np-story-card-kicker">
                        {post.matched_keywords[0]?.name ?? post.category ?? '뉴스'}
                      </div>
                      <h3>{post.title}</h3>
                      {post.summary && <p>{post.summary}</p>}
                      <footer>
                        <span>{post.source_name ?? '출처'}</span>
                        <span>{formatDate(post.collected_at)}</span>
                      </footer>
                    </Link>
                  ))}
                </div>
              )}

              {morePicks.length > 0 && (
                <ol className="np-briefing-picks np-briefing-picks-compact">
                  {morePicks.map((post, i) => (
                    <li key={post.id}>
                      <Link to={`/posts/${post.id}`} className="np-pick-row">
                        <span className="np-pick-num">{i + 6}</span>
                        <span className="np-pick-body">
                          <strong>{post.title}</strong>
                          {post.summary && <span>{post.summary}</span>}
                        </span>
                        <span className="np-pick-badge">
                          <ImportanceBadge level={post.importance} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </>
          ) : (
            <div className="np-briefing-empty">
              <p>
                {needsKeywords
                  ? '관심 키워드를 설정하면 맞춤 헤드라인이 이곳에 표시됩니다.'
                  : '선택한 키워드에 맞는 새 소식이 아직 없습니다.'}
              </p>
              <Link to={needsKeywords ? '/settings' : '/news'} className="np-read-more">
                {needsKeywords ? '키워드 설정하기 →' : '전체 뉴스 보기 →'}
              </Link>
            </div>
          )}
        </main>

        <aside className="np-edition-panel np-edition-panel-personal">
          {personalReport ? (
            <div className="np-sidebar-box">
              <div className="np-section-label">오늘의 개인 브리핑</div>
              <Link to={`/personal-reports/${personalReport.id}`} className="personal-report-brief">
                <div>
                  <strong>{personalReport.summary}</strong>
                  <small>관심 기사 {personalReport.item_count}건</small>
                </div>
                <Icon name="arrowRight" />
              </Link>
            </div>
          ) : !needsKeywords ? (
            <div className="np-sidebar-box">
              <div className="np-section-label">오늘의 개인 브리핑</div>
              <p className="np-sidebar-copy">
                아직 오늘 개인 리포트가 없습니다. 데일리 리포트에서 생성할 수 있습니다.
              </p>
              <Link to="/reports" className="np-read-more">
                리포트 생성하기 →
              </Link>
            </div>
          ) : null}

          <div className="np-sidebar-box">
            <div className="np-section-label">더 읽기</div>
            <p className="np-sidebar-copy">
              키워드와 무관한 전체 수집 뉴스는 뉴스 탭에서, 조직 브리핑은 MINT Daily에서
              확인할 수 있습니다.
            </p>
            <Link to="/news" className="np-read-more">
              전체 뉴스 탐색 →
            </Link>
          </div>
        </aside>
      </div>
    </article>
  )
}
