import { useMutation } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { updateWeeklyReport } from '../../api/weeklyReportApi'
import type { WeeklyReportDetail, WeeklyReportItem } from '../../types/weeklyReport'
import { apiErrorDetail, apiErrorStatus } from '../../utils/apiError'
import { cx } from '../../utils/cx'
import { weekName } from '../../utils/weekLabel'
import { useConfirm } from '../common/useConfirm'
import { useToast } from '../common/Toast'
import { LINE_MAX, SUMMARY_MAX, TITLE_MAX, draftChanges, draftFrom, type ItemDraft, type WeeklyDraft } from './weeklyDraft'
import { byRank } from './weeklyItems'

function Counter({ value, max }: { value: number; max: number }) {
  return (
    <span className={cx('wk-counter wk-num', value > max && 'is-over')} aria-live="polite">
      {value} / {max}
    </span>
  )
}

function EditRow({
  item,
  draft,
  onChange,
  overflowRow,
}: {
  item: WeeklyReportItem
  draft: ItemDraft
  onChange: (next: ItemDraft) => void
  overflowRow: boolean
}) {
  const changed = draft.line !== item.line
  const inputId = `wk-line-${item.post_id}`
  return (
    <li className={cx('wk-edit-row', draft.hidden && 'is-hidden')}>
      <div className="wk-edit-row-main">
        <div className="wk-edit-row-title">
          {item.title}
          {draft.hidden && <span className="wk-tag">숨김</span>}
        </div>
        <label className="sr-only" htmlFor={inputId}>
          {item.title} 한 줄 요약
        </label>
        <input
          id={inputId}
          className={cx('wk-line-input', changed && 'is-changed')}
          value={draft.line}
          onChange={(e) => onChange({ ...draft, line: e.target.value })}
        />
        <div className="wk-edit-row-foot">
          {changed && <span className="wk-changed">바뀜</span>}
          {draft.line.length > LINE_MAX && <span className="wk-field-error">600자까지 쓸 수 있습니다.</span>}
          {!draft.line.trim() && <span className="wk-field-error">한 줄 요약을 비워 둘 수 없습니다.</span>}
        </div>
      </div>
      {overflowRow ? (
        <button
          type="button"
          className="wk-toggle-btn"
          aria-pressed={draft.shown}
          onClick={() => onChange({ ...draft, shown: !draft.shown })}
        >
          {draft.shown ? '내리기' : '보이기'}
        </button>
      ) : (
        <button
          type="button"
          className="wk-toggle-btn"
          aria-pressed={draft.hidden}
          onClick={() => onChange({ ...draft, hidden: !draft.hidden })}
        >
          {draft.hidden ? '보이기' : '숨기기'}
        </button>
      )}
    </li>
  )
}

/** S3 편집 모드: title, summary, article lines, hide/show, moving "그 밖에" items into the body. */
export function WeeklyReportEditor({
  report,
  onDone,
  onReload,
  onForbidden,
  onDirtyChange,
}: {
  report: WeeklyReportDetail
  onDone: (saved: WeeklyReportDetail | null) => void
  onReload: () => void
  onForbidden: () => void
  onDirtyChange: (dirty: boolean) => void
}) {
  const toast = useToast()
  const confirm = useConfirm()
  const [draft, setDraft] = useState<WeeklyDraft>(() => draftFrom(report))
  const [conflict, setConflict] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [overflowOpen, setOverflowOpen] = useState<Record<string, boolean>>({})
  const { body, count } = useMemo(() => draftChanges(report, draft), [report, draft])

  useEffect(() => onDirtyChange(count > 0), [count, onDirtyChange])

  const invalid =
    !draft.title.trim() ||
    draft.title.length > TITLE_MAX ||
    !draft.summary.trim() ||
    draft.summary.length > SUMMARY_MAX ||
    Object.values(draft.items).some((item) => !item.line.trim() || item.line.length > LINE_MAX)

  const save = useMutation({
    mutationFn: () => updateWeeklyReport(report.id, { ...body, expected_updated_at: report.updated_at }),
    onSuccess: (saved) => {
      toast('저장했습니다')
      onDone(saved)
    },
    onError: (error: unknown) => {
      const status = apiErrorStatus(error)
      if (status === 409) {
        setConflict(true)
        return
      }
      if (status === 403) {
        // Edit rights were removed while editing: back to read mode with fresh data.
        toast('이 분야를 고칠 권한이 없습니다.', 'err')
        onForbidden()
        return
      }
      setServerError(apiErrorDetail(error) || '저장하지 못했습니다.')
    },
  })

  const cancel = async () => {
    if (count > 0) {
      const ok = await confirm({
        title: `변경 ${count}건을 버릴까요?`,
        cancelLabel: '계속 편집',
        confirmLabel: '버리기',
        danger: true,
      })
      if (!ok) return
    }
    onDone(null)
  }

  const reload = async () => {
    if (count > 0) {
      const ok = await confirm({
        title: '입력한 내용을 버리고 새로 불러올까요?',
        cancelLabel: '계속 편집',
        confirmLabel: '버리고 새로 불러오기',
        danger: true,
      })
      if (!ok) return
    }
    onReload()
  }

  const setItem = (postId: string, next: ItemDraft) =>
    setDraft((prev) => ({ ...prev, items: { ...prev.items, [postId]: next } }))

  return (
    <div className="wk-editor">
      <div className="wk-edit-bar" role="region" aria-label="편집 막대">
        <div className="wk-edit-bar-text">
          <strong>편집 중 · {weekName(report.week_start)}</strong>
          <span>변경 {count}건</span>
        </div>
        <div className="wk-edit-bar-actions">
          <button type="button" className="wk-bar-btn" onClick={() => void cancel()}>
            취소
          </button>
          <button
            type="button"
            className="wk-bar-btn is-primary"
            disabled={count === 0 || invalid || save.isPending}
            onClick={() => {
              setServerError(null)
              save.mutate()
            }}
          >
            {save.isPending ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>

      {conflict && (
        <div className="wk-conflict" role="alert">
          <span>다른 사람이 먼저 고쳤습니다. 새로 불러온 뒤 다시 저장해 주세요.</span>
          <button type="button" className="wk-bar-btn" onClick={() => void reload()}>
            새로 불러오기
          </button>
        </div>
      )}
      {serverError && (
        <p className="wk-field-error wk-server-error" role="alert">
          {serverError}
        </p>
      )}

      <div className="wk-field">
        <label className="wk-field-label" htmlFor="wk-edit-title">
          제목
        </label>
        {/* A textarea so long titles wrap on narrow screens; the title itself stays one line. */}
        <textarea
          id="wk-edit-title"
          className="wk-title-input"
          rows={1}
          value={draft.title}
          onChange={(e) => {
            const title = e.target.value.replace(/\s*\n\s*/g, ' ')
            setDraft((prev) => ({ ...prev, title }))
          }}
        />
        <Counter value={draft.title.length} max={TITLE_MAX} />
      </div>

      <div className="wk-field">
        <label className="wk-field-label" htmlFor="wk-edit-summary">
          핵심 흐름
        </label>
        <textarea
          id="wk-edit-summary"
          className="wk-summary-input"
          value={draft.summary}
          rows={6}
          onChange={(e) => setDraft((prev) => ({ ...prev, summary: e.target.value }))}
        />
        <Counter value={draft.summary.length} max={SUMMARY_MAX} />
      </div>

      <p className="wk-edit-note">숨긴 항목은 일반 회원에게 보이지 않습니다. 절 이동과 기사 추가는 할 수 없습니다.</p>

      {report.sections.map((section) => {
        const items = byRank(section.items)
        // Rows keep their place while editing: the body list is what the server sent as shown.
        const body = items.filter((item) => item.shown || item.hidden)
        const overflow = items.filter((item) => !item.shown && !item.hidden)
        const open = overflowOpen[section.section] ?? false
        return (
          <section key={section.section} className="wk-section" aria-labelledby={`wk-edit-${section.section}`}>
            <div className="wk-section-head">
              <h2 id={`wk-edit-${section.section}`}>{section.label}</h2>
              <span className="wk-num">
                {body.filter((item) => !draft.items[item.post_id]?.hidden).length +
                  overflow.filter((item) => draft.items[item.post_id]?.shown).length}
              </span>
            </div>
            {body.length > 0 && (
              <ol className="wk-edit-rows">
                {body.map((item) => (
                  <EditRow
                    key={item.post_id}
                    item={item}
                    draft={draft.items[item.post_id]}
                    onChange={(next) => setItem(item.post_id, next)}
                    overflowRow={false}
                  />
                ))}
              </ol>
            )}
            {overflow.length > 0 && (
              <div className="wk-overflow-group">
                <button
                  type="button"
                  className="wk-overflow-toggle"
                  aria-expanded={open}
                  onClick={() => setOverflowOpen((prev) => ({ ...prev, [section.section]: !open }))}
                >
                  그 밖에 (표시 안 함) {section.overflow_count}건 · {open ? '접기 ▴' : '펼쳐서 보이기 고르기 ▾'}
                </button>
                {open && (
                  <ol className="wk-edit-rows">
                    {overflow.map((item) => (
                      <EditRow
                        key={item.post_id}
                        item={item}
                        draft={draft.items[item.post_id]}
                        onChange={(next) => setItem(item.post_id, next)}
                        overflowRow
                      />
                    ))}
                  </ol>
                )}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
