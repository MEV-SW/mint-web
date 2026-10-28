import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
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
import { useConfirm } from '../components/common/useConfirm'
import { MyEditionsSection } from '../components/onboarding/MyEditionsSection'
import { usePermissions } from '../hooks/usePermissions'
import { apiErrorDetail } from '../utils/apiError'
import { isHiddenNewsCategory } from '../utils/newsTaxonomy'
import { listSources, updateSource } from '../api/sourceApi'
import type { EditionDisplayMode } from '../types/edition'
import { sourceEditionIds, sourceTypeLabel } from '../types/source'
import { SETTINGS_PATH } from '../components/layout/navItems'
import { useUnsavedStore } from '../store/unsavedStore'
import { cx } from '../utils/cx'

function sameIds(a: string[], b: string[]) {
  return [...a].sort().join('|') === [...b].sort().join('|')
}

// mint-web#106 — topic detail split into sub-tabs with per-tab drafts.
type TopicTab = 'basic' | 'rules' | 'sources' | 'front'
const TOPIC_TABS: Array<[TopicTab, string]> = [
  ['basic', '기본·표시'],
  ['rules', '수집 규칙'],
  ['sources', '소스'],
  ['front', '1면 구성'],
]

interface MetaDraft {
  display_mode?: EditionDisplayMode
  topic_terms?: string[]
  exclude_terms?: string[]
  relevance_criteria?: string
}

export function SettingsPage() {
  const toast = useToast()
  const confirm = useConfirm()
  const qc = useQueryClient()
  const location = useLocation()
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
    queryKey: ['editions', canEditAny ? 'all' : 'active'],
    queryFn: () => listEditions(!canEditAny),
    enabled: isAdmin || canEditAny,
  })
  const { data: sources = [] } = useQuery({
    queryKey: ['sources'],
    queryFn: listSources,
    enabled: canEditAny,
  })

  const [featuredDraft, setFeaturedDraft] = useState<string[] | null>(null)
  const [editionFeaturedDraft, setEditionFeaturedDraft] = useState<Record<string, string[]> | null>(
    null,
  )
  const [newEditionName, setNewEditionName] = useState('')
  const [newEditionTerms, setNewEditionTerms] = useState('')
  const [newEditionMode, setNewEditionMode] = useState<EditionDisplayMode>('news')
  const [newKeywordByEdition, setNewKeywordByEdition] = useState<Record<string, string>>({})
  const [newTopicTermByEdition, setNewTopicTermByEdition] = useState<Record<string, string>>({})
  const [newExcludeTermByEdition, setNewExcludeTermByEdition] = useState<Record<string, string>>({})
  const [metaDraft, setMetaDraft] = useState<MetaDraft>({})
  const [searchParams, setSearchParams] = useSearchParams()
  const setUnsaved = useUnsavedStore((state) => state.setDirty)
  const [newEditionCriteria, setNewEditionCriteria] = useState('')
  const [sourceSearchByEdition, setSourceSearchByEdition] = useState<Record<string, string>>({})
  const [selectedEditionId, setSelectedEditionId] = useState('')
  const [showTopicCreate, setShowTopicCreate] = useState(false)

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
        display_mode: newEditionMode,
        topic_terms: newEditionTerms
          .split(/[,/\n]/)
          .map((term) => term.trim())
          .filter(Boolean),
        relevance_criteria: newEditionCriteria.trim() || null,
      }),
    onSuccess: () => {
      setNewEditionName('')
      setNewEditionTerms('')
      setNewEditionCriteria('')
      setNewEditionMode('news')
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
        return Object.keys(next).length ? next : null
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

  const saveEditionMeta = useMutation({
    mutationFn: ({
      id,
      display_mode,
      topic_terms,
      exclude_terms,
      relevance_criteria,
    }: {
      id: string
      display_mode?: EditionDisplayMode
      topic_terms?: string[]
      exclude_terms?: string[]
      relevance_criteria?: string | null
    }) => updateEdition(id, { display_mode, topic_terms, exclude_terms, relevance_criteria }),
    onSuccess: (_edition, variables) => {
      // Saved fields leave the draft; untouched fields keep their pending edits.
      setMetaDraft((current) => {
        const next = { ...current }
        if (variables.display_mode !== undefined) delete next.display_mode
        if (variables.topic_terms !== undefined) delete next.topic_terms
        if (variables.exclude_terms !== undefined) delete next.exclude_terms
        if (variables.relevance_criteria !== undefined) delete next.relevance_criteria
        return next
      })
      void qc.invalidateQueries({ queryKey: ['editions'] })
      toast('주제 설정을 저장했습니다.')
    },
    onError: (error) => toast(apiErrorDetail(error) ?? '주제 설정 저장에 실패했습니다.', 'err'),
  })

  const moveSource = useMutation({
    mutationFn: ({ sourceId, editionId }: { sourceId: string; editionId: string }) =>
      updateSource(sourceId, { edition_id: editionId }),
    onSuccess: () => {
      void Promise.all([
        qc.invalidateQueries({ queryKey: ['sources'] }),
        qc.invalidateQueries({ queryKey: ['editions'] }),
      ])
      toast('소스의 주제를 변경했습니다.')
    },
    onError: (error) => toast(apiErrorDetail(error) ?? '소스 이동에 실패했습니다.', 'err'),
  })

  async function confirmMoveSource(source: { id: string; name: string }, editionId: string) {
    if (!(await confirm({ title: `‘${source.name}’ 소스를 다른 주제로 이동할까요?`, confirmLabel: '이동' }))) return
    moveSource.mutate({ sourceId: source.id, editionId })
  }

  const savedFeaturedKeywordIds = (editionId: string) =>
    keywords
      .filter((item) => item.edition_id === editionId && item.is_featured)
      .map((item) => item.id)

  const featuredKeywordIds = (editionId: string) =>
    editionFeaturedDraft?.[editionId] ?? savedFeaturedKeywordIds(editionId)

  const editionFeaturedDirty = (editionId: string) =>
    Boolean(editionFeaturedDraft && editionId in editionFeaturedDraft)

  const toggleEditionKeyword = (editionId: string, keywordId: string) => {
    const current = featuredKeywordIds(editionId)
    const next = current.includes(keywordId)
      ? current.filter((item) => item !== keywordId)
      : [...current, keywordId]
    const saved = savedFeaturedKeywordIds(editionId)
    setEditionFeaturedDraft((draft) => {
      const copy = { ...(draft ?? {}) }
      if (sameIds(next, saved)) delete copy[editionId]
      else copy[editionId] = next
      return Object.keys(copy).length ? copy : null
    })
  }

  const savedFeaturedCategoryIds = categories
    .filter((item) => item.is_featured)
    .map((item) => item.id)
  const featuredDirty = featuredDraft !== null && !sameIds(featuredDraft, savedFeaturedCategoryIds)

  const toggleFeatured = (id: string) => {
    const next = featuredCategories.includes(id)
      ? featuredCategories.filter((item) => item !== id)
      : [...featuredCategories, id]
    setFeaturedDraft(sameIds(next, savedFeaturedCategoryIds) ? null : next)
  }

  useEffect(() => {
    const id = location.hash.replace('#', '')
    if (!id) return
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [location.hash])

  const editableEditions = isAdmin
    ? editions
    : editions.filter((edition) => canEditEdition(edition.id))
  const selectedEdition =
    editableEditions.find((edition) => edition.id === selectedEditionId) ?? editableEditions[0]
  const selectedEditionSources = selectedEdition
    ? sources.filter((source) => sourceEditionIds(source).includes(selectedEdition.id))
    : []
  const selectedEditionKeywords = selectedEdition
    ? keywords.filter(
        (item) =>
          item.scope === 'organization' &&
          item.status !== 'archived' &&
          item.edition_id === selectedEdition.id,
      )
    : []

  const tabParam = searchParams.get('tab')
  const tab: TopicTab = TOPIC_TABS.some(([id]) => id === tabParam) ? (tabParam as TopicTab) : 'basic'
  const savedMode: EditionDisplayMode = selectedEdition?.display_mode ?? 'news'
  const draftMode = metaDraft.display_mode ?? savedMode
  const savedTerms = selectedEdition?.topic_terms ?? []
  const draftTerms = metaDraft.topic_terms ?? savedTerms
  const savedExclude = selectedEdition?.exclude_terms ?? []
  const draftExclude = metaDraft.exclude_terms ?? savedExclude
  const savedCriteria = selectedEdition?.relevance_criteria ?? ''
  const draftCriteria = metaDraft.relevance_criteria ?? savedCriteria
  const rulesChanged = {
    topic_terms: !sameIds(draftTerms, savedTerms),
    exclude_terms: !sameIds(draftExclude, savedExclude),
    relevance_criteria: draftCriteria.trim() !== savedCriteria.trim(),
  }
  const tabChanges: Record<TopicTab, number> = {
    basic: draftMode !== savedMode ? 1 : 0,
    rules: Object.values(rulesChanged).filter(Boolean).length,
    sources: 0,
    front:
      (selectedEdition && editionFeaturedDirty(selectedEdition.id) ? 1 : 0) + (isAdmin && featuredDirty ? 1 : 0),
  }
  const totalChanges = tabChanges.basic + tabChanges.rules + tabChanges.front

  useEffect(() => {
    setUnsaved(SETTINGS_PATH, totalChanges > 0)
  }, [setUnsaved, totalChanges])
  useEffect(() => () => setUnsaved(SETTINGS_PATH, false), [setUnsaved])
  useEffect(() => {
    if (totalChanges === 0) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [totalChanges])

  function discardTab(target: TopicTab) {
    if (target === 'basic') {
      setMetaDraft((current) => {
        const next = { ...current }
        delete next.display_mode
        return next
      })
    } else if (target === 'rules') {
      setMetaDraft(({ display_mode }) => (display_mode === undefined ? {} : { display_mode }))
      if (selectedEdition) {
        setNewTopicTermByEdition((current) => ({ ...current, [selectedEdition.id]: '' }))
        setNewExcludeTermByEdition((current) => ({ ...current, [selectedEdition.id]: '' }))
      }
    } else if (target === 'front') {
      if (selectedEdition) {
        setEditionFeaturedDraft((current) => {
          if (!current) return current
          const next = { ...current }
          delete next[selectedEdition.id]
          return Object.keys(next).length ? next : null
        })
      }
      setFeaturedDraft(null)
    }
  }

  async function confirmLeave(count: number) {
    if (count === 0) return true
    return confirm({
      title: `저장하지 않은 변경 ${count}개가 있습니다. 저장하지 않고 이동할까요?`,
      body: '이동하면 이 변경은 사라집니다.',
      confirmLabel: '저장하지 않고 이동',
      danger: true,
    })
  }

  async function selectTab(next: TopicTab) {
    if (next === tab) return
    if (!(await confirmLeave(tabChanges[tab]))) return
    discardTab(tab)
    const params = new URLSearchParams(searchParams)
    if (next === 'basic') params.delete('tab')
    else params.set('tab', next)
    setSearchParams(params, { replace: true })
  }

  async function selectEdition(id: string) {
    if (id === selectedEdition?.id) return
    if (!(await confirmLeave(totalChanges))) return
    discardTab('basic')
    discardTab('rules')
    discardTab('front')
    setMetaDraft({})
    setSelectedEditionId(id)
  }

  function saveTab() {
    if (!selectedEdition) return
    if (tab === 'basic' && tabChanges.basic) {
      saveEditionMeta.mutate({ id: selectedEdition.id, display_mode: draftMode })
    } else if (tab === 'rules' && tabChanges.rules) {
      saveEditionMeta.mutate({
        id: selectedEdition.id,
        ...(rulesChanged.topic_terms ? { topic_terms: draftTerms } : {}),
        ...(rulesChanged.exclude_terms ? { exclude_terms: draftExclude } : {}),
        ...(rulesChanged.relevance_criteria ? { relevance_criteria: draftCriteria.trim() || null } : {}),
      })
    } else if (tab === 'front') {
      if (editionFeaturedDirty(selectedEdition.id)) {
        saveEditionFeatured.mutate({ editionId: selectedEdition.id, keywordIds: featuredKeywordIds(selectedEdition.id) })
      }
      if (isAdmin && featuredDirty) saveFeatured.mutate()
    }
  }

  const savingTab = saveEditionMeta.isPending || saveEditionFeatured.isPending || saveFeatured.isPending
  const frontInvalid = isAdmin && featuredDirty && featuredCategories.length < 1

  const featuredCategoriesBlock = (
    <>
        {editions.map((edition) => {
          const cats = sortedCategories.filter(
            (item) => item.edition_id === edition.id && !isHiddenNewsCategory(item),
          )
          const main = cats.filter((item) => !item.is_discovered)
          const discovered = cats.filter((item) => item.is_discovered)
          if (!cats.length) return null
          return (
            <div key={edition.id} className="keyword-section">
              <div className="keyword-section-head">
                <h4>{edition.name}</h4>
              </div>
              <div className="category-grid category-grid-compact">
                {main.map((category) => {
                  const featured = featuredCategories.includes(category.id)
                  return (
                    <button
                      type="button"
                      key={`featured-${category.id}`}
                      className={`category-option category-option-compact ${featured ? 'featured' : ''}`}
                      onClick={() => toggleFeatured(category.id)}
                    >
                      <span>{category.name}</span>
                      <small>{featured ? '메인' : '탭하여 지정'}</small>
                    </button>
                  )
                })}
              </div>
              {discovered.length > 0 && (
                <>
                  <p className="settings-discovered-label">발견 분류</p>
                  <div className="category-grid category-grid-compact category-grid-discovered">
                    {discovered.map((category) => {
                      const featured = featuredCategories.includes(category.id)
                      return (
                        <button
                          type="button"
                          key={`featured-${category.id}`}
                          className={`category-option category-option-compact category-option-discovered ${featured ? 'featured' : ''}`}
                          onClick={() => toggleFeatured(category.id)}
                        >
                          <span>{category.name}</span>
                          <small>{featured ? '메인' : '탭하여 지정'}</small>
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )
        })}
    </>
  )

  return (
    <PageShell
      section={canEditAny ? '관리 · TOPICS' : '설정'}
      title={canEditAny ? '주제 관리' : '설정'}
      lead={canEditAny
        ? '기존 지면 설정을 확장한 화면입니다. 주제를 만들고 표시 방식(뉴스형 / 트렌드형)을 고른 뒤, 관련성 키워드와 소스를 배정합니다.'
        : '볼 지면과 사업 분야를 관리합니다.'}
      actions={canEditAny
        ? <span className="topic-admin-badge">{isAdmin ? '최고 관리자 · 전체 주제' : '분야 편집장 · 담당 주제'}</span>
        : undefined}
    >
      {!canEditAny && <MyEditionsSection />}
      {canEditAny && (
        <section className="topic-manager" id="editions" aria-label="주제 관리">
          <header className="topic-manager-toolbar">
            <p>관리 가능 <strong>{editableEditions.length}</strong>개 · 활성 <strong>{editableEditions.filter((edition) => edition.is_active).length}</strong>개</p>
            {isAdmin && (
              <Btn variant="primary" size="sm" icon="plus" onClick={() => setShowTopicCreate((value) => !value)}>
                주제 추가
              </Btn>
            )}
          </header>

          {isAdmin && showTopicCreate && (
            <div className="topic-create-panel">
              <input className="input" value={newEditionName} onChange={(event) => setNewEditionName(event.target.value)} placeholder="주제명 (예: 수소)" />
              <input className="input" value={newEditionTerms} onChange={(event) => setNewEditionTerms(event.target.value)} placeholder="관련성 키워드, 쉼표로 구분" />
              <textarea
                className="input topic-create-criteria"
                value={newEditionCriteria}
                onChange={(event) => setNewEditionCriteria(event.target.value)}
                placeholder="판정 기준 (선택) — 관련 있음: … / 관련 없음: …"
                rows={3}
                maxLength={4000}
              />
              <div className="edition-mode-create" role="radiogroup" aria-label="새 주제 표시 방식">
                {(['news', 'trend'] as const).map((mode) => (
                  <label key={mode}>
                    <input type="radio" checked={newEditionMode === mode} onChange={() => setNewEditionMode(mode)} />
                    {mode === 'news' ? '뉴스형' : '트렌드형'}
                  </label>
                ))}
              </div>
              <Btn variant="primary" size="sm" disabled={!newEditionName.trim() || addEdition.isPending} onClick={() => addEdition.mutate()}>
                등록
              </Btn>
            </div>
          )}

          <div className="topic-manager-grid">
            <aside className="topic-master-list" aria-label="주제 목록">
              {editableEditions.map((edition) => (
                <button
                  type="button"
                  key={edition.id}
                  className={edition.id === selectedEdition?.id ? 'is-selected' : ''}
                  onClick={() => void selectEdition(edition.id)}
                >
                  <span>
                    <strong>{edition.name}</strong>
                    <small>{edition.display_mode === 'trend' ? '트렌드형' : '뉴스형'} · 소스 {edition.tagged_source_count}</small>
                  </span>
                  <i className={edition.is_active ? 'is-active' : ''}>{edition.is_active ? '활성' : '숨김'}</i>
                </button>
              ))}
            </aside>

            {selectedEdition && (
              <div className="topic-detail">
                <header className="topic-detail-head">
                  <div>
                    <span>선택 주제</span>
                    <h2>{selectedEdition.name}</h2>
                  </div>
                  {isAdmin && (
                    <label className="edition-active-toggle">
                      <input
                        type="checkbox"
                        checked={selectedEdition.is_active}
                        onChange={(event) => toggleEditionActive.mutate({ id: selectedEdition.id, is_active: event.target.checked })}
                      />
                      홈에 표시
                    </label>
                  )}
                </header>

                <div className="admin-subtabs topic-subtabs" role="tablist" aria-label="주제 설정">
                  {TOPIC_TABS.map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={tab === id}
                      className={cx('admin-subtab', tab === id && 'on')}
                      onClick={() => void selectTab(id)}
                    >
                      {label}
                      {tabChanges[id] > 0 && <span className="topic-subtab-dot" aria-label="저장하지 않은 변경" />}
                    </button>
                  ))}
                </div>

                {/* Locked while saving so edits made mid-request are not dropped by onSuccess. */}
                <fieldset className="topic-tab-fieldset" disabled={savingTab} aria-busy={savingTab}>
                {tab === 'basic' && (
                  <section className="topic-detail-section">
                    <div className="topic-detail-section-head">
                      <h3>표시 방식</h3>
                      <p>1면에서 이 주제를 열었을 때 사용할 화면입니다.</p>
                    </div>
                    <div className="topic-mode-cards" role="radiogroup" aria-label={`${selectedEdition.name} 표시 방식`}>
                      {(['news', 'trend'] as const).map((mode) => (
                        <label key={mode} className={draftMode === mode ? 'is-selected' : ''}>
                          <input
                            type="radio"
                            checked={draftMode === mode}
                            onChange={() => setMetaDraft((current) => ({ ...current, display_mode: mode }))}
                          />
                          <span><strong>{mode === 'news' ? '뉴스형' : '트렌드형'}</strong><small>{mode === 'news' ? '기사와 데일리 편집 지면' : '언급량·랭킹·신규 정보 대시보드'}</small></span>
                        </label>
                      ))}
                    </div>
                  </section>
                )}

                {tab === 'rules' && (
                  <>
                    <section className="topic-detail-section">
                      <div className="topic-detail-section-head">
                        <h3>관련성 키워드</h3>
                        <p>수집·표시에서 이 주제의 글인지 판별하는 신호입니다. 영문 약어는 단어 단위로 비교합니다.</p>
                      </div>
                      <div className="topic-term-editor topic-term-editor-large">
                        {draftTerms.map((term) => (
                          <button type="button" className="topic-term-chip" key={term} onClick={() => setMetaDraft((current) => ({ ...current, topic_terms: draftTerms.filter((item) => item !== term) }))} aria-label={`${term} 삭제`}>
                            {term} ×
                          </button>
                        ))}
                        <input
                          value={newTopicTermByEdition[selectedEdition.id] ?? ''}
                          placeholder="키워드 입력 후 Enter"
                          onChange={(event) => setNewTopicTermByEdition((current) => ({ ...current, [selectedEdition.id]: event.target.value }))}
                          onKeyDown={(event) => {
                            const term = (newTopicTermByEdition[selectedEdition.id] ?? '').trim()
                            if (event.key !== 'Enter' || !term) return
                            event.preventDefault()
                            setMetaDraft((current) => ({ ...current, topic_terms: [...new Set([...draftTerms, term])] }))
                            setNewTopicTermByEdition((current) => ({ ...current, [selectedEdition.id]: '' }))
                          }}
                        />
                      </div>
                      <p className="topic-detail-note">소스는 한 주제에만 속합니다. 여러 주제에서 쓰는 범용 소스는 주제별로 중복 등록합니다.</p>
                    </section>

                    <section className="topic-detail-section">
                      <div className="topic-detail-section-head">
                        <h3>판정 기준</h3>
                        <p>AI가 수집 후보를 이 주제로 볼지 판단할 때 그대로 읽는 기준입니다. 비우면 주제 이름과 관련성 키워드만으로 판단합니다.</p>
                      </div>
                      <div className="topic-criteria-editor">
                        <textarea
                          className="input"
                          rows={8}
                          maxLength={4000}
                          value={draftCriteria}
                          placeholder="예) 관련 있음: … / 관련 없음: …"
                          onChange={(event) => setMetaDraft((current) => ({ ...current, relevance_criteria: event.target.value }))}
                        />
                      </div>
                    </section>

                    <section className="topic-detail-section">
                      <div className="topic-detail-section-head">
                        <h3>제목 제외어</h3>
                        <p>제목에 이 단어가 있고 관련성 키워드가 없으면 수집하지 않습니다. 이미 저장된 글은 숨기지 않습니다.</p>
                      </div>
                      <div className="topic-term-editor topic-term-editor-large">
                        {draftExclude.map((term) => (
                          <button type="button" className="topic-term-chip" key={term} onClick={() => setMetaDraft((current) => ({ ...current, exclude_terms: draftExclude.filter((item) => item !== term) }))} aria-label={`${term} 삭제`}>
                            {term} ×
                          </button>
                        ))}
                        <input
                          value={newExcludeTermByEdition[selectedEdition.id] ?? ''}
                          placeholder="제외어 입력 후 Enter"
                          onChange={(event) => setNewExcludeTermByEdition((current) => ({ ...current, [selectedEdition.id]: event.target.value }))}
                          onKeyDown={(event) => {
                            const term = (newExcludeTermByEdition[selectedEdition.id] ?? '').trim()
                            if (event.key !== 'Enter' || !term) return
                            event.preventDefault()
                            setMetaDraft((current) => ({ ...current, exclude_terms: [...new Set([...draftExclude, term])] }))
                            setNewExcludeTermByEdition((current) => ({ ...current, [selectedEdition.id]: '' }))
                          }}
                        />
                      </div>
                    </section>
                  </>
                )}

                {tab === 'sources' && (
                  <section className="topic-detail-section">
                    <div className="topic-detail-section-head topic-detail-section-head-row">
                      <div>
                        <h3>소스 배정</h3>
                        <p>
                          {selectedEditionSources.length}개 소스가 이 주제에 연결되어 있습니다. 배정 변경은{' '}
                          <Link to={`/admin/sources?edition=${selectedEdition.id}`}>04 소스</Link>의 편집 창에서 합니다.
                        </p>
                      </div>
                      <input
                        className="input topic-source-search"
                        value={sourceSearchByEdition[selectedEdition.id] ?? ''}
                        placeholder="소스명 또는 URL 검색"
                        onChange={(event) => setSourceSearchByEdition((current) => ({ ...current, [selectedEdition.id]: event.target.value }))}
                      />
                    </div>
                    <div className="edition-source-list topic-source-list">
                      {selectedEditionSources
                        .filter((source) => {
                          const query = (sourceSearchByEdition[selectedEdition.id] ?? '').trim().toLowerCase()
                          return !query || source.name.toLowerCase().includes(query) || source.url.toLowerCase().includes(query)
                        })
                        .map((source) => (
                          <div key={source.id} className="edition-source-row">
                            <span><b>{source.name}</b><small>{sourceTypeLabel(source.source_type)}</small></span>
                            <span className={cx('topic-source-state', !source.is_active && 'is-off')}>{source.is_active ? '수집 중' : '꺼짐'}</span>
                          </div>
                        ))}
                      {!selectedEditionSources.length && <p className="topic-detail-empty">배정된 소스가 없습니다.</p>}
                    </div>
                  </section>
                )}

                {tab === 'front' && (
                  <>
                    <section className="topic-detail-section">
                      <div className="topic-detail-section-head">
                        <h3>지면 메인 키워드</h3>
                        <p>뉴스형 지면의 주요 분류로 노출할 키워드를 선택합니다. 키워드 추가는 바로 만들어지고, 메인 지정은 아래 저장으로 반영됩니다.</p>
                      </div>
                      <div className="pick-list pick-list-dense">
                        {selectedEditionKeywords.map((keyword) => (
                          <label key={keyword.id} className={`pick-row${featuredKeywordIds(selectedEdition.id).includes(keyword.id) ? ' is-on' : ''}`}>
                            <input type="checkbox" checked={featuredKeywordIds(selectedEdition.id).includes(keyword.id)} onChange={() => toggleEditionKeyword(selectedEdition.id, keyword.id)} />
                            <span>{keyword.name}</span>
                          </label>
                        ))}
                      </div>
                      <div className="keyword-create topic-keyword-create">
                        <input className="input" value={newKeywordByEdition[selectedEdition.id] ?? ''} onChange={(event) => setNewKeywordByEdition((current) => ({ ...current, [selectedEdition.id]: event.target.value }))} placeholder={`${selectedEdition.name} 키워드 추가`} />
                        <Btn variant="outline" size="sm" disabled={!(newKeywordByEdition[selectedEdition.id] ?? '').trim() || addEditionKeyword.isPending} onClick={() => addEditionKeyword.mutate({ editionId: selectedEdition.id, name: (newKeywordByEdition[selectedEdition.id] ?? '').trim() })}>키워드 추가</Btn>
                      </div>
                    </section>
                    {isAdmin && (
                      <section className="topic-detail-section">
                        <div className="topic-detail-section-head">
                          <h3>뉴스 탭 강조 분야 · 조직 전체</h3>
                          <p>뉴스 필터에 노출하는 분류입니다. 지면별로 나누고, 일반·커뮤니티는 분류에서 빼 둡니다. 모든 주제에 함께 적용됩니다.</p>
                        </div>
                        {featuredCategoriesBlock}
                      </section>
                    )}
                  </>
                )}

                </fieldset>

                {tab !== 'sources' && (
                  <div className="topic-tab-footer" aria-live="polite">
                    <span className={cx('topic-tab-changes', tabChanges[tab] > 0 && 'is-dirty')}>
                      {tabChanges[tab] > 0 ? `저장하지 않은 변경 ${tabChanges[tab]}` : '변경 없음'}
                      {tab === 'front' && frontInvalid ? ' · 강조 분야를 하나 이상 고르세요' : ''}
                    </span>
                    <Btn variant="outline" size="sm" disabled={tabChanges[tab] === 0 || savingTab} onClick={() => discardTab(tab)}>
                      되돌리기
                    </Btn>
                    <Btn variant="primary" size="sm" disabled={tabChanges[tab] === 0 || savingTab || (tab === 'front' && frontInvalid)} onClick={saveTab}>
                      {savingTab ? '저장 중…' : '저장'}
                    </Btn>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {canEditAny && !isAdmin && editableEditions.length === 0 && (
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
                value={newEditionTerms}
                onChange={(e) => setNewEditionTerms(e.target.value)}
                placeholder="주제 키워드, 쉼표로 구분 (선택)"
              />
              <div className="edition-mode-create" role="radiogroup" aria-label="표시 방식">
                {(['news', 'trend'] as const).map((mode) => (
                  <label key={mode}>
                    <input type="radio" checked={newEditionMode === mode} onChange={() => setNewEditionMode(mode)} />
                    {mode === 'news' ? '뉴스형' : '트렌드형'}
                  </label>
                ))}
              </div>
              <Btn
                variant="outline"
                size="sm"
                disabled={!newEditionName.trim() || addEdition.isPending}
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
                  item.edition_id === edition.id,
              )
              const selected = featuredKeywordIds(edition.id)
              const dirty = editionFeaturedDirty(edition.id)
              return (
                <div key={edition.id} className="keyword-section">
                  <div className="keyword-section-head">
                    <h3>{edition.name}</h3>
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
                  {isAdmin && (
                    <div className="edition-admin-grid">
                      <div className="edition-admin-block">
                        <strong>표시 방식</strong>
                        <div className="edition-mode-create" role="radiogroup" aria-label={`${edition.name} 표시 방식`}>
                          {(['news', 'trend'] as const).map((mode) => (
                            <label key={mode}>
                              <input
                                type="radio"
                                checked={(edition.display_mode ?? 'news') === mode}
                                onChange={() => saveEditionMeta.mutate({ id: edition.id, display_mode: mode })}
                              />
                              {mode === 'news' ? '뉴스형' : '트렌드형'}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="edition-admin-block">
                        <strong>관련성 키워드 (TOPIC_TERMS)</strong>
                        <div className="topic-term-editor">
                          {(edition.topic_terms ?? []).map((term) => (
                            <button
                              type="button"
                              className="topic-term-chip"
                              key={term}
                              onClick={() => saveEditionMeta.mutate({ id: edition.id, topic_terms: edition.topic_terms.filter((item) => item !== term) })}
                              aria-label={`${term} 삭제`}
                            >
                              {term} ×
                            </button>
                          ))}
                          <input
                            value={newTopicTermByEdition[edition.id] ?? ''}
                            placeholder="입력 후 Enter"
                            onChange={(event) => setNewTopicTermByEdition((current) => ({ ...current, [edition.id]: event.target.value }))}
                            onKeyDown={(event) => {
                              const term = (newTopicTermByEdition[edition.id] ?? '').trim()
                              if (event.key !== 'Enter' || !term) return
                              event.preventDefault()
                              const next = [...new Set([...(edition.topic_terms ?? []), term])]
                              saveEditionMeta.mutate({ id: edition.id, topic_terms: next })
                              setNewTopicTermByEdition((current) => ({ ...current, [edition.id]: '' }))
                            }}
                          />
                        </div>
                      </div>
                      <div className="edition-admin-block edition-source-assign">
                        <strong>소스 배정</strong>
                        <input
                          className="input"
                          value={sourceSearchByEdition[edition.id] ?? ''}
                          placeholder="소스명 또는 URL 검색"
                          onChange={(event) => setSourceSearchByEdition((current) => ({ ...current, [edition.id]: event.target.value }))}
                        />
                        <div className="edition-source-list">
                          {sources
                            .filter((source) => sourceEditionIds(source).includes(edition.id))
                            .filter((source) => {
                              const query = (sourceSearchByEdition[edition.id] ?? '').trim().toLowerCase()
                              return !query || source.name.toLowerCase().includes(query) || source.url.toLowerCase().includes(query)
                            })
                            .map((source) => (
                              <div key={source.id} className="edition-source-row">
                                <span><b>{source.name}</b><small>{sourceTypeLabel(source.source_type)}</small></span>
                                {sourceEditionIds(source).length > 1 ? (
                                  // Moving one topic would drop the others; the server rejects it (409).
                                  <small className="edition-source-multi">여러 주제 · 소스 화면에서 변경</small>
                                ) : (
                                  <select
                                    className="input"
                                    aria-label={`${source.name} 주제 변경`}
                                    value={source.edition_id}
                                    disabled={moveSource.isPending}
                                    onChange={(event) => void confirmMoveSource(source, event.target.value)}
                                  >
                                    {editions.map((target) => <option key={target.id} value={target.id}>{target.name}</option>)}
                                  </select>
                                )}
                              </div>
                            ))}
                          {!sources.some((source) => sourceEditionIds(source).includes(edition.id)) && <p>배정된 소스가 없습니다.</p>}
                        </div>
                      </div>
                    </div>
                  )}
                  {edition.missing_sources && (
                    <p className="personal-empty personal-empty-inline">
                      이 지면은 소스가 없어 비어 있을 수 있습니다. 소스 화면에서 관련 분야를
                      지정해 주세요.
                    </p>
                  )}
                  <div className="pick-list pick-list-dense">
                    {editionKeywords.map((keyword) => (
                      <label
                        key={keyword.id}
                        className={`pick-row${selected.includes(keyword.id) ? ' is-on' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={selected.includes(keyword.id)}
                          disabled={!canEdit}
                          onChange={() => canEdit && toggleEditionKeyword(edition.id, keyword.id)}
                        />
                        <span>{keyword.name}</span>
                      </label>
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
                      variant={dirty ? 'primary' : 'outline'}
                      size="sm"
                      disabled={!canEdit || !dirty || saveEditionFeatured.isPending}
                      onClick={() =>
                        saveEditionFeatured.mutate({
                          editionId: edition.id,
                          keywordIds: selected,
                        })
                      }
                    >
                      {dirty ? `${edition.name} · 저장되지 않은 변경` : `${edition.name} 메인 키워드 저장`}
                    </Btn>
                  </div>
                </div>
              )
            })}
      </section>
      )}

    </PageShell>
  )
}
