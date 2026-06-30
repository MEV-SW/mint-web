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
      toast('전체 재분류 작업을 시작했습니다. 작업 패널에서 진행 상황을 확인하세요.')
      qc.invalidateQueries({ queryKey: ['jobs'] })
    },
    onError: (e) => toast(apiErrorDetail(e) || '재분류 시작 실패', 'err'),
  })

  return (
    <PageShell
      section="관리"
      title="검수함"
      lead="키워딩에 실패한 뉴스입니다. AI 추천을 고르거나 조직 키워드·신규 키워드를 지정한 뒤 저장하세요."
      actions={
        <Btn
          variant="outline"
          onClick={() => reclassifyAll.mutate()}
          disabled={reclassifyAll.isPending}
        >
          {reclassifyAll.isPending ? '시작 중…' : '전체 재분류'}
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
