import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import {
  approvePost,
  deletePost,
  getPost,
  hidePost,
  promotePost,
  summarizePost,
} from '../api/postApi'
import { AiBadge, ImportanceBadge, StatusPill, TrustBadge } from '../components/common/Badges'
import { Btn } from '../components/common/Btn'
import { Icon } from '../components/common/Icon'
import { useToast } from '../components/common/Toast'
import { formatDateTime } from '../utils/date'

export function PostDetailPage() {
  const { id } = useParams<{ id: string }>()
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
    return <div className="content-inner page-fade">로딩 중…</div>
  }

  const ai = post.ai_outputs[0] || post.latest_ai
  const isDiscovery = post.board_type === 'discovery'
  return (
    <div className="content-inner page-fade">
      <Link to={post.board_type === 'discovery' ? '/discovery' : '/trusted'} className="back-link">
        <Icon name="chevL" /> 게시판으로
      </Link>

      <div className="detail-hero card card-pad">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <StatusPill status={post.status} />
          <ImportanceBadge level={post.importance} />
          <TrustBadge level={post.trust_level} score={post.reliability_score} />
        </div>
        <h2 style={{ margin: '0 0 12px', fontSize: 26, lineHeight: 1.35 }}>{post.title}</h2>
        <div className="detail-meta">
          <span>{post.source_name || '출처 없음'}</span>
          <span>·</span>
          <span>{formatDateTime(post.collected_at)}</span>
          {post.original_url && (
            <>
              <span>·</span>
              <a href={post.original_url} target="_blank" rel="noreferrer" className="link">
                원문 열기 <Icon name="ext" style={{ width: 14, height: 14 }} />
              </a>
            </>
          )}
        </div>
        <div className="detail-actions" style={{ marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {post.original_url && (
            <Btn
              variant="primary"
              icon="ext"
              onClick={() => window.open(post.original_url!, '_blank', 'noopener,noreferrer')}
            >
              원문 보기
            </Btn>
          )}
          {!ai && (
            <Btn variant="soft" icon="sparkles" onClick={() => summarize.mutate()} disabled={summarize.isPending}>
              {summarize.isPending ? '요약 생성 중…' : 'AI 요약 생성'}
            </Btn>
          )}
          {isDiscovery && (
            <>
              <Btn variant="soft" onClick={() => act.mutate('approve')}>
                승인
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
      </div>

      <div className="detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20, marginTop: 20 }}>
        <div className="card card-pad">
          <div className="section-head">
            <h3 style={{ margin: 0 }}>AI 요약</h3>
            {ai && <AiBadge />}
          </div>
          {ai ? (
            <>
              <p style={{ fontSize: 15, lineHeight: 1.65 }}>{ai.summary}</p>
              {!isDiscovery && ai.impact && (
                <>
                  <h4>영향</h4>
                  <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>{ai.impact}</p>
                </>
              )}
              {!isDiscovery && ai.action_items && ai.action_items.length > 0 && (
                <>
                  <h4>액션 아이템</h4>
                  <ul>
                    {ai.action_items.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </>
              )}
              <p style={{ fontSize: 12, color: 'var(--text-faint)', fontFamily: 'var(--mono)' }}>
                {ai.model} · confidence {ai.confidence ?? '-'}
              </p>
            </>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>AI 요약이 없습니다. 상단 버튼으로 생성하세요.</p>
          )}
        </div>
      </div>
    </div>
  )
}
