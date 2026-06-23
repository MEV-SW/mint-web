import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  addInquiryMessage,
  closeInquiry,
  getInquiry,
  listInquiries,
  type Inquiry,
  type InquiryStatus,
} from '../api/inquiryApi'
import { Btn } from '../components/common/Btn'
import { PageShell } from '../components/layout/PageShell'
import { useToast } from '../components/common/Toast'
import { formatDateTime } from '../utils/date'
import { apiErrorDetail } from '../utils/apiError'

const STATUS_LABELS: Record<InquiryStatus, string> = {
  open: '미답변',
  answered: '답변 완료',
  closed: '종료',
}

export function AdminInquiriesPage() {
  const toast = useToast()
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<InquiryStatus | 'all'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [reply, setReply] = useState('')

  const { data: inquiries = [], isLoading } = useQuery({
    queryKey: ['inquiries', 'admin', statusFilter],
    queryFn: () => listInquiries(statusFilter === 'all' ? undefined : statusFilter),
  })

  const { data: detail } = useQuery({
    queryKey: ['inquiry', selectedId],
    queryFn: () => getInquiry(selectedId!),
    enabled: !!selectedId,
  })

  const sendReply = useMutation({
    mutationFn: () => addInquiryMessage(selectedId!, reply.trim()),
    onSuccess: () => {
      setReply('')
      qc.invalidateQueries({ queryKey: ['inquiry', selectedId] })
      qc.invalidateQueries({ queryKey: ['inquiries'] })
      qc.invalidateQueries({ queryKey: ['inquiries-open-count'] })
      toast('답변을 등록했습니다.')
    },
    onError: (e) => toast(apiErrorDetail(e) || '답변 등록 실패', 'err'),
  })

  const close = useMutation({
    mutationFn: () => closeInquiry(selectedId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inquiry', selectedId] })
      qc.invalidateQueries({ queryKey: ['inquiries'] })
      qc.invalidateQueries({ queryKey: ['inquiries-open-count'] })
      toast('문의를 종료했습니다.', 'info')
    },
    onError: (e) => toast(apiErrorDetail(e) || '종료 실패', 'err'),
  })

  function selectInquiry(item: Inquiry) {
    setSelectedId(item.id)
    setReply('')
  }

  return (
    <PageShell
      section="관리"
      title="문의 관리"
      lead="사용자 문의를 확인하고 답변할 수 있습니다."
      leadSingleLine
    >
      <div className="inquiry-layout">
        <div className="inquiry-list-panel">
          <div className="seg" style={{ marginBottom: 12 }}>
            <button
              type="button"
              className={statusFilter === 'all' ? 'on' : undefined}
              onClick={() => setStatusFilter('all')}
            >
              전체
            </button>
            <button
              type="button"
              className={statusFilter === 'open' ? 'on' : undefined}
              onClick={() => setStatusFilter('open')}
            >
              미답변
            </button>
            <button
              type="button"
              className={statusFilter === 'answered' ? 'on' : undefined}
              onClick={() => setStatusFilter('answered')}
            >
              답변 완료
            </button>
          </div>

          {isLoading && <p style={{ color: 'var(--text-muted)' }}>로딩 중…</p>}
          {!isLoading && inquiries.length === 0 && (
            <p style={{ color: 'var(--text-muted)' }}>문의가 없습니다.</p>
          )}
          <ul className="inquiry-list">
            {inquiries.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`inquiry-list-item${selectedId === item.id ? ' active' : ''}`}
                  onClick={() => selectInquiry(item)}
                >
                  <strong>{item.title}</strong>
                  <span>{item.user.name} · {STATUS_LABELS[item.status]}</span>
                  <span className="mono">{formatDateTime(item.updated_at)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="inquiry-detail-panel">
          {!detail && <p style={{ color: 'var(--text-muted)' }}>문의를 선택하세요.</p>}
          {detail && (
            <>
              <header className="inquiry-detail-head">
                <h2>{detail.title}</h2>
                <p>
                  {detail.user.name} ({detail.user.email}) · {STATUS_LABELS[detail.status]}
                </p>
              </header>
              <div className="inquiry-thread">
                {detail.messages.map((msg) => (
                  <article
                    key={msg.id}
                    className={`inquiry-message${msg.author.role === 'admin' ? ' admin' : ''}`}
                  >
                    <header>
                      <strong>{msg.author.name}</strong>
                      <span className="mono">{formatDateTime(msg.created_at)}</span>
                    </header>
                    <p>{msg.body}</p>
                  </article>
                ))}
              </div>
              {detail.status !== 'closed' && (
                <form
                  className="inquiry-reply-form"
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (!reply.trim()) return
                    sendReply.mutate()
                  }}
                >
                  <textarea
                    className="input"
                    rows={4}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="답변을 입력하세요"
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <Btn variant="primary" type="submit" disabled={sendReply.isPending || !reply.trim()}>
                      답변 등록
                    </Btn>
                    <Btn
                      variant="outline"
                      type="button"
                      disabled={close.isPending}
                      onClick={() => close.mutate()}
                    >
                      문의 종료
                    </Btn>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </PageShell>
  )
}
