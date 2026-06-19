import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useParams } from 'react-router-dom'
import {
  approvePost,
  deletePost,
  getPost,
  hidePost,
  promotePost,
  summarizePost,
} from '../api/postApi'
import { ImportanceBadge, StatusPill, TrustBadge } from '../components/common/Badges'
import { Btn } from '../components/common/Btn'
import { Icon } from '../components/common/Icon'
import { useToast } from '../components/common/Toast'
import { PostAiSummaryPanel } from '../components/posts/PostAiSummaryPanel'
import { PostOriginalPane } from '../components/posts/PostOriginalPane'
import { formatDateTime } from '../utils/date'
import { DISCOVERY_BOARD_LABEL } from '../constants/boardLabels'

export function PostDetailPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const toast = useToast()
  const qc = useQueryClient()

  const { data: post, isLoading } = useQuery({
    queryKey: ['post', id],
    queryFn: () => getPost(id!),
    enabled: !!id,
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['post', id] })
    qc.invalidateQueries({ queryKey: ['posts'] })
  }

  const summarize = useMutation({
    mutationFn: () => summarizePost(id!),
    onSuccess: () => {
      invalidate()
      toast('AI 요약을 생성했습니다.', 'info')
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast(msg || '요약 생성 실패', 'err')
    },
  })

  const act = useMutation({
    mutationFn: (type: 'approve' | 'hide' | 'delete' | 'promote') => {
      if (type === 'approve') return approvePost(id!)
      if (type === 'hide') return hidePost(id!)
      if (type === 'delete') return deletePost(id!)
      return promotePost(id!)
    },
    onSuccess: () => {
      invalidate()
      toast('처리되었습니다.')
    },
  })

  if (isLoading || !post) {
    return <div className="content-inner np-sheet">로딩 중…</div>
  }

  const ai = post.ai_outputs[0] || post.latest_ai
  const isDiscovery = post.board_type === 'discovery'
  const showSplit = Boolean(post.original_url || post.raw_content?.trim())
  const backTo =
    (location.state as { from?: string } | null)?.from ??
    (isDiscovery ? '/discovery' : '/trusted')

  return (
    <div className="content-inner page-fade np-sheet post-detail-page">
      <Link to={backTo} className="back-link">
        <Icon name="chevL" style={{ width: 14, height: 14 }} /> 게시판으로
      </Link>

      <article className="pg-article-hero">
        <div className="np-section-label">{isDiscovery ? DISCOVERY_BOARD_LABEL : '중요 뉴스'}</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <StatusPill status={post.status} />
          <ImportanceBadge level={post.importance} />
          <TrustBadge level={post.trust_level} score={post.reliability_score} />
        </div>
        <h1 className="pg-article-title">{post.title}</h1>
        <div className="pg-article-meta">
          <span className="source">{post.source_name || '출처 없음'}</span>
          <span>{formatDateTime(post.collected_at)}</span>
        </div>
        <div className="detail-actions">
          {post.original_url && (
            <Btn
              variant="primary"
              icon="ext"
              onClick={() => window.open(post.original_url!, '_blank', 'noopener,noreferrer')}
            >
              원문 보기
            </Btn>
          )}
          {ai && (
            <Btn variant="soft" icon="sparkles" onClick={() => summarize.mutate()} disabled={summarize.isPending}>
              {summarize.isPending ? '요약 갱신 중…' : '요약 다시 생성'}
            </Btn>
          )}
          {isDiscovery && (
            <>
              <Btn variant="soft" onClick={() => act.mutate('approve')}>
                검토 완료
              </Btn>
              <Btn variant="soft" icon="promote" onClick={() => act.mutate('promote')}>
                중요 게시판 승격
              </Btn>
            </>
          )}
          <Btn variant="outline" onClick={() => act.mutate('hide')}>
            숨김
          </Btn>
          <Btn variant="outline" icon="trash" onClick={() => act.mutate('delete')}>
            삭제
          </Btn>
        </div>
      </article>

      {showSplit ? (
        <div className="post-split-view">
          <PostOriginalPane
            postId={post.id}
            url={post.original_url}
            rawContent={post.raw_content}
            title={post.title}
          />
          <PostAiSummaryPanel
            ai={ai}
            isDiscovery={isDiscovery}
            summarizing={summarize.isPending}
            onSummarize={() => summarize.mutate()}
          />
        </div>
      ) : (
        <PostAiSummaryPanel
          ai={ai}
          isDiscovery={isDiscovery}
          summarizing={summarize.isPending}
          onSummarize={() => summarize.mutate()}
        />
      )}
    </div>
  )
}
