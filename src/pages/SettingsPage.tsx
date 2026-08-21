import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import {
  createStandardKeyword,
  listCategories,
  listKeywords,
  updateFeaturedCategories,
} from '../api/personalizationApi'
import {
  createEdition,
  listEditions,
  updateEdition,
  updateFeaturedKeywords,
} from '../api/editionApi'
import { Btn } from '../components/common/Btn'
import { PageShell } from '../components/layout/PageShell'
import { useToast } from '../components/common/Toast'
import { usePermissions } from '../hooks/usePermissions'
import { apiErrorDetail } from '../utils/apiError'

export function SettingsPage() {
  const toast = useToast()
  const qc = useQueryClient()
  const { isAdmin, canEditAny, canEditEdition } = usePermissions()
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: listCategories,
  })
  const { data: keywords = [] } = useQuery({
    queryKey: ['keywords'],
    queryFn: () => listKeywords(false),
  })
  const { data: editions = [] } = useQuery({
    queryKey: ['editions', isAdmin ? 'all' : 'active'],
    queryFn: () => listEditions(!isAdmin),
    enabled: isAdmin || canEditAny,
  })

  const [featuredDraft, setFeaturedDraft] = useState<string[] | null>(null)
  const [editionFeaturedDraft, setEditionFeaturedDraft] = useState<Record<string, string[]> | null>(
    null,
  )
  const [newEditionName, setNewEditionName] = useState('')
  const [newEditionSlug, setNewEditionSlug] = useState('')
  const [newEditionTerms, setNewEditionTerms] = useState('')
  const [newKeywordByEdition, setNewKeywordByEdition] = useState<Record<string, string>>({})

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
    onError: (error) => toast(apiErrorDetail(error) ?? '메인 분야 저장에 실패했습니다.', 'err'),
  })

  const addEdition = useMutation({
    mutationFn: () =>
      createEdition({
        name: newEditionName.trim(),
        slug: newEditionSlug.trim().toLowerCase(),
        topic_terms: newEditionTerms
          .split(/[,/\n]/)
          .map((term) => term.trim())
          .filter(Boolean),
      }),
    onSuccess: () => {
      setNewEditionName('')
      setNewEditionSlug('')
      setNewEditionTerms('')
      void qc.invalidateQueries({ queryKey: ['editions'] })
      toast('사업 분야를 추가했습니다. 키워드와 소스를 이어서 등록하세요.')
    },
    onError: (error) => toast(apiErrorDetail(error) ?? '분야 추가에 실패했습니다.', 'err'),
  })

  const saveEditionFeatured = useMutation({
    mutationFn: ({ editionId, keywordIds }: { editionId: string; keywordIds: string[] }) =>
      updateFeaturedKeywords(editionId, keywordIds),
    onSuccess: (_data, vars) => {
      void Promise.all([
        qc.invalidateQueries({ queryKey: ['keywords'] }),
        qc.invalidateQueries({ queryKey: ['editions'] }),
        qc.invalidateQueries({ queryKey: ['editorial-feed', vars.editionId] }),
      ])
      setEditionFeaturedDraft((current) => {
        if (!current) return current
        const next = { ...current }
        delete next[vars.editionId]
        return next
      })
      toast('지면 메인 키워드를 저장했습니다.')
    },
    onError: (error) => toast(apiErrorDetail(error) ?? '메인 키워드 저장에 실패했습니다.', 'err'),
  })

  const addEditionKeyword = useMutation({
    mutationFn: ({ editionId, name }: { editionId: string; name: string }) =>
      createStandardKeyword({ name, edition_id: editionId }),
    onSuccess: (keyword, vars) => {
      setNewKeywordByEdition((current) => ({ ...current, [vars.editionId]: '' }))
      setEditionFeaturedDraft((draft) => ({
        ...(draft ?? {}),
        [vars.editionId]: [...featuredKeywordIds(vars.editionId), keyword.id],
      }))
      void Promise.all([
        qc.invalidateQueries({ queryKey: ['keywords'] }),
        qc.invalidateQueries({ queryKey: ['editions'] }),
      ])
      toast(`‘${keyword.name}’ 키워드를 이 지면에 추가했습니다.`)
    },
    onError: (error) => toast(apiErrorDetail(error) ?? '키워드 추가에 실패했습니다.', 'err'),
  })

  const toggleEditionActive = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      updateEdition(id, { is_active }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['editions'] })
      toast('분야 활성 상태를 변경했습니다.')
    },
    onError: (error) => toast(apiErrorDetail(error) ?? '분야 수정에 실패했습니다.', 'err'),
  })

  const featuredKeywordIds = (editionId: string) =>
    editionFeaturedDraft?.[editionId] ??
    keywords
      .filter((item) => item.edition_id === editionId && item.is_featured)
      .map((item) => item.id)

  const toggleEditionKeyword = (editionId: string, keywordId: string) => {
    const current = featuredKeywordIds(editionId)
    setEditionFeaturedDraft((draft) => ({
      ...(draft ?? {}),
      [editionId]: current.includes(keywordId)
        ? current.filter((item) => item !== keywordId)
        : [...current, keywordId],
    }))
  }

  const toggleFeatured = (id: string) => {
    setFeaturedDraft(
      featuredCategories.includes(id)
        ? featuredCategories.filter((item) => item !== id)
        : [...featuredCategories, id],
    )
  }

  return (
    <PageShell
      section="설정"
      title="설정"
      lead="사업 분야 지면과 뉴스 탭 강조 분야를 관리합니다."
    >
      <section className="settings-section" id="editions">
        <header className="settings-section-head">
          <div>
            <h3>사업 분야 지면</h3>
            <p>
              분야를 추가하면 홈에 지면이 한 장 늘어납니다. 키워드와 소스를 같이 넣어야 해당 면이
              채워집니다.
            </p>
          </div>
        </header>
        {!canEditAny ? (
          <p className="personal-empty personal-empty-inline">
            사업 분야·지면 키워드는 총관 또는 분야 편집장만 변경할 수 있습니다.
          </p>
        ) : (
          <>
            {isAdmin && (
            <div className="keyword-create edition-create">
              <input
                className="input"
                value={newEditionName}
                onChange={(e) => setNewEditionName(e.target.value)}
                placeholder="분야명 (예: 수소)"
              />
              <input
                className="input"
                value={newEditionSlug}
                onChange={(e) => setNewEditionSlug(e.target.value)}
                placeholder="슬러그 (예: hydrogen)"
              />
              <input
                className="input"
                value={newEditionTerms}
                onChange={(e) => setNewEditionTerms(e.target.value)}
                placeholder="주제 키워드, 쉼표로 구분"
              />
              <Btn
                variant="outline"
                size="sm"
                disabled={!newEditionName.trim() || !newEditionSlug.trim() || addEdition.isPending}
                onClick={() => addEdition.mutate()}
              >
                분야 추가
              </Btn>
            </div>
            )}
            {editions.map((edition) => {
              const canEdit = canEditEdition(edition.id)
              const editionKeywords = keywords.filter(
                (item) =>
                  item.scope === 'organization' &&
                  item.status !== 'archived' &&
                  (item.edition_id === edition.id || !item.edition_id),
              )
              const selected = featuredKeywordIds(edition.id)
              return (
                <div key={edition.id} className="keyword-section">
                  <div className="keyword-section-head">
                    <h3>
                      {edition.name}
                      <span className="edition-slug">/{edition.slug}</span>
                    </h3>
                    {isAdmin && (
                    <label className="edition-active-toggle">
                      <input
                        type="checkbox"
                        checked={edition.is_active}
                        onChange={(e) =>
                          toggleEditionActive.mutate({
                            id: edition.id,
                            is_active: e.target.checked,
                          })
                        }
                      />
                      홈에 표시
                    </label>
                    )}
                  </div>
                  {edition.missing_sources && (
                    <p className="personal-empty personal-empty-inline">
                      이 지면은 소스가 없어 비어 있을 수 있습니다. 소스 화면에서 관련 분야를
                      지정해 주세요.
                    </p>
                  )}
                  <div className="personal-category-keywords" style={{ padding: 0 }}>
                    {editionKeywords.map((keyword) => (
                      <button
                        type="button"
                        key={keyword.id}
                        className={`keyword-chip-option ${selected.includes(keyword.id) ? 'selected' : ''}`}
                        disabled={!canEdit}
                        onClick={() => canEdit && toggleEditionKeyword(edition.id, keyword.id)}
                      >
                        {keyword.name}
                      </button>
                    ))}
                    {editionKeywords.length === 0 && (
                      <p className="personal-empty personal-empty-inline">
                        이 분야에 연결된 키워드가 없습니다. 분류 키워드를 추가한 뒤 메인을
                        지정하세요.
                      </p>
                    )}
                  </div>
                  <div className="keyword-create" style={{ marginTop: 12 }}>
                    <input
                      className="input"
                      value={newKeywordByEdition[edition.id] ?? ''}
                      onChange={(e) =>
                        setNewKeywordByEdition((current) => ({
                          ...current,
                          [edition.id]: e.target.value,
                        }))
                      }
                      placeholder={`${edition.name} 키워드 추가`}
                      onKeyDown={(e) => {
                        const name = (newKeywordByEdition[edition.id] ?? '').trim()
                        if (e.key === 'Enter' && name) {
                          addEditionKeyword.mutate({ editionId: edition.id, name })
                        }
                      }}
                    />
                    <Btn
                      variant="outline"
                      size="sm"
                      disabled={
                        !canEdit ||
                        !(newKeywordByEdition[edition.id] ?? '').trim() ||
                        addEditionKeyword.isPending
                      }
                      onClick={() => {
                        const name = (newKeywordByEdition[edition.id] ?? '').trim()
                        if (name) addEditionKeyword.mutate({ editionId: edition.id, name })
                      }}
                    >
                      키워드 추가
                    </Btn>
                  </div>
                  <div className="settings-section-actions">
                    <Btn
                      variant="outline"
                      size="sm"
                      disabled={!canEdit || saveEditionFeatured.isPending}
                      onClick={() =>
                        saveEditionFeatured.mutate({
                          editionId: edition.id,
                          keywordIds: selected,
                        })
                      }
                    >
                      {edition.name} 메인 키워드 저장
                    </Btn>
                  </div>
                </div>
              )
            })}
          </>
        )}
      </section>

      <section className="settings-section">
        <header className="settings-section-head">
          <div>
            <h3>뉴스 탭 강조 분야</h3>
            <p>뉴스 화면 상단 칩에서 강조하는 카테고리입니다. 홈 지면 키워드와는 별개입니다.</p>
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
            뉴스 탭 강조 분야는 관리자만 변경할 수 있습니다.
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
