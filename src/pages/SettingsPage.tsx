import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { listCategories, updateFeaturedCategories } from '../api/personalizationApi'
import { Btn } from '../components/common/Btn'
import { PageShell } from '../components/layout/PageShell'
import { useToast } from '../components/common/Toast'
import { usePermissions } from '../hooks/usePermissions'

export function SettingsPage() {
  const toast = useToast()
  const qc = useQueryClient()
  const { isAdmin } = usePermissions()
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: listCategories,
  })
  const [featuredDraft, setFeaturedDraft] = useState<string[] | null>(null)

  const featuredCategories =
    featuredDraft ?? categories.filter((item) => item.is_featured).map((item) => item.id)

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

  const saveFeatured = useMutation({
    mutationFn: () => updateFeaturedCategories(featuredCategories),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      toast('조직 메인 분야를 저장했습니다.')
      setFeaturedDraft(null)
    },
    onError: () => toast('메인 분야 저장에 실패했습니다.', 'err'),
  })

  const toggleFeatured = (id: string) => {
    setFeaturedDraft(
      featuredCategories.includes(id)
        ? featuredCategories.filter((item) => item !== id)
        : [...featuredCategories, id],
    )
  }

  return (
    <PageShell
      section="개인설정"
      title="설정"
      lead="개인 맞춤 구독은 추후 제공 예정입니다. 관리자는 조직 메인 분야만 설정할 수 있습니다."
    >
      <section className="settings-section">
        <header className="settings-section-head">
          <div>
            <h3>조직 메인 분야</h3>
            <p>회사 1면·조직 브리핑에서 강조하는 EV·충전 주제입니다.</p>
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
        {!isAdmin && (
          <p className="personal-empty personal-empty-inline">
            관심 분야·키워드 구독은 추후 제공됩니다. 지금은 조직 MINT Daily와 뉴스 탭을
            이용하세요.
          </p>
        )}
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
    </PageShell>
  )
}
