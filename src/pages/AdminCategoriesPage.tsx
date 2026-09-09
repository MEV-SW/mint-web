import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from '../api/personalizationApi'
import { listSources } from '../api/sourceApi'
import { Btn } from '../components/common/Btn'
import { Modal } from '../components/common/Modal'
import { PageShell } from '../components/layout/PageShell'
import { useToast } from '../components/common/Toast'
import { apiErrorDetail } from '../utils/apiError'
import type { NewsCategory } from '../types/personalization'

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
    </PageShell>
  )
}

