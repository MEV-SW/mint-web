import { Link } from 'react-router-dom'
import type { PersonalizedNews, PersonalReport } from '../../types/personalization'
import { ImportanceBadge } from '../common/Badges'
import { formatDate } from '../../utils/date'
import { NewspaperMasthead } from './NewspaperMasthead'

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

function groupByCategory(items: PersonalizedNews[]): { name: string; items: PersonalizedNews[] }[] {
  const map = new Map<string, PersonalizedNews[]>()
  for (const item of items) {
    const key = item.category?.trim() || '기타'
    const bucket = map.get(key) ?? []
    bucket.push(item)
    map.set(key, bucket)
  }
  return [...map.entries()].map(([name, groupItems]) => ({ name, items: groupItems }))
}

export function MyFrontPage({
  dateLabel,
  year,
  needsKeywords,
  selectedKeywords,
  feedTotal,
  hero,
  picks,
  personalReport,
}: MyFrontPageProps) {
  const allItems = hero ? [hero, ...picks] : []
  const categoryGroups = groupByCategory(allItems)
  const useCategoryLayout = selectedKeywords.length > 0 && categoryGroups.length > 1

  return (
    <article className="np-newspaper-body">
      <NewspaperMasthead
        edition="MY EDITION"
        headline="나만의 1면"
        dek="관심 분야로 맞춘 오늘의 헤드라인"
        dateLabel={dateLabel}
        volume={year}
      />

      {needsKeywords && (
        <div className="np-onboarding-banner">
          <p>
            <strong>관심 분야를 1개 이상 선택</strong>하면 나만의 1면이 완성됩니다.
          </p>
          <Link to="/settings" className="btn btn-outline btn-sm">
            분야 설정
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
          {allItems.length > 0 ? (
            useCategoryLayout ? (
              categoryGroups.map((group) => (
                <section key={group.name} className="np-subsection" style={{ marginBottom: 22 }}>
                  <div className="np-section-label">{group.name}</div>
                  <div className="np-story-grid">
                    {group.items.slice(0, 4).map((post) => (
                      <Link key={post.id} to={`/posts/${post.id}`} className="np-story-card">
                        <div className="np-story-card-kicker">
                          {contentKindLabel(post)}
                          {post.matched_keywords[0] ? ` · ${post.matched_keywords[0].name}` : ''}
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
                </section>
              ))
            ) : (
              <>
                {hero && (
                  <Link to={`/posts/${hero.id}`} className="np-briefing-link">
                    <article className="np-lead-story">
                      <div className="np-byline">
                        <span className="np-byline-source">{hero.source_name ?? '출처 미상'}</span>
                        <span className="np-byline-date">{formatDate(hero.collected_at)}</span>
                        <ImportanceBadge level={hero.importance} />
                      </div>
                      <div className="np-lead-kicker">
                        <span>{contentKindLabel(hero)}</span>
                        {hero.category && <span>{hero.category}</span>}
                        {hero.matched_keywords.map((k) => (
                          <span key={k.id}>{k.name}</span>
                        ))}
                      </div>
                      <h2 className="np-lead-headline">{hero.title}</h2>
                      {hero.summary && <p className="np-lead-dek">{hero.summary}</p>}
                    </article>
                  </Link>
                )}

                {picks.slice(0, 4).length > 0 && (
                  <div className="np-story-grid">
                    {picks.slice(0, 4).map((post) => (
                      <Link key={post.id} to={`/posts/${post.id}`} className="np-story-card">
                        <div className="np-story-card-kicker">
                          {contentKindLabel(post)}
                          {' · '}
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

                {picks.slice(4).length > 0 && (
                  <ol className="np-briefing-picks np-briefing-picks-compact">
                    {picks.slice(4).map((post, i) => (
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
            )
          ) : (
            <div className="np-briefing-empty">
              <p>
                {needsKeywords
                  ? '관심 분야를 설정하면 맞춤 헤드라인이 이곳에 표시됩니다.'
                  : '선택한 분야에 맞는 새 소식이 아직 없습니다.'}
              </p>
              <Link to={needsKeywords ? '/settings' : '/news'} className="np-read-more">
                {needsKeywords ? '분야 설정하기 →' : '전체 뉴스 보기 →'}
              </Link>
            </div>
          )}
        </main>

        <aside className="np-edition-panel np-edition-panel-personal">
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
            <Link to="/" className="np-read-more">
              MINT Daily →
            </Link>
          </div>
        </aside>
      </div>
    </article>
  )
}
