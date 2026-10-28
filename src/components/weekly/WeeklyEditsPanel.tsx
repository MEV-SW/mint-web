import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { listWeeklyReportEdits } from '../../api/weeklyReportApi'
import type { WeeklyReportDetail, WeeklyReportEdit } from '../../types/weeklyReport'
import { kstStamp, weekName } from '../../utils/weekLabel'
import { Icon } from '../common/Icon'
import { editChips, itemChanges } from './weeklyItems'

function Diff({ before, after }: { before?: string; after?: string }) {
  return (
    <div className="wk-diff">
      {before !== undefined && <p className="wk-diff-minus">− {before}</p>}
      {after !== undefined && <p className="wk-diff-plus">+ {after}</p>}
    </div>
  )
}

function EditEntry({ edit }: { edit: WeeklyReportEdit }) {
  const [open, setOpen] = useState(false)
  const changes = itemChanges(edit)
  return (
    <li className="wk-edits-row">
      <button type="button" className="wk-edits-row-head" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="wk-edits-name">{edit.edited_by_name ?? '알 수 없음'}</span>
        <span className="wk-edits-time wk-num">{kstStamp(edit.edited_at)}</span>
        <span className="wk-edits-chips">
          {editChips(edit).map((chip) => (
            <span key={chip} className="wk-chip">
              {chip}
            </span>
          ))}
        </span>
      </button>
      {open && (
        <div className="wk-edits-detail">
          {'title' in edit.after && (
            <>
              <div className="wk-edits-field">제목</div>
              <Diff before={edit.before.title} after={edit.after.title} />
            </>
          )}
          {'summary' in edit.after && (
            <>
              <div className="wk-edits-field">핵심 흐름</div>
              <Diff before={edit.before.summary} after={edit.after.summary} />
            </>
          )}
          {changes.map(({ before, after }) => {
            const title = after?.post_title || before?.post_title || ''
            const notes: string[] = []
            if (before?.hidden !== after?.hidden) notes.push(after?.hidden ? '숨김' : '보이기')
            if (before?.shown !== after?.shown) notes.push(after?.shown ? '본문으로 올림' : '그 밖에로 내림')
            return (
              <div key={after?.post_id} className="wk-edits-item">
                <div className="wk-edits-field">
                  {title}
                  {notes.length > 0 && ` · ${notes.join(' · ')}`}
                </div>
                {before?.line !== after?.line && <Diff before={before?.line} after={after?.line} />}
              </div>
            )
          })}
        </div>
      )}
    </li>
  )
}

/** S4 수정 이력: right-side panel (full-screen sheet on mobile). */
export function WeeklyEditsPanel({
  report,
  editionName,
  onClose,
}: {
  report: WeeklyReportDetail
  editionName: string
  onClose: () => void
}) {
  const edits = useQuery({
    queryKey: ['weekly-report-edits', report.id, report.updated_at],
    queryFn: () => listWeeklyReportEdits(report.id),
  })
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return createPortal(
    <div className="wk-panel-backdrop" onMouseDown={onClose}>
      <aside
        className="wk-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wk-edits-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="wk-panel-head">
          <div>
            <h2 id="wk-edits-title">수정 이력</h2>
            <p>
              {weekName(report.week_start)} · {editionName}
            </p>
          </div>
          <button ref={closeRef} type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
            <Icon name="x" />
          </button>
        </div>
        {edits.isLoading ? (
          <p className="wk-panel-note">불러오는 중…</p>
        ) : edits.isError ? (
          <p className="wk-panel-note">수정 이력을 불러오지 못했습니다.</p>
        ) : (
          <ol className="wk-edits">
            {(edits.data ?? []).map((edit) => (
              <EditEntry key={edit.id} edit={edit} />
            ))}
            <li className="wk-edits-row wk-edits-origin">
              <span className="wk-edits-name">자동 생성</span>
              <span className="wk-edits-time wk-num">{kstStamp(report.generated_at)}</span>
              <span className="wk-edits-chips">
                <span className="wk-chip">처음 만듦</span>
              </span>
            </li>
          </ol>
        )}
      </aside>
    </div>,
    document.body,
  )
}
