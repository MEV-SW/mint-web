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

const reasonLabel: Record<ReviewQueueItem['reason'], string> = {
  low_confidence: '낮은 분류 신뢰도',
  uncategorized: '카테고리 미분류',
  no_keywords: '키워딩 실패',
  new_keyword: '신규 키워드 후보',
  extraction_failed: '키워딩 API 실패',
}

type Props = {
  item: ReviewQueueItem
  orgKeywords: Keyword[]
  expanded: boolean
  onToggle: () => void
  onExcluded: (id: string) => void
}

export function ReviewQueueItemEditor({
  item,
  orgKeywords,
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
      toast(`키워드 ${data.linked_keywords.length}개를 저장했습니다.`)
      invalidate()
    },
    onError: (e) => toast(apiErrorDetail(e) || '키워드 저장 실패', 'err'),
  })

  const filteredKeywords = useMemo(() => {
    const q = keywordFilter.trim().toLowerCase()
    const org = orgKeywords.filter((k) => k.scope === 'organization' && k.status === 'active')
    if (!q) return org
    return org.filter(
      (k) =>
        k.name.toLowerCase().includes(q) ||
        k.normalized_name.includes(q) ||
        (k.aliases ?? []).some((a) => a.toLowerCase().includes(q)),
    )
  }, [orgKeywords, keywordFilter])

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

  return (
    <article className={`review-queue-item${expanded ? ' expanded' : ''}`}>
      <div className="review-queue-item-head">
        <div className="review-queue-item-title">
          <span className="review-queue-reason">{reasonLabel[item.reason]}</span>
          <Link to={`/posts/${item.post_id}`} state={{ from: '/admin/review-queue' }}>
            {item.post_title}
          </Link>
        </div>
        <div className="review-queue-item-actions">
          <Btn size="sm" variant={expanded ? 'soft' : 'outline'} onClick={onToggle}>
            {expanded ? '접기' : '키워딩'}
          </Btn>
          <Btn size="sm" variant="outline" onClick={() => onExcluded(item.id)}>
            뉴스 제외
          </Btn>
        </div>
      </div>

      {expanded && (
        <div className="review-queue-editor">
          <div className="review-queue-editor-toolbar">
            <Btn
              size="sm"
              variant="soft"
              icon="sparkles"
              onClick={() => suggest.mutate()}
              disabled={suggest.isPending}
            >
              {suggest.isPending ? 'AI 분석 중…' : 'AI 추천 받기'}
            </Btn>
            <span className="review-queue-editor-hint">
              선택 {selectedCount}/5 · 저장 시 검수함에서 자동 완료
            </span>
          </div>

          {suggestions.length > 0 && (
            <section className="review-queue-section" aria-label="AI 추천 키워드">
              <h4>AI 추천</h4>
              <div className="review-queue-chips">
                {suggestions.map((s) => (
                  <button
                    key={`${s.name}-${s.keyword_id ?? 'new'}`}
                    type="button"
                    className={`review-queue-chip${isSuggestionSelected(s) ? ' on' : ''}`}
                    onClick={() => toggleSuggestion(s)}
                  >
                    {s.name}
                    <span className="review-queue-chip-meta">
                      {Math.round(s.confidence * 100)}%
                      {!s.keyword_id ? ' · 신규' : ''}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="review-queue-section" aria-label="조직 키워드">
            <h4>조직 키워드</h4>
            <input
              className="input review-queue-filter"
              placeholder="키워드 검색…"
              value={keywordFilter}
              onChange={(e) => setKeywordFilter(e.target.value)}
            />
            <div className="review-queue-chips">
              {filteredKeywords.slice(0, 40).map((k) => (
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
          </section>

          <section className="review-queue-section" aria-label="새 키워드">
            <h4>새 키워드</h4>
            <div className="review-queue-new-row">
              <input
                className="input"
                placeholder="키워드 이름 입력"
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
              <div className="review-queue-chips">
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

          <div className="review-queue-editor-footer">
            <Btn
              variant="primary"
              onClick={() => apply.mutate()}
              disabled={!canSave || apply.isPending}
            >
              {apply.isPending ? '저장 중…' : '키워드 저장'}
            </Btn>
          </div>
        </div>
      )}
    </article>
  )
}
