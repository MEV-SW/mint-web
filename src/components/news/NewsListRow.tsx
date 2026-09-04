import { Link, useLocation } from 'react-router-dom'
import type { PersonalizedNews } from '../../types/personalization'
import type { Importance } from '../../types/post'
import { SearchHighlight } from '../common/SearchHighlight'
import { formatDate } from '../../utils/date'
import { displayCategoryName } from '../../utils/newsTaxonomy'

function contentKindLabel(post: {
  is_community?: boolean
  board_type?: string | null
}): string {
  if (post.is_community) return '커뮤니티'
  if (post.board_type === 'discovery') return '탐문'
  return '뉴스'
}

function kindClass(post: { is_community?: boolean; board_type?: string | null }): string {
  if (post.is_community) return 'news-kind-community'
  if (post.board_type === 'discovery') return 'news-kind-discovery'
  return 'news-kind-news'
}

const IMP_MARK: Record<Importance, string> = {
  high: '고',
  medium: '중',
  low: '낮',
  unknown: '',
}

const IMP_LABEL: Record<Importance, string> = {
  high: '중요도 높음',
  medium: '중요도 보통',
  low: '중요도 낮음',
  unknown: '중요도 미정',
}

interface NewsListRowProps {
  post: PersonalizedNews
  highlightQuery?: boolean
  from?: string
}

export function NewsListRow({ post, highlightQuery, from }: NewsListRowProps) {
  const location = useLocation()
  const category = displayCategoryName(post.category)
  const keywords = post.matched_keywords.slice(0, 4)
  const back = from ?? `${location.pathname}${location.search}`
  const mark = IMP_MARK[post.importance] ?? ''

  return (
    <Link
      to={`/posts/${post.id}`}
      state={{ from: back }}
      className={`personal-news-row imp-${post.importance}`}
    >
      <div className="personal-news-main">
        <div className="personal-news-kicker">
          <span className={`news-kind-badge ${kindClass(post)}`}>{contentKindLabel(post)}</span>
          {category && <span className="news-row-cat">{category}</span>}
        </div>
        <h3>{post.title}</h3>
        {keywords.length > 0 && (
          <div className="personal-news-keywords">
            {keywords.map((item) => item.name).join(' · ')}
          </div>
        )}
        {(post.summary_highlight || post.summary) && (
          <p>
            {highlightQuery ? (
              <SearchHighlight html={post.summary_highlight} fallback={post.summary} />
            ) : (
              post.summary
            )}
          </p>
        )}
        <small>
          {post.source_name ?? '출처 정보 없음'} · {formatDate(post.collected_at)}
        </small>
      </div>
      {mark ? (
        <span className={`news-imp-mark imp-${post.importance}`} title={IMP_LABEL[post.importance]}>
          {mark}
        </span>
      ) : null}
    </Link>
  )
}
