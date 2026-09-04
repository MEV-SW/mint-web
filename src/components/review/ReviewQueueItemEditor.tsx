import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  applyReviewQueueKeywords,
  suggestReviewQueueKeywords,
} from '../../api/personalizationApi'
import type { Keyword, KeywordSuggestion, ReviewQueueItem } from '../../types/personalization'
import { Btn } from '../common/Btn'
import { useToast } from '../common/Toast'
import { apiErrorDetail } from '../../utils/apiError'

const REASON_COPY: Record<
  ReviewQueueItem['reason'],
  { label: string; open: string; save: string; hint: string }
> = {
  low_confidence: {
    label: '낮은 분류 신뢰도',
    open: '분류 수정',
    save: '분류 저장',
    hint: '가장 가까운 주제를 고르면 검수가 끝납니다.',
  },
  uncategorized: {
    label: '카테고리 미분류',
    open: '분류 수정',
    save: '분류 저장',
    hint: '분야 키워드를 지정하면 검수가 끝납니다.',
  },
  no_keywords: {
    label: '키워드 없음',
    open: '키워드 지정',
    save: '키워드 저장',
    hint: '빈 키워드로 두지 말고 가장 가까운 주제를 붙이세요.',
  },
  new_keyword: {
    label: '신규 키워드 후보',
    open: '검토',
    save: '키워드 승인',
    hint: '후보를 승인하거나 기존 키워드로 바꾸세요.',
  },
  extraction_failed: {
    label: '키워드 추출 실패',
    open: '키워드 지정',
    save: '키워드 저장',
    hint: '직접 키워드를 고르면 검수가 끝납니다.',
  },
}

type EditionName = { id: string; name: string }

type Props = {
  item: ReviewQueueItem
  orgKeywords: Keyword[]
  editions: EditionName[]
  expanded: boolean
  onToggle: () => void
  onExcluded: (id: string) => void
}

export function ReviewQueueItemEditor({
  item,
  orgKeywords,
  editions,
  expanded,
  onToggle,
  onExcluded,
}: Props) {
  const toast = useToast()
  const qc = useQueryClient()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [newNames, setNewNames] = useState<string[]>([])
  const [newNameDraft, setNewNameDraft] = useState('')
  const [suggestions, setSuggestions] = useState<KeywordSuggestion[]>([])
  const [suggestedCategory, setSuggestedCategory] = useState<string | null>(null)
  const [keywordFilter, setKeywordFilter] = useState('')

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['review-queue'] })
    qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
    qc.invalidateQueries({ queryKey: ['news'] })
    qc.invalidateQueries({ queryKey: ['keywords'] })
    qc.invalidateQueries({ queryKey: ['posts'] })
  }

  const suggest = useMutation({
    mutationFn: () => suggestReviewQueueKeywords(item.id),
    onSuccess: (data) => {
      setSuggestions(data.suggestions)
      setSuggestedCategory(data.category)
      const next = new Set(selectedIds)
      const newFromSuggest: string[] = []
      for (const s of data.suggestions) {
        if (s.keyword_id) {
          next.add(s.keyword_id)
        } else if (s.confidence >= 0.55) {
          newFromSuggest.push(s.name)
        }
      }
      setSelectedIds(next)
      setNewNames((prev) => {
        const merged = [...prev]
        for (const name of newFromSuggest) {
          if (merged.includes(name)) continue
          if (merged.length + next.size >= 5) break
          merged.push(name)
        }
        return merged
      })
      if (!data.suggestions.length) {
        toast('AI가 추천 키워드를 찾지 못했습니다. 직접 선택해 주세요.', 'info')
      }
    },
    onError: (e) => toast(apiErrorDetail(e) || 'AI 추천 실패', 'err'),
  })

  const apply = useMutation({
    mutationFn: () =>
      applyReviewQueueKeywords(item.id, {
        keyword_ids: [...selectedIds],
        new_keyword_names: newNames,
        category: suggestedCategory,
      }),
    onSuccess: (data) => {
      if (item.reason === 'new_keyword') {
        toast(`키워드 ${data.linked_keywords.length}개를 승인했습니다.`)
      } else if (item.reason === 'low_confidence' || item.reason === 'uncategorized') {
        toast('분류를 저장했습니다.')
      } else {
        toast(`키워드 ${data.linked_keywords.length}개를 저장했습니다.`)
      }
      invalidate()
    },
    onError: (e) => toast(apiErrorDetail(e) || '키워드 저장 실패', 'err'),
  })

  const activeOrgKeywords = useMemo(
    () => orgKeywords.filter((k) => k.scope === 'organization' && k.status === 'active'),
    [orgKeywords],
  )

  const filteredKeywords = useMemo(() => {
    const q = keywordFilter.trim().toLowerCase()
    if (!q) return activeOrgKeywords
    return activeOrgKeywords.filter(
      (k) =>
        k.name.toLowerCase().includes(q) ||
        k.normalized_name.includes(q) ||
        (k.aliases ?? []).some((a) => a.toLowerCase().includes(q)),
    )
  }, [activeOrgKeywords, keywordFilter])

  const keywordGroups = useMemo(() => {
    const byEdition = new Map<string, Keyword[]>()
    const untagged: Keyword[] = []
    for (const keyword of filteredKeywords) {
      if (keyword.edition_id) {
        const list = byEdition.get(keyword.edition_id) ?? []
        list.push(keyword)
        byEdition.set(keyword.edition_id, list)
      } else {
        untagged.push(keyword)
      }
    }
    const named = editions
      .map((edition) => ({
        id: edition.id,
        name: edition.name,
        keywords: (byEdition.get(edition.id) ?? []).slice(0, 40),
      }))
      .filter((group) => group.keywords.length > 0)
    const leftover = [...byEdition.entries()]
      .filter(([id]) => !editions.some((edition) => edition.id === id))
      .flatMap(([, list]) => list)
    const extra = [...leftover, ...untagged].slice(0, 40)
    if (extra.length > 0) named.push({ id: 'other', name: '기타', keywords: extra })
    return named
  }, [editions, filteredKeywords])

  const selectedLabels = useMemo(() => {
    const fromOrg = activeOrgKeywords.filter((k) => selectedIds.has(k.id)).map((k) => k.name)
    return [...fromOrg, ...newNames]
  }, [activeOrgKeywords, newNames, selectedIds])

  const selectedCount = selectedIds.size + newNames.length
  const canSave = selectedCount > 0 && selectedCount <= 5

  function toggleKeyword(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (prev.size + newNames.length < 5) next.add(id)
      return next
    })
  }

  function toggleSuggestion(s: KeywordSuggestion) {
    if (s.keyword_id) {
      toggleKeyword(s.keyword_id)
      return
    }
    setNewNames((prev) => {
      if (prev.includes(s.name)) return prev.filter((n) => n !== s.name)
      if (selectedIds.size + prev.length >= 5) return prev
      return [...prev, s.name]
    })
  }

  function addNewName() {
    const name = newNameDraft.trim()
    if (!name) return
    if (newNames.includes(name)) {
      setNewNameDraft('')
      return
    }
    if (selectedIds.size + newNames.length >= 5) {
      toast('키워드는 최대 5개까지 지정할 수 있습니다.', 'info')
      return
    }
    setNewNames((prev) => [...prev, name])
    setNewNameDraft('')
  }

  function isSuggestionSelected(s: KeywordSuggestion) {
    if (s.keyword_id) return selectedIds.has(s.keyword_id)
    return newNames.includes(s.name)
  }

  const copy = REASON_COPY[item.reason]

  return (
    <article className={`review-queue-item${expanded ? ' is-open' : ''}`}>
      <div className="review-desk-row">
        <span className="review-desk-reason">{copy.label}</span>
        <div className="review-desk-story">
          <Link to={`/posts/${item.post_id}`} state={{ from: '/admin/review-queue' }}>
            {item.post_title}
          </Link>
          {item.detail && <p className="review-desk-detail">{item.detail}</p>}
        </div>
        <div className="review-desk-actions">
          <Btn size="sm" variant={expanded ? 'outline' : 'primary'} onClick={onToggle}>
            {expanded ? '접기' : copy.open}
          </Btn>
          <Btn
            size="sm"
            variant="outline"
            onClick={() => {
              if (!window.confirm('이 뉴스를 검수함에서 제외할까요?')) return
              onExcluded(item.id)
            }}
          >
            제외
          </Btn>
        </div>
      </div>

      {expanded && (
        <div className="review-desk-work">
          <div className="review-desk-picked">
            <span className="review-desk-picked-label">선택 {selectedCount}/5</span>
            {selectedLabels.length > 0 ? (
              <ul className="review-desk-picked-list">
                {selectedLabels.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            ) : (
              <p className="review-desk-picked-empty">아직 고른 키워드가 없습니다.</p>
            )}
          </div>

          <div className="review-desk-work-grid">
            <section className="review-desk-pane" aria-label="조직 키워드">
              <header className="review-desk-pane-head">
                <h4>조직 키워드</h4>
                <input
                  className="input review-desk-filter"
                  placeholder="키워드 검색"
                  value={keywordFilter}
                  onChange={(e) => setKeywordFilter(e.target.value)}
                />
              </header>
              {keywordGroups.length === 0 && (
                <p className="review-desk-empty">검색과 맞는 키워드가 없습니다.</p>
              )}
              {keywordGroups.map((group) => (
                <div key={group.id} className="review-desk-group">
                  <h5>{group.name}</h5>
                  <div className="review-desk-picks">
                    {group.keywords.map((k) => (
                      <button
                        key={k.id}
                        type="button"
                        className={`review-queue-chip${selectedIds.has(k.id) ? ' on' : ''}`}
                        onClick={() => toggleKeyword(k.id)}
                      >
                        {k.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </section>

            <aside className="review-desk-pane review-desk-side" aria-label="추천과 새 키워드">
              <section className="review-desk-side-block">
                <header className="review-desk-pane-head">
                  <h4>AI 추천</h4>
                  <Btn
                    size="sm"
                    variant="soft"
                    icon="sparkles"
                    onClick={() => suggest.mutate()}
                    disabled={suggest.isPending}
                  >
                    {suggest.isPending ? '분석 중…' : '추천 받기'}
                  </Btn>
                </header>
                {suggestions.length > 0 ? (
                  <div className="review-desk-picks">
                    {suggestions.map((s) => (
                      <button
                        key={`${s.name}-${s.keyword_id ?? 'new'}`}
                        type="button"
                        className={`review-queue-chip${isSuggestionSelected(s) ? ' on' : ''}`}
                        onClick={() => toggleSuggestion(s)}
                      >
                        <span>{s.name}</span>
                        <em className="review-queue-chip-meta">
                          {Math.round(s.confidence * 100)}%{!s.keyword_id ? ' · 신규' : ''}
                        </em>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="review-desk-empty">추천을 받으면 이 기사에 가까운 주제가 뜹니다.</p>
                )}
              </section>

              <section className="review-desk-side-block" aria-label="새 키워드">
                <h4>새 키워드</h4>
                <div className="review-desk-new-row">
                  <input
                    className="input"
                    placeholder="이름 입력 후 추가"
                    value={newNameDraft}
                    onChange={(e) => setNewNameDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addNewName()
                      }
                    }}
                  />
                  <Btn size="sm" variant="outline" onClick={addNewName}>
                    추가
                  </Btn>
                </div>
                {newNames.length > 0 && (
                  <div className="review-desk-picks">
                    {newNames.map((name) => (
                      <button
                        key={name}
                        type="button"
                        className="review-queue-chip on"
                        onClick={() => setNewNames((prev) => prev.filter((n) => n !== name))}
                      >
                        {name} ×
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </aside>
          </div>

          <div className="review-desk-work-foot">
            <p className="review-desk-hint">{copy.hint} 저장하면 이 건은 검수함에서 빠집니다.</p>
            <Btn
              variant="primary"
              onClick={() => apply.mutate()}
              disabled={!canSave || apply.isPending}
            >
              {apply.isPending ? '저장 중…' : copy.save}
            </Btn>
          </div>
        </div>
      )}
    </article>
  )
}
