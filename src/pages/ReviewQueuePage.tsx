import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { listReviewQueue, resolveReviewQueue, triggerReclassifyAll } from '../api/personalizationApi'
import { Btn } from '../components/common/Btn'
import { PageShell } from '../components/layout/PageShell'
import { useToast } from '../components/common/Toast'
import { apiErrorDetail } from '../utils/apiError'

const reasonLabel = {
  low_confidence: '낮은 분류 신뢰도',
  uncategorized: '카테고리 미분류',
  no_keywords: '키워드 없음',
  new_keyword: '신규 키워드 후보',
  extraction_failed: '본문 추출 실패',
}

export function ReviewQueuePage() {
  const qc = useQueryClient()
  const toast = useToast()
  const queue = useQuery({ queryKey: ['review-queue'], queryFn: () => listReviewQueue() })
  const resolve = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'resolved' | 'excluded' }) => resolveReviewQueue(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['review-queue'] }),
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
      lead="AI 분류가 애매한 뉴스와 신규 키워드 후보를 검수합니다. 기존 뉴스는 전체 재분류로 키워드·카테고리를 다시 추출할 수 있습니다."
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
          <article key={item.id}>
            <div>
              <span>{reasonLabel[item.reason]}</span>
              <Link to={`/posts/${item.post_id}`}>{item.post_title}</Link>
            </div>
            <div>
              <Btn size="sm" variant="outline" onClick={() => resolve.mutate({ id: item.id, status: 'resolved' })}>확인 완료</Btn>
              <Btn size="sm" variant="outline" onClick={() => resolve.mutate({ id: item.id, status: 'excluded' })}>뉴스 제외</Btn>
            </div>
          </article>
        ))}
        {!queue.isLoading && !queue.data?.length && <div className="personal-empty">검수가 필요한 뉴스가 없습니다.</div>}
      </div>
    </PageShell>
  )
}
