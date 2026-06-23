import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { approveUser, listUsers, rejectUser } from '../api/usersApi'
import { Btn } from '../components/common/Btn'
import { PageShell } from '../components/layout/PageShell'
import { useToast } from '../components/common/Toast'
import { formatDateTime } from '../utils/date'
import { apiErrorDetail } from '../utils/apiError'

const STATUS_LABELS = {
  pending: '승인 대기',
  approved: '승인됨',
  rejected: '거절됨',
} as const

export function AdminUsersPage() {
  const toast = useToast()
  const qc = useQueryClient()
  const [tab, setTab] = useState<'pending' | 'all'>('pending')

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users', tab],
    queryFn: () => listUsers(tab === 'pending' ? 'pending' : undefined),
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

  const busy = approve.isPending || reject.isPending
  const rows = tab === 'pending' ? users.filter((u) => u.approval_status === 'pending') : users

  return (
    <PageShell
      section="관리"
      title="가입 승인"
      lead="회원가입 신청을 검토하고 승인하거나 거절할 수 있습니다."
      leadSingleLine
    >
      <div className="seg" style={{ marginBottom: 20 }}>
        <button type="button" className={tab === 'pending' ? 'on' : undefined} onClick={() => setTab('pending')}>
          승인 대기
        </button>
        <button type="button" className={tab === 'all' ? 'on' : undefined} onClick={() => setTab('all')}>
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
              {tab === 'pending' && <th style={{ width: 160 }} />}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={tab === 'pending' ? 5 : 4}>로딩 중…</td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={tab === 'pending' ? 5 : 4} style={{ color: 'var(--text-muted)' }}>
                  {tab === 'pending' ? '승인 대기 중인 가입 신청이 없습니다.' : '등록된 사용자가 없습니다.'}
                </td>
              </tr>
            )}
            {rows.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{STATUS_LABELS[u.approval_status]}</td>
                <td className="mono" style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                  {formatDateTime(u.created_at)}
                </td>
                {tab === 'pending' && (
                  <td>
                    {u.approval_status === 'pending' && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Btn
                          variant="soft"
                          size="sm"
                          disabled={busy}
                          onClick={() => approve.mutate(u.id)}
                        >
                          승인
                        </Btn>
                        <Btn
                          variant="outline"
                          size="sm"
                          disabled={busy}
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
    </PageShell>
  )
}
