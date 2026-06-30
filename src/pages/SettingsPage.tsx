import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import {
  createCustomKeyword,
  listCategories,
  listKeywords,
  updateMyCategories,
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
  const [showFineTune, setShowFineTune] = useState(false)
  const [showDiscovered, setShowDiscovered] = useState(false)
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: listCategories,
  })
  const { data: keywords = [] } = useQuery({
    queryKey: ['keywords', showDiscovered],
    queryFn: () => listKeywords(showDiscovered),
  })
  const [categoryDraft, setCategoryDraft] = useState<string[] | null>(null)
  const [keywordDraft, setKeywordDraft] = useState<string[] | null>(null)

  const selectedCategories =
    categoryDraft ?? categories.filter((item) => item.selected).map((item) => item.id)
  const selectedKeywords =
    keywordDraft ?? keywords.filter((item) => item.selected).map((item) => item.id)

  const visibleKeywords = useMemo(() => {
    if (showDiscovered) return keywords
    const categorySet = new Set(selectedCategories)
    return keywords.filter(
      (keyword) =>
        keyword.scope === 'personal' ||
        keyword.is_curated !== false ||
        (keyword.category_id && categorySet.has(keyword.category_id)),
    )
  }, [keywords, selectedCategories, showDiscovered])

  const keywordGroups = useMemo(
    () => groupKeywords(visibleKeywords, categories),
    [visibleKeywords, categories],
  )

  const saveCategories = useMutation({
    mutationFn: () => updateMyCategories(selectedCategories),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      qc.invalidateQueries({ queryKey: ['keywords'] })
      qc.invalidateQueries({ queryKey: ['personal-feed'] })
      toast('관심 분야를 저장했습니다.')
      setCategoryDraft(null)
      setKeywordDraft(null)
    },
    onError: () => toast('관심 분야를 최소 1개 선택해 주세요.', 'err'),
  })

  const saveKeywords = useMutation({
    mutationFn: () => updateMyKeywords(selectedKeywords),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['keywords'] })
      qc.invalidateQueries({ queryKey: ['personal-feed'] })
      toast('세부 키워드를 저장했습니다.')
      setKeywordDraft(null)
    },
    onError: () => toast('키워드 저장에 실패했습니다.', 'err'),
  })

  const add = useMutation({
    mutationFn: () => createCustomKeyword(custom),
    onSuccess: (keyword) => {
      setCustom('')
      setKeywordDraft((current) => [
        ...new Set([...(current ?? selectedKeywords), keyword.id]),
      ])
      qc.invalidateQueries({ queryKey: ['keywords'] })
    },
  })

  const toggleCategory = (id: string) => {
    setCategoryDraft(
      selectedCategories.includes(id)
        ? selectedCategories.filter((item) => item !== id)
        : [...selectedCategories, id],
    )
  }

  const toggleKeyword = (id: string) => {
    setKeywordDraft(
      selectedKeywords.includes(id)
        ? selectedKeywords.filter((item) => item !== id)
        : [...selectedKeywords, id],
    )
  }

  return (
    <PageShell
      section="개인설정"
      title="관심 분야"
      lead="먼저 큰 틀의 분야를 고르세요. 선택한 분야의 핵심 키워드로 1면과 개인 리포트가 구성됩니다."
      actions={
        <Btn
          variant="primary"
          onClick={() => saveCategories.mutate()}
          disabled={saveCategories.isPending || selectedCategories.length < 1}
        >
          저장
        </Btn>
      }
    >
      <div className="category-grid">
        {categories.map((category) => (
          <button
            type="button"
            key={category.id}
            className={`category-option ${selectedCategories.includes(category.id) ? 'selected' : ''}`}
            onClick={() => toggleCategory(category.id)}
          >
            <span>{category.name}</span>
            <small>{selectedCategories.includes(category.id) ? '선택됨' : '탭하여 선택'}</small>
          </button>
        ))}
      </div>

      <div className="keyword-settings-tools">
        <button
          type="button"
          className="keyword-toggle-link"
          onClick={() => setShowFineTune((value) => !value)}
        >
          {showFineTune ? '세부 키워드 접기' : '세부 키워드 조정 (선택)'}
        </button>
        {showFineTune && (
          <button
            type="button"
            className="keyword-toggle-link"
            onClick={() => setShowDiscovered((value) => !value)}
          >
            {showDiscovered ? '핵심 키워드만 보기' : 'AI 발견 키워드 포함'}
          </button>
        )}
      </div>

      {showFineTune && (
        <>
          <div className="keyword-create">
            <input
              className="input"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="직접 키워드 추가"
            />
            <Btn
              variant="outline"
              onClick={() => add.mutate()}
              disabled={!custom.trim() || add.isPending}
            >
              추가
            </Btn>
            <Btn
              variant="outline"
              onClick={() => saveKeywords.mutate()}
              disabled={saveKeywords.isPending || selectedKeywords.length < 1}
            >
              키워드 저장
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
                    className={`keyword-option ${selectedKeywords.includes(keyword.id) ? 'selected' : ''}`}
                    onClick={() => toggleKeyword(keyword.id)}
                  >
                    <span>
                      {keyword.name}
                      {keyword.status === 'candidate' && !keyword.is_curated && (
                        <span className="keyword-badge-new">발견</span>
                      )}
                    </span>
                    <small>
                      {keyword.scope === 'personal'
                        ? '나만의 키워드'
                        : keyword.is_curated
                          ? '핵심 키워드'
                          : 'AI 발견'}
                    </small>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </PageShell>
  )
}
