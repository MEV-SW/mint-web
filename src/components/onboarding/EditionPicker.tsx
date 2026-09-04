import { Btn } from '../common/Btn'
import type { Edition } from '../../types/edition'

interface EditionPickerProps {
  editions: Edition[]
  selectedIds: string[]
  lockedIds?: string[]
  onChange: (ids: string[]) => void
  onSubmit: () => void
  submitting?: boolean
  submitLabel?: string
  emptyLabel?: string
}

function previewTerms(edition: Edition): string[] {
  return (edition.topic_terms ?? []).filter(Boolean).slice(0, 4)
}

export function EditionPicker({
  editions,
  selectedIds,
  lockedIds = [],
  onChange,
  onSubmit,
  submitting = false,
  submitLabel = '이 지면으로 시작',
  emptyLabel = '선택할 수 있는 분야가 없습니다. 총관에게 문의해 주세요.',
}: EditionPickerProps) {
  const locked = new Set(lockedIds)
  const selected = new Set(selectedIds)
  const canSubmit = selectedIds.length > 0 && !submitting

  function toggle(id: string) {
    if (locked.has(id)) return
    if (selected.has(id)) onChange(selectedIds.filter((item) => item !== id))
    else onChange([...selectedIds, id])
  }

  if (editions.length === 0) {
    return <p className="edition-picker-empty">{emptyLabel}</p>
  }

  return (
    <div className="edition-picker">
      <div className="edition-picker-grid">
        {editions.map((edition) => {
          const on = selected.has(edition.id)
          const isLocked = locked.has(edition.id)
          return (
            <button
              type="button"
              key={edition.id}
              className={`edition-picker-card${on ? ' selected' : ''}${isLocked ? ' locked' : ''}`}
              onClick={() => toggle(edition.id)}
              aria-pressed={on}
            >
              <span className="edition-picker-kicker">
                {isLocked ? '편집장 지면' : '사업 분야'}
              </span>
              <strong>{edition.name}</strong>
              {previewTerms(edition).length > 0 && (
                <span className="edition-picker-terms">{previewTerms(edition).join(' · ')}</span>
              )}
            </button>
          )
        })}
      </div>
      <Btn variant="primary" className="edition-picker-submit" disabled={!canSubmit} onClick={onSubmit}>
        {submitting ? '저장 중…' : submitLabel}
      </Btn>
    </div>
  )
}
