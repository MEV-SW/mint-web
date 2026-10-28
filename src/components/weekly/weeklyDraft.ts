import type { WeeklyReportDetail, WeeklyReportItemUpdate, WeeklyReportUpdate } from '../../types/weeklyReport'

export const TITLE_MAX = 200
export const SUMMARY_MAX = 4000
export const LINE_MAX = 600

export type ItemDraft = { line: string; hidden: boolean; shown: boolean }

export interface WeeklyDraft {
  title: string
  summary: string
  items: Record<string, ItemDraft>
}

export function draftFrom(report: WeeklyReportDetail): WeeklyDraft {
  const items: Record<string, ItemDraft> = {}
  for (const section of report.sections) {
    for (const item of section.items) {
      items[item.post_id] = { line: item.line, hidden: item.hidden, shown: item.shown }
    }
  }
  return { title: report.title, summary: report.summary, items }
}

/** Only what changed; counts one per changed field (title, summary) and per changed article. */
export function draftChanges(report: WeeklyReportDetail, draft: WeeklyDraft): {
  body: Omit<WeeklyReportUpdate, 'expected_updated_at'>
  count: number
} {
  const body: Omit<WeeklyReportUpdate, 'expected_updated_at'> = {}
  let count = 0
  if (draft.title !== report.title) {
    body.title = draft.title
    count += 1
  }
  if (draft.summary !== report.summary) {
    body.summary = draft.summary
    count += 1
  }
  const items: WeeklyReportItemUpdate[] = []
  for (const section of report.sections) {
    for (const item of section.items) {
      const next = draft.items[item.post_id]
      if (!next) continue
      const change: WeeklyReportItemUpdate = { post_id: item.post_id }
      if (next.line !== item.line) change.line = next.line
      if (next.hidden !== item.hidden) change.hidden = next.hidden
      if (next.shown !== item.shown) change.shown = next.shown
      if (Object.keys(change).length > 1) items.push(change)
    }
  }
  if (items.length) {
    body.items = items
    count += items.length
  }
  return { body, count }
}
