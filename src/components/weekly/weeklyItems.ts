import type {
  WeeklyEditItemState,
  WeeklyReportEdit,
  WeeklyReportItem,
  WeeklyReportSection,
} from '../../types/weeklyReport'

/** In the body: not hidden by an editor and inside the section's display list. */
export function isVisible(item: WeeklyReportItem): boolean {
  return !item.hidden && item.shown
}

/** Under "그 밖에": not hidden, not in the body. */
export function isOverflow(item: WeeklyReportItem): boolean {
  return !item.hidden && !item.shown
}

export function byRank(items: WeeklyReportItem[]): WeeklyReportItem[] {
  return [...items].sort((a, b) => a.rank - b.rank)
}

/** Read mode drops sections with neither body nor "그 밖에" items. */
export function readableSections(sections: WeeklyReportSection[]): WeeklyReportSection[] {
  return sections.filter((section) => section.items.some((item) => !item.hidden))
}

export type ItemChange = { before?: WeeklyEditItemState; after?: WeeklyEditItemState }

export function itemChanges(edit: WeeklyReportEdit): ItemChange[] {
  const before = new Map((edit.before.items ?? []).map((item) => [item.post_id, item]))
  return (edit.after.items ?? []).map((after) => ({ before: before.get(after.post_id), after }))
}

/** Chips: 제목 · 핵심 흐름 · 한 줄 요약 N건 · 숨김 N건 · 보이기 N건 (hidden or shown changes). */
export function editChips(edit: WeeklyReportEdit): string[] {
  const chips: string[] = []
  if ('title' in edit.after) chips.push('제목')
  if ('summary' in edit.after) chips.push('핵심 흐름')
  const changes = itemChanges(edit)
  const count = (test: (c: ItemChange) => boolean) => changes.filter(test).length
  const lines = count((c) => c.before?.line !== c.after?.line)
  const hid = count(
    (c) => (!c.before?.hidden && !!c.after?.hidden) || (!!c.before?.shown && c.after?.shown === false),
  )
  const shown = count(
    (c) => (!!c.before?.hidden && c.after?.hidden === false) || (c.before?.shown === false && !!c.after?.shown),
  )
  if (lines) chips.push(`한 줄 요약 ${lines}건`)
  if (hid) chips.push(`숨김 ${hid}건`)
  if (shown) chips.push(`보이기 ${shown}건`)
  return chips
}
