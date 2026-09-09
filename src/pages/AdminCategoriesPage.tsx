import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from '../api/personalizationApi'
import { approveCategorySourceSuggestion, listSources, suggestCategorySources } from '../api/sourceApi'
import { Btn } from '../components/common/Btn'
import { Modal } from '../components/common/Modal'
import { PageShell } from '../components/layout/PageShell'
import { useToast } from '../components/common/Toast'
import { apiErrorDetail } from '../utils/apiError'
import type { NewsCategory } from '../types/personalization'
import type { SourceSuggestionCandidate } from '../types/source'

const SOURCE_TYPE_LABELS: Record<string, string> = {
  rss: 'RSS',
  webpage: '웹페이지',
  news_page: '뉴스',
  notice_page: '공지',
}

interface CategoryForm {
  name: string
  sort_order: number
}

const emptyForm: CategoryForm = { name: '', sort_order: 0 }

function formFor(category: NewsCategory): CategoryForm {
  return { name: category.name, sort_order: category.sort_order }
}

export function AdminCategoriesPage() {
  const toast = useToast()
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<NewsCategory | null>(null)
  const [form, setForm] = useState<CategoryForm>(emptyForm)
  const [suggestFor, setSuggestFor] = useState<NewsCategory | null>(null)
  const [candidates, setCandidates] = useState<SourceSuggestionCandidate[]>([])

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: listCategories,
  })
  const { data: sources = [] } = useQuery({
    queryKey: ['sources'],
    queryFn: listSources,
  })

  const sourceCountByCategory = new Map<string, number>()
  for (const source of sources) {
    if (!source.is_active || !source.category_id) continue
    sourceCountByCategory.set(source.category_id, (sourceCountByCategory.get(source.category_id) ?? 0) + 1)
  }

  const create = useMutation({
    mutationFn: () => createCategory({ name: form.name.trim(), sort_order: form.sort_order }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      setShowAdd(false)
      setForm(emptyForm)
      toast('카테고리를 추가했습니다.')
    },
    onError: (e) => toast(apiErrorDetail(e) || '추가 실패', 'err'),
  })

  const update = useMutation({
    mutationFn: () =>
      updateCategory(editing!.id, { name: form.name.trim(), sort_order: form.sort_order }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      setEditing(null)
      setForm(emptyForm)
      toast('카테고리를 수정했습니다.')
    },
    onError: (e) => toast(apiErrorDetail(e) || '수정 실패', 'err'),
  })

  const deactivate = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      toast('카테고리를 비활성화했습니다.')
    },
    onError: (e) => toast(apiErrorDetail(e) || '비활성화 실패', 'err'),
  })

  const suggest = useMutation({
    mutationFn: (category: NewsCategory) => suggestCategorySources(category.id),
    onSuccess: (res) => setCandidates(res.candidates),
    onError: (e) => toast(apiErrorDetail(e) || '소스 제안 생성 실패', 'err'),
  })

  const approve = useMutation({
    mutationFn: (candidate: SourceSuggestionCandidate) =>
      approveCategorySourceSuggestion(suggestFor!.id, candidate),
    onSuccess: (_row, candidate) => {
      qc.invalidateQueries({ queryKey: ['sources'] })
      setCandidates((current) => current.filter((c) => c.url !== candidate.url))
      toast('소스를 승인했습니다.')
    },
    onError: (e) => toast(apiErrorDetail(e) || '승인 실패', 'err'),
  })

  function openSuggest(category: NewsCategory) {
    setSuggestFor(category)
    setCandidates([])
    suggest.mutate(category)
  }

  function closeSuggest() {
    setSuggestFor(null)
    setCandidates([])
  }

  function openAdd() {
    setForm(emptyForm)
    setShowAdd(true)
  }

  function openEdit(category: NewsCategory) {
    setEditing(category)
    setForm(formFor(category))
  }

  function closeModals() {
    setShowAdd(false)
    setEditing(null)
    setForm(emptyForm)
  }

  function confirmDeactivate(category: NewsCategory) {
    if (!window.confirm(`"${category.name}" 카테고리를 비활성화할까요?`)) return
    deactivate.mutate(category.id)
  }

  const canSave = Boolean(form.name.trim())

  return (
    <PageShell
      section="관리 · 카테고리"
      title="카테고리 관리"
      lead="뉴스 분류에 쓰이는 카테고리를 만들고 정렬합니다."
      leadSingleLine
      actions={
        <Btn variant="primary" size="sm" icon="plus" onClick={openAdd}>
          카테고리 추가
        </Btn>
      }
    >
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>이름</th>
              <th className="num" style={{ width: 100 }}>정렬순서</th>
              <th style={{ width: 100 }}>상태</th>
              <th className="num" style={{ width: 100 }}>사용 소스</th>
              <th style={{ width: 140 }}>액션</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5}>로딩 중…</td>
              </tr>
            )}
            {!isLoading && categories.length === 0 && (
              <tr>
                <td colSpan={5} className="sources-empty-cell">
                  아직 만든 카테고리가 없습니다. "카테고리 추가"로 시작하세요.
                </td>
              </tr>
            )}
            {categories.map((category) => (
              <tr key={category.id}>
                <td>{category.name}</td>
                <td className="num">{category.sort_order}</td>
                <td>
                  <span className="pill">{category.is_active === false ? '비활성' : '활성'}</span>
                </td>
                <td className="num">{sourceCountByCategory.get(category.id) ?? 0}</td>
                <td>
                  <Btn variant="ghost" size="sm" icon="sparkles" onClick={() => openSuggest(category)}>
                    AI 소스 제안
                  </Btn>
                  <Btn variant="ghost" size="sm" icon="settings" onClick={() => openEdit(category)}>
                    수정
                  </Btn>
                  <Btn
                    variant="ghost"
                    size="sm"
                    icon="trash"
                    onClick={() => confirmDeactivate(category)}
                    disabled={deactivate.isPending}
                  >
                    비활성화
                  </Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(showAdd || editing) && (
        <Modal
          title={editing ? '카테고리 수정' : '카테고리 추가'}
          onClose={closeModals}
          footer={
            <>
              <Btn variant="outline" onClick={closeModals}>
                취소
              </Btn>
              <Btn
                variant="primary"
                onClick={() => (editing ? update.mutate() : create.mutate())}
                disabled={!canSave || create.isPending || update.isPending}
              >
                {create.isPending || update.isPending ? '저장 중…' : editing ? '저장' : '등록'}
              </Btn>
            </>
          }
        >
          <div className="field">
            <label htmlFor="category-name">이름</label>
            <input
              id="category-name"
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoFocus
            />
          </div>
          <div className="field">
            <label htmlFor="category-sort">정렬순서</label>
            <input
              id="category-sort"
              className="input"
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) || 0 })}
            />
          </div>
        </Modal>
      )}

      {suggestFor && (
        <Modal
          title={`${suggestFor.name} 소스 제안`}
          wide
          onClose={closeSuggest}
          footer={
            <>
              <Btn
                variant="outline"
                icon="refresh"
                onClick={() => suggest.mutate(suggestFor)}
                disabled={suggest.isPending}
              >
                {suggest.isPending ? '생성 중…' : '다시 생성'}
              </Btn>
              <Btn variant="primary" onClick={closeSuggest}>
                닫기
              </Btn>
            </>
          }
        >
          {suggest.isPending && <p className="sources-empty-cell">소스 후보를 찾는 중…</p>}
          {!suggest.isPending && candidates.length === 0 && (
            <p className="sources-empty-cell">적절한 소스 후보를 찾지 못했습니다. "다시 생성"을 눌러보세요.</p>
          )}
          {!suggest.isPending && candidates.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {candidates.map((candidate) => {
                const approving = approve.isPending && approve.variables?.url === candidate.url
                return (
                  <article key={candidate.url} className="card card-pad">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <strong style={{ flex: 1 }}>{candidate.name}</strong>
                      <span className="pill">
                        {SOURCE_TYPE_LABELS[candidate.source_type] ?? candidate.source_type}
                      </span>
                    </div>
                    <a href={candidate.url} target="_blank" rel="noreferrer" className="mono">
                      {candidate.url}
                    </a>
                    <p style={{ margin: '8px 0' }}>{candidate.reason}</p>
                    <Btn
                      variant="primary"
                      size="sm"
                      onClick={() => approve.mutate(candidate)}
                      disabled={approving}
                    >
                      {approving ? '승인 중…' : '승인'}
                    </Btn>
                  </article>
                )
              })}
            </div>
          )}
        </Modal>
      )}
    </PageShell>
  )
}

