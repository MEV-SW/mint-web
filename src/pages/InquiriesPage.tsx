import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  addInquiryMessage,
  createInquiry,
  getInquiry,
  listMyInquiries,
  type Inquiry,
} from '../api/inquiryApi'
import { Btn } from '../components/common/Btn'
import { PageShell } from '../components/layout/PageShell'
import { useToast } from '../components/common/Toast'
import { usePermissions } from '../hooks/usePermissions'
import { formatDateTime } from '../utils/date'
import { apiErrorDetail } from '../utils/apiError'

const STATUS_LABELS = {
  open: '접수됨',
  answered: '답변 완료',
  closed: '종료',
} as const

export function InquiriesPage() {
  const toast = useToast()
  const qc = useQueryClient()
  const { isAdmin } = usePermissions()
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [followUp, setFollowUp] = useState('')

  const { data: inquiries = [], isLoading } = useQuery({
    queryKey: ['inquiries', 'mine'],
    queryFn: listMyInquiries,
  })

  const { data: detail } = useQuery({
    queryKey: ['inquiry', selectedId],
    queryFn: () => getInquiry(selectedId!),
    enabled: !!selectedId,
  })

  const create = useMutation({
    mutationFn: () => createInquiry({ title: title.trim(), body: body.trim() }),
    onSuccess: (res) => {
      setTitle('')
      setBody('')
      setShowForm(false)
      setSelectedId(res.id)
      qc.invalidateQueries({ queryKey: ['inquiries', 'mine'] })
      toast('문의를 등록했습니다.')
    },
    onError: (e) => toast(apiErrorDetail(e) || '문의 등록 실패', 'err'),
  })

  const addMessage = useMutation({
    mutationFn: () => addInquiryMessage(selectedId!, followUp.trim()),
    onSuccess: () => {
      setFollowUp('')
      qc.invalidateQueries({ queryKey: ['inquiry', selectedId] })
      qc.invalidateQueries({ queryKey: ['inquiries', 'mine'] })
      toast('추가 메시지를 보냈습니다.')
    },
    onError: (e) => toast(apiErrorDetail(e) || '전송 실패', 'err'),
  })

  function selectInquiry(item: Inquiry) {
    setSelectedId(item.id)
    setFollowUp('')
  }

  if (isAdmin) return <Navigate to="/admin/inquiries" replace />

  return (
    <PageShell
      section="지원"
      title="문의"
      lead="서비스 이용 중 궁금한 점이나 요청 사항을 편집장에게 전달할 수 있습니다."
      leadSingleLine
      actions={
        <Btn variant="primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? '작성 취소' : '새 문의'}
        </Btn>
      }
    >
      {showForm && (
        <form
          className="inquiry-create-form"
          onSubmit={(e) => {
            e.preventDefault()
            if (!title.trim() || !body.trim()) return
            create.mutate()
          }}
        >
          <div className="field">
            <label>제목</label>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="문의 제목"
              required
            />
          </div>
          <div className="field">
            <label>내용</label>
            <textarea
              className="input"
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="문의 내용을 입력하세요"
              required
            />
          </div>
          <Btn variant="primary" type="submit" disabled={create.isPending}>
            문의 등록
          </Btn>
        </form>
      )}

      <div className="inquiry-layout">
        <div className="inquiry-list-panel">
          {isLoading && <p style={{ color: 'var(--text-muted)' }}>로딩 중…</p>}
          {!isLoading && inquiries.length === 0 && (
            <p style={{ color: 'var(--text-muted)' }}>등록한 문의가 없습니다.</p>
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
                  <span>{STATUS_LABELS[item.status]}</span>
                  <span className="mono">{formatDateTime(item.updated_at)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="inquiry-detail-panel">
          {!detail && <p style={{ color: 'var(--text-muted)' }}>문의를 선택하거나 새로 작성하세요.</p>}
          {detail && (
            <>
              <header className="inquiry-detail-head">
                <h2>{detail.title}</h2>
                <p>{STATUS_LABELS[detail.status]} · {formatDateTime(detail.created_at)}</p>
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
                    if (!followUp.trim()) return
                    addMessage.mutate()
                  }}
                >
                  <textarea
                    className="input"
                    rows={3}
                    value={followUp}
                    onChange={(e) => setFollowUp(e.target.value)}
                    placeholder="추가 질문이 있으면 입력하세요"
                  />
                  <Btn
                    variant="primary"
                    type="submit"
                    style={{ marginTop: 8 }}
                    disabled={addMessage.isPending || !followUp.trim()}
                  >
                    추가 전송
                  </Btn>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </PageShell>
  )
}
