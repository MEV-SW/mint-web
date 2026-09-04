import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listEditions } from '../api/editionApi'
import {
  listUsers,
  setUserActive,
  updateUserEditions,
  updateUserRole,
  type UserAdmin,
  type UserEditionAssignment,
} from '../api/usersApi'
import { Btn } from '../components/common/Btn'
import { PageShell } from '../components/layout/PageShell'
import { useToast } from '../components/common/Toast'
import { useAuthStore } from '../store/authStore'
import { formatDateTime } from '../utils/date'
import { apiErrorDetail } from '../utils/apiError'
import type { Edition } from '../types/edition'

type Filter = 'all' | 'unassigned' | 'admin' | 'pending' | 'inactive'

function membershipsOf(user: UserAdmin) {
  return new Map((user.editions ?? []).map((item) => [item.id, item.is_editor]))
}

function assignmentsFrom(map: Map<string, boolean>): UserEditionAssignment[] {
  return [...map.entries()].map(([edition_id, is_editor]) => ({ edition_id, is_editor }))
}

function sameAssignments(a: UserEditionAssignment[], b: UserEditionAssignment[]) {
  const key = (items: UserEditionAssignment[]) =>
    [...items]
      .sort((x, y) => x.edition_id.localeCompare(y.edition_id))
      .map((item) => `${item.edition_id}:${item.is_editor ? 1 : 0}`)
      .join('|')
  return key(a) === key(b)
}

function draftFor(user: UserAdmin, drafts: Record<string, UserEditionAssignment[]>) {
  return drafts[user.id] ?? assignmentsFrom(membershipsOf(user))
}

export function AdminAccountsPage() {
  const toast = useToast()
  const qc = useQueryClient()
  const me = useAuthStore((s) => s.user)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [drafts, setDrafts] = useState<Record<string, UserEditionAssignment[]>>({})
  const [editingUserId, setEditingUserId] = useState<string | null>(null)

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: listUsers,
  })
  const { data: editions = [] } = useQuery({
    queryKey: ['editions', 'all'],
    queryFn: () => listEditions(false),
  })

  const saveEditions = useMutation({
    mutationFn: ({ userId, editions: next }: { userId: string; editions: UserEditionAssignment[] }) =>
      updateUserEditions(userId, next),
    onSuccess: (_row, vars) => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setDrafts((current) => {
        const next = { ...current }
        delete next[vars.userId]
        return next
      })
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

  const saveRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'admin' | 'viewer' }) =>
      updateUserRole(userId, role),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast(row.role === 'admin' ? '총관으로 지정했습니다.' : '총관을 해제했습니다.')
    },
    onError: (e) => toast(apiErrorDetail(e) || '역할 변경 실패', 'err'),
  })

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return users.filter((user) => {
      if (needle) {
        const hay = `${user.name} ${user.email}`.toLowerCase()
        if (!hay.includes(needle)) return false
      }
      if (filter === 'unassigned') return user.role !== 'admin' && (user.editions ?? []).length === 0
      if (filter === 'admin') return user.role === 'admin'
      if (filter === 'pending') return user.approval_status === 'pending'
      if (filter === 'inactive') return !user.is_active
      return true
    })
  }, [users, query, filter])

  function setDraft(user: UserAdmin, next: UserEditionAssignment[]) {
    const saved = assignmentsFrom(membershipsOf(user))
    setDrafts((current) => {
      const copy = { ...current }
      if (sameAssignments(saved, next)) delete copy[user.id]
      else copy[user.id] = next
      return copy
    })
  }

  function toggleMembership(user: UserAdmin, editionId: string) {
    const current = new Map(draftFor(user, drafts).map((item) => [item.edition_id, item.is_editor]))
    if (current.has(editionId)) current.delete(editionId)
    else current.set(editionId, false)
    setDraft(user, assignmentsFrom(current))
  }

  function toggleEditor(user: UserAdmin, editionId: string) {
    const current = new Map(draftFor(user, drafts).map((item) => [item.edition_id, item.is_editor]))
    if (!current.has(editionId)) current.set(editionId, true)
    else current.set(editionId, !current.get(editionId))
    setDraft(user, assignmentsFrom(current))
  }

  function confirmAdmin(user: UserAdmin, makeAdmin: boolean) {
    if (makeAdmin) {
      if (!window.confirm(`${user.name}님을 총관으로 지정할까요? 모든 지면과 계정·문의 관리를 볼 수 있습니다.`)) {
        return
      }
      saveRole.mutate({ userId: user.id, role: 'admin' })
      return
    }
    if (!window.confirm(`${user.name}님의 총관을 해제할까요? 지정된 분야만 보게 됩니다.`)) return
    saveRole.mutate({ userId: user.id, role: 'viewer' })
  }

  function confirmActive(user: UserAdmin, nextActive: boolean) {
    if (!nextActive) {
      if (!window.confirm(`${user.name}님 계정을 비활성화할까요? 로그인이 막힙니다.`)) return
    }
    toggleActive.mutate({ userId: user.id, isActive: nextActive })
  }

  return (
    <PageShell
      section="관리 · 계정"
      title="계정 관리"
      lead="SSO로 들어온 구성원에게 사업 분야를 배정하고 총관을 지정합니다."
      leadSingleLine
    >
      <div className="admin-accounts-toolbar">
        <input
          className="input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="이름 또는 이메일 검색"
          aria-label="이름 또는 이메일 검색"
        />
        <div className="seg" role="tablist" aria-label="계정 필터">
          {(
            [
              ['all', '전체'],
              ['unassigned', '미배정'],
              ['admin', '총관'],
              ['pending', '승인 대기'],
              ['inactive', '비활성'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={filter === id ? 'on' : undefined}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>이름</th>
              <th>이메일</th>
              <th>분야</th>
              <th style={{ width: 88 }}>총관</th>
              <th style={{ width: 100 }}>활성</th>
              <th className="num" style={{ width: 168 }}>최근 로그인</th>
            </tr>
          </thead>
          <tbody>
            {usersLoading && (
              <tr>
                <td colSpan={6}>로딩 중…</td>
              </tr>
            )}
            {!usersLoading && visible.length === 0 && (
              <tr>
                <td colSpan={6} className="sources-empty-cell">
                  {users.length === 0
                    ? 'SSO로 로그인한 사용자가 아직 없습니다.'
                    : '조건에 맞는 계정이 없습니다.'}
                </td>
              </tr>
            )}
            {visible.map((user) => {
              const assigned = new Map(draftFor(user, drafts).map((item) => [item.edition_id, item.is_editor]))
              const dirty = Boolean(drafts[user.id])
              const isSelf = me?.id === user.id
              return (
                <tr key={user.id} className={dirty ? 'admin-accounts-row-dirty' : undefined}>
                  <td>
                    {user.name}
                    {user.role === 'admin' && (
                      <span className="pill" style={{ marginLeft: 8 }}>
                        총관
                      </span>
                    )}
                    {isSelf && (
                      <span className="pill" style={{ marginLeft: 8 }}>
                        나
                      </span>
                    )}
                  </td>
                  <td>{user.email}</td>
                  <td>
                    {(() => {
                      const named = editions.filter((edition) => assigned.has(edition.id))
                      const summary =
                        named.length === 0
                          ? '미배정'
                          : named
                              .map((edition) =>
                                assigned.get(edition.id) ? `${edition.name}·편집` : edition.name,
                              )
                              .join(', ')
                      const open = editingUserId === user.id || dirty
                      return (
                        <div className="account-editions">
                          <div className="account-editions-summary">
                            <span>{summary}</span>
                            <button
                              type="button"
                              className="news-chip-toggle"
                              onClick={() =>
                                setEditingUserId((current) => (current === user.id ? null : user.id))
                              }
                            >
                              {open ? '접기' : '수정'}
                            </button>
                          </div>
                          {open && (
                            <div className="pick-list">
                              {editions.map((edition: Edition) => {
                                const on = assigned.has(edition.id)
                                const editor = assigned.get(edition.id) === true
                                return (
                                  <label key={edition.id} className={`pick-row${on ? ' is-on' : ''}`}>
                                    <input
                                      type="checkbox"
                                      checked={on}
                                      disabled={saveEditions.isPending}
                                      onChange={() => toggleMembership(user, edition.id)}
                                    />
                                    <span>{edition.name}</span>
                                    {on && (
                                      <button
                                        type="button"
                                        className="pick-row-sub"
                                        disabled={saveEditions.isPending}
                                        onClick={() => toggleEditor(user, edition.id)}
                                      >
                                        {editor ? '편집장' : '열람'}
                                      </button>
                                    )}
                                  </label>
                                )
                              })}
                            </div>
                          )}
                          {dirty && (
                            <div className="admin-accounts-row-actions">
                              <Btn
                                variant="primary"
                                size="sm"
                                disabled={saveEditions.isPending}
                                onClick={() =>
                                  saveEditions.mutate({
                                    userId: user.id,
                                    editions: drafts[user.id] ?? [],
                                  })
                                }
                              >
                                배정 저장
                              </Btn>
                              <Btn
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setDrafts((current) => {
                                    const next = { ...current }
                                    delete next[user.id]
                                    return next
                                  })
                                }
                              >
                                취소
                              </Btn>
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </td>
                  <td>
                    <label className="edition-active-toggle">
                      <input
                        type="checkbox"
                        checked={user.role === 'admin'}
                        disabled={saveRole.isPending || isSelf}
                        title={isSelf ? '자신의 총관 권한은 해제할 수 없습니다.' : '총관 지정'}
                        onChange={(e) => confirmAdmin(user, e.target.checked)}
                      />
                      {user.role === 'admin' ? '총관' : '일반'}
                    </label>
                  </td>
                  <td>
                    <label className="edition-active-toggle">
                      <input
                        type="checkbox"
                        checked={user.is_active}
                        disabled={toggleActive.isPending || isSelf}
                        title={isSelf ? '자신의 계정은 비활성화할 수 없습니다.' : undefined}
                        onChange={(e) => confirmActive(user, e.target.checked)}
                      />
                      {user.approval_status === 'pending'
                        ? '승인 대기'
                        : user.is_active
                          ? '활성'
                          : '비활성'}
                    </label>
                  </td>
                  <td className="mono admin-accounts-login">
                    <span>{formatDateTime(user.last_login_at)}</span>
                    <small>가입 {formatDateTime(user.created_at)}</small>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </PageShell>
  )
}
