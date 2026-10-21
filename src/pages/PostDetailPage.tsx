import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
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
import { LoadErrorBanner, NotFoundState } from '../components/common/PageStates'
import { DetailSkeleton } from '../components/common/Skeletons'
import { useToast } from '../components/common/Toast'
import { PostAiSummaryPanel } from '../components/posts/PostAiSummaryPanel'
import { PostOriginalPane } from '../components/posts/PostOriginalPane'
import { apiErrorStatus } from '../utils/apiError'
import { backLabelFor } from '../utils/postBack'
import { formatDateTime } from '../utils/date'
import { DISCOVERY_BOARD_LABEL } from '../constants/boardLabels'

export function PostDetailPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
  const qc = useQueryClient()

  const postQuery = useQuery({
    queryKey: ['post', id],
    queryFn: () => getPost(id!),
    enabled: !!id,
  })
  const { data: post, isLoading } = postQuery

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

  // #128: a failed load no longer stays on "로딩 중…" — 404 gets a way back, other errors a retry.
  if (postQuery.isError) {
    return (
      <div className="content-inner np-sheet">
        {apiErrorStatus(postQuery.error) === 404 ? (
          <NotFoundState
            title="기사를 찾을 수 없습니다"
            body="삭제됐거나 주소가 바뀐 기사입니다."
            backTo="/news"
            backLabel="뉴스로 돌아가기"
          />
        ) : (
          <LoadErrorBanner
            title="기사를 불러오지 못했습니다"
            error={postQuery.error}
            failedAt={postQuery.errorUpdatedAt}
            onRetry={() => void postQuery.refetch()}
            retrying={postQuery.isFetching}
          />
        )}
      </div>
    )
  }
  if (isLoading || !post) {
    return (
      <div className="content-inner np-sheet">
        <DetailSkeleton label="기사를 불러오는 중" />
      </div>
    )
  }

  const ai = post.ai_outputs[0] || post.latest_ai
  const isDiscovery = post.board_type === 'discovery'
  // mint-server#170: the server decides per post (linked edition editors and admins).
  const canEdit = post.can_edit === true
  const showSplit = Boolean(post.original_url || post.raw_content?.trim())
  // #129: back to where the reader came from — the link's `from`, else browser history, else the news list.
  const from = (location.state as { from?: string } | null)?.from
  const hasAppHistory = location.key !== 'default'
  const backLink = from ? (
    <Link to={from} className="back-link">
      <Icon name="chevL" style={{ width: 14, height: 14 }} /> {backLabelFor(from)}
    </Link>
  ) : hasAppHistory ? (
    <button type="button" className="back-link back-link-button" onClick={() => navigate(-1)}>
      <Icon name="chevL" style={{ width: 14, height: 14 }} /> 이전 화면으로
    </button>
  ) : (
    <Link to="/news" className="back-link">
      <Icon name="chevL" style={{ width: 14, height: 14 }} /> 뉴스로
    </Link>
  )

  return (
    <div className="content-inner page-fade np-sheet post-detail-page">
      {backLink}

      <article className="pg-article-hero">
        <div className="pg-kicker">{isDiscovery ? DISCOVERY_BOARD_LABEL : '중요 뉴스'}</div>
        <div className="pg-article-badges">
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
          {canEdit && ai && (
            <Btn variant="soft" icon="sparkles" onClick={() => summarize.mutate()} disabled={summarize.isPending}>
              {summarize.isPending ? '요약 갱신 중…' : '요약 다시 생성'}
            </Btn>
          )}
          {canEdit && isDiscovery && (
            <>
              <Btn variant="soft" onClick={() => act.mutate('approve')}>
                검토 완료
              </Btn>
              <Btn variant="soft" icon="promote" onClick={() => act.mutate('promote')}>
                중요 게시판 승격
              </Btn>
            </>
          )}
          {canEdit && (
            <>
              <Btn variant="outline" onClick={() => act.mutate('hide')}>
                숨김
              </Btn>
              <Btn variant="outline" icon="trash" onClick={() => act.mutate('delete')}>
                삭제
              </Btn>
            </>
          )}
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
            onSummarize={canEdit ? () => summarize.mutate() : undefined}
          />
        </div>
      ) : (
        <PostAiSummaryPanel
          ai={ai}
          isDiscovery={isDiscovery}
          summarizing={summarize.isPending}
          onSummarize={canEdit ? () => summarize.mutate() : undefined}
        />
      )}
    </div>
  )
}
