import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import {
  createCustomKeyword,
  listCategories,
  listKeywords,
  updateMyKeywords,
} from '../api/personalizationApi'
import { Btn } from '../components/common/Btn'
import { PageShell } from '../components/layout/PageShell'
import { useToast } from '../components/common/Toast'
import { groupKeywords } from '../utils/groupKeywords'

export function SettingsPage() {
  const toast = useToast()
  const qc = useQueryClient()
  const [custom, setCustom] = useState('')
  const { data: keywords = [] } = useQuery({ queryKey: ['keywords'], queryFn: listKeywords })
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: listCategories,
  })
  const [draft, setDraft] = useState<string[] | null>(null)
  const selected = draft ?? keywords.filter((item) => item.selected).map((item) => item.id)

  const keywordGroups = useMemo(
    () => groupKeywords(keywords, categories),
    [keywords, categories],
  )

  const save = useMutation({
    mutationFn: () => updateMyKeywords(selected),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['keywords'] })
      qc.invalidateQueries({ queryKey: ['personal-feed'] })
      toast('관심 키워드를 저장했습니다.')
      setDraft(null)
    },
    onError: () => toast('키워드는 최소 3개를 선택해야 합니다.', 'err'),
  })
  const add = useMutation({
    mutationFn: () => createCustomKeyword(custom),
    onSuccess: (keyword) => {
      setCustom('')
      setDraft((current) => [...new Set([...(current ?? selected), keyword.id])])
      qc.invalidateQueries({ queryKey: ['keywords'] })
    },
  })

  const toggle = (id: string) => {
    setDraft(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id])
  }

  return (
    <PageShell
      section="개인설정"
      title="관심 키워드"
      lead="세 개 이상 선택하세요. 크롤링·분류 과정에서 발견된 신규 키워드도 카테고리별로 표시됩니다."
      actions={
        <Btn variant="primary" onClick={() => save.mutate()} disabled={save.isPending}>
          저장
        </Btn>
      }
    >
      <div className="keyword-create">
        <input
          className="input"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="직접 키워드 추가"
        />
        <Btn variant="outline" onClick={() => add.mutate()} disabled={!custom.trim() || add.isPending}>
          추가
        </Btn>
      </div>
      {keywordGroups.map((group) => (
        <section key={group.id} className="keyword-section">
          <header className="keyword-section-head">
            <h3>{group.name}</h3>
            <span>{group.keywords.length}개</span>
          </header>
          <div className="keyword-grid">
            {group.keywords.map((keyword) => (
              <button
                type="button"
                key={keyword.id}
                className={`keyword-option ${selected.includes(keyword.id) ? 'selected' : ''}`}
                onClick={() => toggle(keyword.id)}
              >
                <span>
                  {keyword.name}
                  {keyword.status === 'candidate' && (
                    <span className="keyword-badge-new">신규</span>
                  )}
                </span>
                <small>
                  {keyword.scope === 'personal'
                    ? '나만의 키워드'
                    : keyword.category_name ?? '표준 키워드'}
                </small>
              </button>
            ))}
          </div>
        </section>
      ))}
    </PageShell>
  )
}
