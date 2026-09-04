import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
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

  return (
    <PageShell
      section="관리 · 검수함"
      title="검수함"
      lead="저신뢰 분류, 미분류, 신규 키워드 후보를 검토합니다. 애매한 기사도 빈 키워드로 두지 않고 가장 가까운 주제로 붙입니다."
      actions={
        <Btn
          variant="outline"
          onClick={() => reclassifyAll.mutate()}
          disabled={reclassifyAll.isPending || !queue.data?.length}
        >
          {reclassifyAll.isPending ? '시작 중…' : '검수함 재분류'}
        </Btn>
      }
    >
      <div className="review-list">
        {queue.data?.map((item) => (
          <ReviewQueueItemEditor
            key={item.id}
            item={item}
            orgKeywords={keywords.data ?? []}
            expanded={expandedId === item.id}
            onToggle={() => setExpandedId((id) => (id === item.id ? null : item.id))}
            onExcluded={(id) => exclude.mutate(id)}
          />
        ))}
        {!queue.isLoading && !queue.data?.length && (
          <div className="personal-empty">검수가 필요한 뉴스가 없습니다.</div>
        )}
      </div>
    </PageShell>
  )
}
