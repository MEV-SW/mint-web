import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { listEditions } from '../api/editionApi'
import {
  listKeywords,
  listReviewQueue,
  resolveReviewQueue,
  triggerReclassifyAll,
} from '../api/personalizationApi'
import { ReviewQueueItemEditor } from '../components/review/ReviewQueueItemEditor'
import { Btn } from '../components/common/Btn'
import { PageShell } from '../components/layout/PageShell'
import { useToast } from '../components/common/Toast'
import { apiErrorDetail } from '../utils/apiError'

export function ReviewQueuePage() {
  const qc = useQueryClient()
  const toast = useToast()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const queue = useQuery({ queryKey: ['review-queue'], queryFn: () => listReviewQueue() })
  const keywords = useQuery({ queryKey: ['keywords'], queryFn: () => listKeywords() })
  const editions = useQuery({
    queryKey: ['editions', 'active'],
    queryFn: () => listEditions(true),
  })

  const exclude = useMutation({
    mutationFn: (id: string) => resolveReviewQueue(id, 'excluded'),
    onSuccess: () => {
      toast('뉴스를 제외했습니다.', 'info')
      qc.invalidateQueries({ queryKey: ['review-queue'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      qc.invalidateQueries({ queryKey: ['news'] })
    },
    onError: (e) => toast(apiErrorDetail(e) || '처리 실패', 'err'),
  })

  const reclassifyAll = useMutation({
    mutationFn: () => triggerReclassifyAll(),
    onSuccess: () => {
      toast('검수함에 있는 기사만 다시 분류합니다. 작업 패널에서 진행 상황을 확인하세요.')
      qc.invalidateQueries({ queryKey: ['jobs'] })
    },
    onError: (e) => toast(apiErrorDetail(e) || '재분류 시작 실패', 'err'),
  })

  const pending = queue.data?.length ?? 0

  return (
    <PageShell
      section="관리 · 검수함"
      title="검수함"
      lead="저신뢰 분류, 미분류, 신규 키워드 후보를 왼쪽부터 처리합니다. 애매해도 빈 키워드로 두지 말고 가장 가까운 주제를 붙입니다."
      actions={
        <Btn
          variant="outline"
          onClick={() => reclassifyAll.mutate()}
          disabled={reclassifyAll.isPending || !pending}
        >
          {reclassifyAll.isPending ? '시작 중…' : '검수함 재분류'}
        </Btn>
      }
    >
      <div className="review-desk">
        <div className="review-desk-meta">
          {queue.isLoading ? '불러오는 중' : pending ? `${pending}건 대기` : '대기 없음'}
        </div>

        {pending > 0 && (
          <div className="review-desk-cols" aria-hidden>
            <span>사유</span>
            <span>기사</span>
            <span>처리</span>
          </div>
        )}

        <div className="review-list">
          {queue.data?.map((item) => (
            <ReviewQueueItemEditor
              key={item.id}
              item={item}
              orgKeywords={keywords.data ?? []}
              editions={editions.data ?? []}
              expanded={expandedId === item.id}
              onToggle={() => setExpandedId((id) => (id === item.id ? null : item.id))}
              onExcluded={(id) => exclude.mutate(id)}
            />
          ))}
        </div>

        {!queue.isLoading && !pending && (
          <div className="personal-empty">
            <h2>검수할 뉴스가 없습니다</h2>
            <p>분류가 애매하거나 키워드가 비는 기사가 생기면 이곳에 쌓입니다.</p>
          </div>
        )}
      </div>
    </PageShell>
  )
}
