import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listEditions } from '../../api/editionApi'
import {
  createCustomKeyword,
  getMyKeywords,
  listKeywords,
  updateMyKeywords,
} from '../../api/personalizationApi'
import { Btn } from '../common/Btn'
import { useToast } from '../common/Toast'
import { apiErrorDetail } from '../../utils/apiError'
import type { Keyword } from '../../types/personalization'

function sameIds(a: string[], b: string[]) {
  return [...a].sort().join('|') === [...b].sort().join('|')
}

export function MySubscriptionsSection() {
  const toast = useToast()
  const qc = useQueryClient()
  const [draftIds, setDraftIds] = useState<string[] | null>(null)
  const [customName, setCustomName] = useState('')

  const editionsQuery = useQuery({
    queryKey: ['editions', 'active'],
    queryFn: () => listEditions(true),
  })
  const keywordsQuery = useQuery({
    queryKey: ['keywords'],
    queryFn: () => listKeywords(false),
  })
  const mineQuery = useQuery({
    queryKey: ['my-keywords'],
    queryFn: getMyKeywords,
  })

  const savedIds = useMemo(
    () => (mineQuery.data ?? []).map((item) => item.id),
    [mineQuery.data],
  )
  const selectedIds = draftIds ?? savedIds
  const dirty = draftIds !== null && !sameIds(draftIds, savedIds)

  useEffect(() => {
    if (draftIds && sameIds(draftIds, savedIds)) setDraftIds(null)
  }, [draftIds, savedIds])

  const editions = editionsQuery.data ?? []
  const keywords = keywordsQuery.data ?? []

  const groups = useMemo(() => {
    const byEdition = new Map<string, Keyword[]>()
    const untagged: Keyword[] = []
    for (const keyword of keywords) {
      if (keyword.status === 'archived') continue
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
        keywords: byEdition.get(edition.id) ?? [],
      }))
      .filter((group) => group.keywords.length > 0)
    if (untagged.length > 0) {
      named.push({ id: 'untagged', name: '기타', keywords: untagged })
    }
    return named
  }, [editions, keywords])

  const save = useMutation({
    mutationFn: () => updateMyKeywords(selectedIds),
    onSuccess: () => {
      setDraftIds(null)
      void Promise.all([
        qc.invalidateQueries({ queryKey: ['my-keywords'] }),
        qc.invalidateQueries({ queryKey: ['keywords'] }),
        qc.invalidateQueries({ queryKey: ['personal-feed'] }),
      ])
      toast('내 구독을 저장했습니다.')
    },
    onError: (error) => toast(apiErrorDetail(error) ?? '구독 저장에 실패했습니다.', 'err'),
  })

  const addCustom = useMutation({
    mutationFn: () => createCustomKeyword(customName.trim()),
    onSuccess: (keyword) => {
      setCustomName('')
      void Promise.all([
        qc.invalidateQueries({ queryKey: ['my-keywords'] }),
        qc.invalidateQueries({ queryKey: ['keywords'] }),
        qc.invalidateQueries({ queryKey: ['personal-feed'] }),
      ])
      toast(`‘${keyword.name}’을 구독했습니다.`)
    },
    onError: (error) => toast(apiErrorDetail(error) ?? '키워드 추가에 실패했습니다.', 'err'),
  })

  function toggle(id: string) {
    const current = selectedIds
    const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    setDraftIds(sameIds(next, savedIds) ? null : next)
  }

  return (
    <section className="settings-section" id="my-interests">
      <header className="settings-section-head">
        <div>
          <h3>내 구독</h3>
          <p>
            토픽 허브와 맞춤 뉴스에 쓰는 키워드입니다. 볼 지면의 키워드만 보이며, 언제든 바꿀 수
            있습니다.
          </p>
        </div>
        <Btn
          variant="primary"
          size="sm"
          disabled={!dirty || save.isPending}
          onClick={() => save.mutate()}
        >
          {dirty ? '저장되지 않은 변경 · 저장' : '구독 저장'}
        </Btn>
      </header>
      {(keywordsQuery.isLoading || mineQuery.isLoading) && (
        <p className="personal-empty personal-empty-inline">구독을 불러오는 중…</p>
      )}
      {groups.length === 0 && !keywordsQuery.isLoading && (
        <p className="personal-empty personal-empty-inline">
          구독할 키워드가 아직 없습니다. 뉴스에서 토픽을 열거나, 아래에서 직접 추가하세요.
        </p>
      )}
      {groups.map((group) => (
        <div key={group.id} className="keyword-section">
          <div className="keyword-section-head">
            <h3>{group.name}</h3>
          </div>
          <div className="pick-list pick-list-dense">
            {group.keywords.map((keyword) => (
              <label
                key={keyword.id}
                className={`pick-row${selectedIds.includes(keyword.id) ? ' is-on' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(keyword.id)}
                  onChange={() => toggle(keyword.id)}
                />
                <span>{keyword.name}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
      <div className="keyword-create" style={{ marginTop: 12 }}>
        <input
          className="input"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          placeholder="직접 키워드 추가"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && customName.trim() && !dirty) addCustom.mutate()
          }}
        />
        <Btn
          variant="outline"
          size="sm"
          disabled={!customName.trim() || addCustom.isPending || dirty}
          onClick={() => addCustom.mutate()}
        >
          추가
        </Btn>
      </div>
    </section>
  )
}
