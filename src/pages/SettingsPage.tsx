import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  createCustomKeyword,
  listKeywords,
  updateMyKeywords,
} from '../api/personalizationApi'
import { Btn } from '../components/common/Btn'
import { PageShell } from '../components/layout/PageShell'
import { useToast } from '../components/common/Toast'

export function SettingsPage() {
  const toast = useToast()
  const qc = useQueryClient()
  const [custom, setCustom] = useState('')
  const { data: keywords = [] } = useQuery({ queryKey: ['keywords'], queryFn: listKeywords })
  const [draft, setDraft] = useState<string[] | null>(null)
  const selected = draft ?? keywords.filter((item) => item.selected).map((item) => item.id)

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
      lead="세 개 이상 선택하세요. 선택한 주제로 1면과 개인 리포트가 구성됩니다."
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
      <div className="keyword-grid">
        {keywords.map((keyword) => (
          <button
            type="button"
            key={keyword.id}
            className={`keyword-option ${selected.includes(keyword.id) ? 'selected' : ''}`}
            onClick={() => toggle(keyword.id)}
          >
            <span>{keyword.name}</span>
            <small>{keyword.scope === 'personal' ? '나만의 키워드' : '표준 키워드'}</small>
          </button>
        ))}
      </div>
    </PageShell>
  )
}
