import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import {
  createCustomKeyword,
  listCategories,
  listKeywords,
  updateFeaturedCategories,
  updateMyCategories,
  updateMyKeywords,
} from '../api/personalizationApi'
import { Btn } from '../components/common/Btn'
import { PageShell } from '../components/layout/PageShell'
import { useToast } from '../components/common/Toast'
import { usePermissions } from '../hooks/usePermissions'

export function SettingsPage() {
  const toast = useToast()
  const qc = useQueryClient()
  const { isAdmin } = usePermissions()
  const [custom, setCustom] = useState('')
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
  const [featuredDraft, setFeaturedDraft] = useState<string[] | null>(null)
  const [keywordDraft, setKeywordDraft] = useState<string[] | null>(null)

  const selectedCategories =
    categoryDraft ?? categories.filter((item) => item.selected).map((item) => item.id)
  const featuredCategories =
    featuredDraft ?? categories.filter((item) => item.is_featured).map((item) => item.id)
  const selectedKeywords =
    keywordDraft ?? keywords.filter((item) => item.selected).map((item) => item.id)

  const sortedCategories = useMemo(
    () =>
      [...categories].sort((a, b) => {
        if (Boolean(a.is_featured) !== Boolean(b.is_featured)) {
          return a.is_featured ? -1 : 1
        }
        if (Boolean(a.is_discovered) !== Boolean(b.is_discovered)) {
          return a.is_discovered ? 1 : -1
        }
        const posts = (b.post_count ?? 0) - (a.post_count ?? 0)
        if (posts !== 0) return posts
        return a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'ko')
      }),
    [categories],
  )

  const keywordsByCategory = useMemo(() => {
    const map = new Map<string, typeof keywords>()
    for (const keyword of keywords) {
      if (keyword.scope === 'personal') continue
      const key = keyword.category_id ?? '__none__'
      const bucket = map.get(key) ?? []
      bucket.push(keyword)
      map.set(key, bucket)
    }
    return map
  }, [keywords])

  const saveCategories = useMutation({
    mutationFn: () => updateMyCategories(selectedCategories),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      qc.invalidateQueries({ queryKey: ['keywords'] })
      qc.invalidateQueries({ queryKey: ['personal-feed'] })
      toast('내 관심 분야를 저장했습니다.')
      setCategoryDraft(null)
      setKeywordDraft(null)
    },
    onError: () => toast('관심 분야를 최소 1개 선택해 주세요.', 'err'),
  })

  const saveFeatured = useMutation({
    mutationFn: () => updateFeaturedCategories(featuredCategories),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      toast('조직 메인 분야를 저장했습니다.')
      setFeaturedDraft(null)
    },
    onError: () => toast('메인 분야 저장에 실패했습니다.', 'err'),
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

  const toggleFeatured = (id: string) => {
    setFeaturedDraft(
      featuredCategories.includes(id)
        ? featuredCategories.filter((item) => item !== id)
        : [...featuredCategories, id],
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
      lead="조직 메인 분야는 회사가 강조하는 주제이고, 아래 전체 분야에서 나만의 1면을 골라 주세요."
      actions={
        <Btn
          variant="primary"
          onClick={() => saveCategories.mutate()}
          disabled={saveCategories.isPending || selectedCategories.length < 1}
        >
          내 분야 저장
        </Btn>
      }
    >
      <section className="settings-section">
        <header className="settings-section-head">
          <div>
            <h3>조직 메인 분야</h3>
            <p>회사 1면·조직 브리핑에서 강조하는 큰 주제입니다.</p>
          </div>
          {isAdmin && (
            <Btn
              variant="outline"
              size="sm"
              onClick={() => saveFeatured.mutate()}
              disabled={saveFeatured.isPending || featuredCategories.length < 1}
            >
              메인 분야 저장
            </Btn>
          )}
        </header>
        <div className="category-grid category-grid-compact">
          {sortedCategories.map((category) => {
            const featured = featuredCategories.includes(category.id)
            return (
              <button
                type="button"
                key={`featured-${category.id}`}
                className={`category-option category-option-compact ${featured ? 'featured' : ''} ${isAdmin ? '' : 'readonly'}`}
                onClick={() => isAdmin && toggleFeatured(category.id)}
                disabled={!isAdmin}
              >
                <span>{category.name}</span>
                <small>{featured ? '메인' : isAdmin ? '탭하여 지정' : ''}</small>
              </button>
            )
          })}
        </div>
      </section>

      <section className="settings-section">
        <header className="settings-section-head">
          <div>
            <h3>내 관심 분야 (전체)</h3>
            <p>
              크롤링·분류로 쌓인 모든 분야가 표시됩니다. EV뿐 아니라 관심 주제를 골라 나만의 1면을
              만드세요.
            </p>
          </div>
          <button
            type="button"
            className="keyword-toggle-link"
            onClick={() => setShowDiscovered((value) => !value)}
          >
            {showDiscovered ? '핵심 키워드만' : 'AI 발견 키워드 표시'}
          </button>
        </header>

        <div className="personal-category-list">
          {sortedCategories.map((category) => {
            const selected = selectedCategories.includes(category.id)
            const categoryKeywords = (keywordsByCategory.get(category.id) ?? []).filter(
              (keyword) => showDiscovered || keyword.is_curated !== false,
            )
            return (
              <article
                key={category.id}
                className={`personal-category-card ${selected ? 'selected' : ''}`}
              >
                <button
                  type="button"
                  className="personal-category-card-head"
                  onClick={() => toggleCategory(category.id)}
                >
                  <div>
                    <strong>
                      {category.name}
                      {category.is_discovered && (
                        <span className="keyword-badge-new">수집</span>
                      )}
                    </strong>
                    <span>
                      기사 {category.post_count ?? 0}건
                      {(category.keyword_count ?? 0) > 0 && ` · 키워드 ${category.keyword_count}개`}
                      {(category.curated_keyword_count ?? 0) > 0 &&
                        ` · 핵심 ${category.curated_keyword_count}개`}
                    </span>
                  </div>
                  <span className="personal-category-check">{selected ? '선택됨' : '선택'}</span>
                </button>
                {categoryKeywords.length > 0 && (
                  <div className="personal-category-keywords">
                    {categoryKeywords.map((keyword) => (
                      <button
                        type="button"
                        key={keyword.id}
                        className={`keyword-chip-option ${selectedKeywords.includes(keyword.id) ? 'selected' : ''}`}
                        onClick={() => toggleKeyword(keyword.id)}
                      >
                        {keyword.name}
                        {keyword.status === 'candidate' && !keyword.is_curated && (
                          <span className="keyword-badge-new">발견</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      </section>

      <section className="settings-section">
        <header className="settings-section-head">
          <div>
            <h3>나만의 키워드</h3>
            <p>분야와 별도로 직접 추가한 주제입니다.</p>
          </div>
          <Btn
            variant="outline"
            size="sm"
            onClick={() => saveKeywords.mutate()}
            disabled={saveKeywords.isPending || selectedKeywords.length < 1}
          >
            키워드 저장
          </Btn>
        </header>
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
        <div className="keyword-grid">
          {keywords
            .filter((keyword) => keyword.scope === 'personal')
            .map((keyword) => (
              <button
                type="button"
                key={keyword.id}
                className={`keyword-option ${selectedKeywords.includes(keyword.id) ? 'selected' : ''}`}
                onClick={() => toggleKeyword(keyword.id)}
              >
                <span>{keyword.name}</span>
                <small>나만의 키워드</small>
              </button>
            ))}
        </div>
      </section>
    </PageShell>
  )
}
