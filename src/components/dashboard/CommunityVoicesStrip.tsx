import { Link } from 'react-router-dom'
import type { DashboardPostPreview } from '../../api/statsApi'
import { formatDate } from '../../utils/date'

const SOURCE_TYPE_LABEL: Record<string, string> = {
  reddit: 'Reddit',
  community_forum: '포럼',
}

function voiceBody(post: DashboardPostPreview): string {
  const raw = (post.ai_summary || post.title || '').trim()
  return raw.replace(/^커뮤니티\s*의견·미검증\s*[—–-]?\s*/u, '')
}

function sourceLabel(post: DashboardPostPreview): string {
  const kind = post.source_type ? SOURCE_TYPE_LABEL[post.source_type] : '커뮤니티'
  if (post.source_name) return `${kind} · ${post.source_name}`
  return kind
}

function VoiceColumn({ post }: { post: DashboardPostPreview }) {
  const body = voiceBody(post)

  return (
    <Link to={`/posts/${post.id}`} className="np-voice-col">
      <div className="np-byline np-voice-byline">
        <span className="np-byline-source">{sourceLabel(post)}</span>
        <span className="np-byline-date">{formatDate(post.collected_at)}</span>
        <span className="np-voice-tag">미검증</span>
      </div>
      <p className="np-voice-excerpt">{body}</p>
      {post.ai_summary && post.title && post.title !== body && (
        <p className="np-voice-ref">{post.title}</p>
      )}
    </Link>
  )
}

interface CommunityVoicesStripProps {
  voices: DashboardPostPreview[]
  loading?: boolean
}

export function CommunityVoicesStrip({ voices, loading }: CommunityVoicesStripProps) {
  return (
    <section className="np-section np-section-voices" aria-labelledby="np-voices-heading">
      <div className="np-section-head">
        <div className="np-section-head-group">
          <h2 id="np-voices-heading" className="np-section-title">
            고객의 소리
          </h2>
          <p className="np-section-dek">
            커뮤니티 탐문에서 수집한 현장 의견 · 공식 보도와 구분해 참고하세요
          </p>
        </div>
        <Link to="/news" className="np-section-more">
          더 보기 →
        </Link>
      </div>

      {loading ? (
        <p className="np-empty">불러오는 중…</p>
      ) : voices.length === 0 ? (
        <div className="np-empty">
          <p>아직 수집된 커뮤니티 목소리가 없습니다.</p>
          <Link to="/admin/sources" className="np-empty-link">
            커뮤니티 소스 등록 →
          </Link>
        </div>
      ) : (
        <div className="np-voices-columns">
          {voices.map((post) => (
            <VoiceColumn key={post.id} post={post} />
          ))}
        </div>
      )}
    </section>
  )
}
