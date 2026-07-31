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
import { approveUser, listUsers, rejectUser } from '../api/usersApi'
import { Btn } from '../components/common/Btn'
import { PageShell } from '../components/layout/PageShell'
import { useToast } from '../components/common/Toast'
import { formatDateTime } from '../utils/date'
import { apiErrorDetail } from '../utils/apiError'

const USER_STATUS_LABELS = {
  pending: '승인 대기',
  approved: '승인됨',
  rejected: '거절됨',
} as const

const INQUIRY_STATUS_LABELS: Record<InquiryStatus, string> = {
  open: '미답변',
  answered: '답변 완료',
  closed: '종료',
}

export function AdminAccountsPage() {
  const toast = useToast()
  const qc = useQueryClient()

  const [userTab, setUserTab] = useState<'pending' | 'all'>('pending')
  const [statusFilter, setStatusFilter] = useState<InquiryStatus | 'all'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [reply, setReply] = useState('')

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users', userTab],
    queryFn: () => listUsers(userTab === 'pending' ? 'pending' : undefined),
  })

  const { data: inquiries = [], isLoading: inquiriesLoading } = useQuery({
    queryKey: ['inquiries', 'admin', statusFilter],
    queryFn: () => listInquiries(statusFilter === 'all' ? undefined : statusFilter),
  })

  const { data: detail } = useQuery({
    queryKey: ['inquiry', selectedId],
    queryFn: () => getInquiry(selectedId!),
    enabled: !!selectedId,
  })

  const approve = useMutation({
    mutationFn: approveUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast('가입을 승인했습니다.')
    },
    onError: (e) => toast(apiErrorDetail(e) || '승인 실패', 'err'),
  })

  const reject = useMutation({
    mutationFn: rejectUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast('가입을 거절했습니다.', 'info')
    },
    onError: (e) => toast(apiErrorDetail(e) || '거절 실패', 'err'),
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

  const userBusy = approve.isPending || reject.isPending
  const userRows =
    userTab === 'pending' ? users.filter((u) => u.approval_status === 'pending') : users

  function selectInquiry(item: Inquiry) {
    setSelectedId(item.id)
    setReply('')
  }

  return (
    <PageShell
      section="관리 · Accounts"
      title="계정 관리"
      lead="가입 신청·구성원 권한과 문의를 한곳에서 처리합니다."
      leadSingleLine
    >
      <section className="admin-accounts-section">
        <header className="admin-accounts-section-head">
          <h2>가입 승인</h2>
          <p>회원가입 신청을 검토하고 승인하거나 거절합니다.</p>
        </header>

        <div className="seg" style={{ marginBottom: 16 }}>
          <button
            type="button"
            className={userTab === 'pending' ? 'on' : undefined}
            onClick={() => setUserTab('pending')}
          >
            승인 대기
          </button>
          <button
            type="button"
            className={userTab === 'all' ? 'on' : undefined}
            onClick={() => setUserTab('all')}
          >
            전체 사용자
          </button>
        </div>

        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>이름</th>
                <th>이메일</th>
                <th style={{ width: 120 }}>상태</th>
                <th style={{ width: 160 }}>신청일</th>
                {userTab === 'pending' && <th style={{ width: 160 }} />}
              </tr>
            </thead>
            <tbody>
              {usersLoading && (
                <tr>
                  <td colSpan={userTab === 'pending' ? 5 : 4}>로딩 중…</td>
                </tr>
              )}
              {!usersLoading && userRows.length === 0 && (
                <tr>
                  <td colSpan={userTab === 'pending' ? 5 : 4} style={{ color: 'var(--text-muted)' }}>
                    {userTab === 'pending'
                      ? '승인 대기 중인 가입 신청이 없습니다.'
                      : '등록된 사용자가 없습니다.'}
                  </td>
                </tr>
              )}
              {userRows.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{USER_STATUS_LABELS[u.approval_status]}</td>
                  <td className="mono" style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                    {formatDateTime(u.created_at)}
                  </td>
                  {userTab === 'pending' && (
                    <td>
                      {u.approval_status === 'pending' && (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Btn
                            variant="soft"
                            size="sm"
                            disabled={userBusy}
                            onClick={() => approve.mutate(u.id)}
                          >
                            승인
                          </Btn>
                          <Btn
                            variant="outline"
                            size="sm"
                            disabled={userBusy}
                            onClick={() => reject.mutate(u.id)}
                          >
                            거절
                          </Btn>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-accounts-section">
        <header className="admin-accounts-section-head">
          <h2>문의 관리</h2>
          <p>사용자 문의를 확인하고 답변합니다.</p>
        </header>

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

            {inquiriesLoading && <p style={{ color: 'var(--text-muted)' }}>로딩 중…</p>}
            {!inquiriesLoading && inquiries.length === 0 && (
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
                    <span>
                      {item.user.name} · {INQUIRY_STATUS_LABELS[item.status]}
                    </span>
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
                  <h3>{detail.title}</h3>
                  <p>
                    {detail.user.name} ({detail.user.email}) · {INQUIRY_STATUS_LABELS[detail.status]}
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
                      <Btn
                        variant="primary"
                        type="submit"
                        disabled={sendReply.isPending || !reply.trim()}
                      >
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
      </section>
    </PageShell>
  )
}
