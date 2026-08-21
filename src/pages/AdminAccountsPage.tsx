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
import { listEditions } from '../api/editionApi'
import { listUsers, setUserActive, updateUserEditions, type UserAdmin } from '../api/usersApi'
import { Btn } from '../components/common/Btn'
import { PageShell } from '../components/layout/PageShell'
import { useToast } from '../components/common/Toast'
import { formatDateTime } from '../utils/date'
import { apiErrorDetail } from '../utils/apiError'

const INQUIRY_STATUS_LABELS: Record<InquiryStatus, string> = {
  open: '미답변',
  answered: '답변 완료',
  closed: '종료',
}

function editorOf(users: UserAdmin[], editionId: string): string | null {
  const match = users.find((user) => user.editions?.some((item) => item.id === editionId && item.is_editor))
  return match?.id ?? null
}

export function AdminAccountsPage() {
  const toast = useToast()
  const qc = useQueryClient()

  const [statusFilter, setStatusFilter] = useState<InquiryStatus | 'all'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [reply, setReply] = useState('')

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: listUsers,
  })
  const { data: editions = [] } = useQuery({
    queryKey: ['editions', 'all'],
    queryFn: () => listEditions(false),
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

  const saveEditions = useMutation({
    mutationFn: ({ userId, editions: next }: { userId: string; editions: { edition_id: string; is_editor: boolean }[] }) =>
      updateUserEditions(userId, next),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast('분야 배정을 저장했습니다.')
    },
    onError: (e) => toast(apiErrorDetail(e) || '분야 배정 실패', 'err'),
  })

  const toggleActive = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      setUserActive(userId, isActive),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast(row.is_active ? '계정을 활성화했습니다.' : '계정을 비활성화했습니다.')
    },
    onError: (e) => toast(apiErrorDetail(e) || '상태 변경 실패', 'err'),
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

  function membershipsOf(user: UserAdmin) {
    return new Map((user.editions ?? []).map((item) => [item.id, item.is_editor]))
  }

  function toggleMembership(user: UserAdmin, editionId: string) {
    const current = membershipsOf(user)
    if (current.has(editionId)) current.delete(editionId)
    else current.set(editionId, false)
    saveEditions.mutate({
      userId: user.id,
      editions: [...current.entries()].map(([edition_id, is_editor]) => ({ edition_id, is_editor })),
    })
  }

  function toggleEditor(user: UserAdmin, editionId: string) {
    const current = membershipsOf(user)
    if (!current.has(editionId)) current.set(editionId, true)
    else current.set(editionId, !current.get(editionId))
    saveEditions.mutate({
      userId: user.id,
      editions: [...current.entries()].map(([edition_id, is_editor]) => ({ edition_id, is_editor })),
    })
  }

  return (
    <PageShell
      section="관리 · Accounts"
      title="계정 관리"
      lead="SSO로 들어온 구성원에게 사업 분야를 배정하고 문의를 처리합니다."
      leadSingleLine
    >
      <section className="admin-accounts-section">
        <header className="admin-accounts-section-head">
          <h2>분야 배정</h2>
          <p>한 사람은 여러 분야에 속할 수 있고, 분야당 편집장은 1명입니다.</p>
        </header>

        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>이름</th>
                <th>이메일</th>
                <th>분야</th>
                <th style={{ width: 100 }}>활성</th>
                <th style={{ width: 160 }}>최근 로그인</th>
              </tr>
            </thead>
            <tbody>
              {usersLoading && (
                <tr>
                  <td colSpan={5}>로딩 중…</td>
                </tr>
              )}
              {!usersLoading && users.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ color: 'var(--text-muted)' }}>
                    SSO로 로그인한 사용자가 아직 없습니다.
                  </td>
                </tr>
              )}
              {users.map((user) => {
                const assigned = membershipsOf(user)
                return (
                  <tr key={user.id}>
                    <td>
                      {user.name}
                      {user.role === 'admin' && (
                        <span className="pill" style={{ marginLeft: 8 }}>
                          총관
                        </span>
                      )}
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <div className="personal-category-keywords" style={{ padding: 0, gap: 6 }}>
                        {editions.map((edition) => {
                          const on = assigned.has(edition.id)
                          const editor = assigned.get(edition.id) === true
                          const otherEditor = editorOf(users, edition.id)
                          return (
                            <span key={edition.id} style={{ display: 'inline-flex', gap: 4 }}>
                              <button
                                type="button"
                                className={`keyword-chip-option ${on ? 'selected' : ''}`}
                                disabled={saveEditions.isPending}
                                onClick={() => toggleMembership(user, edition.id)}
                              >
                                {edition.name}
                              </button>
                              {on && (
                                <button
                                  type="button"
                                  className={`keyword-chip-option ${editor ? 'selected' : ''}`}
                                  disabled={saveEditions.isPending}
                                  title={
                                    otherEditor && otherEditor !== user.id && !editor
                                      ? '저장하면 기존 편집장이 해제됩니다'
                                      : '이 분야 편집장'
                                  }
                                  onClick={() => toggleEditor(user, edition.id)}
                                >
                                  편집장
                                </button>
                              )}
                            </span>
                          )
                        })}
                      </div>
                    </td>
                    <td>
                      <label className="edition-active-toggle">
                        <input
                          type="checkbox"
                          checked={user.is_active}
                          disabled={toggleActive.isPending}
                          onChange={(e) =>
                            toggleActive.mutate({ userId: user.id, isActive: e.target.checked })
                          }
                        />
                        {user.is_active ? '활성' : '차단'}
                      </label>
                    </td>
                    <td className="mono" style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                      {formatDateTime(user.created_at)}
                    </td>
                  </tr>
                )
              })}
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
