import type { DeliveryReport, Generation } from '../../api/deliveryApi'

/** mint-server#232 — shared helpers for the auto-report UI (KST times, states). */

const WEEKDAYS = '일월화수목금토'

/** "12.03 (목) 09:00" in KST, whatever the viewer's zone. */
export function kstDateTime(iso: string | null | undefined, withTime = true): string {
  if (!iso) return '-'
  const d = new Date(new Date(iso).getTime() + 9 * 3600_000)
  const pad = (n: number) => String(n).padStart(2, '0')
  const day = `${pad(d.getUTCMonth() + 1)}.${pad(d.getUTCDate())} (${WEEKDAYS[d.getUTCDay()]})`
  return withTime ? `${day} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}` : day
}

/** First day of last month in KST, as YYYY-MM-01 (the month the automatic report covers). */
export function targetMonth(now = new Date()): string {
  const k = new Date(now.getTime() + 9 * 3600_000)
  const y = k.getUTCMonth() === 0 ? k.getUTCFullYear() - 1 : k.getUTCFullYear()
  const m = k.getUTCMonth() === 0 ? 12 : k.getUTCMonth()
  return `${y}-${String(m).padStart(2, '0')}-01`
}

export type AutoState = 'pending' | 'approved' | 'generating' | 'failed' | 'sent' | 'expired' | 'rejected' | 'superseded' | null

export const STATE_LABEL: Record<Exclude<AutoState, null>, string> = {
  pending: '검토 대기',
  approved: '승인됨',
  generating: '생성 중',
  failed: '생성 실패',
  sent: '발송됨',
  expired: '기한 지남',
  rejected: '버림',
  superseded: '다시 만들어짐',
}

/** List/review status for a report (spec §3-1: review_status and send_status are separate). */
export function reportState(report: DeliveryReport): AutoState {
  if (report.send_status === 'sent' || report.send_status === 'partial') return 'sent'
  if (report.origin !== 'auto') return null
  return report.review_status
}

export function draftTitle(month: string, editionName: string): string {
  return `${Number(month.slice(5, 7))}월 ${editionName} 월간 동향`
}


/** "11.03 10:12" in KST (the year is added when it is not this year). */
export function kstShort(iso: string | null | undefined): string {
  if (!iso) return '-'
  const d = new Date(new Date(iso).getTime() + 9 * 3600_000)
  const now = new Date(Date.now() + 9 * 3600_000)
  const pad = (n: number) => String(n).padStart(2, '0')
  const short = `${pad(d.getUTCMonth() + 1)}.${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
  return d.getUTCFullYear() === now.getUTCFullYear() ? short : `${d.getUTCFullYear()}.${short}`
}

/** Minutes between generate (day, HH:MM) and send (day, HH:MM) within a month. */
export function scheduleGapMinutes(genDay: number, genTime: string, sendDay: number, sendTime: string): number {
  const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
  return (sendDay - genDay) * 1440 + minutes(sendTime) - minutes(genTime)
}

/** "2026-10-01" → "2026년 10월". */
export function monthLabel(month: string): string {
  return `${month.slice(0, 4)}년 ${Number(month.slice(5, 7))}월`
}

/**
 * Why "지금 만들기" must not start for this edition and month, or null when it may.
 * The server replaces any pending/approved draft of the month when a new one is registered, even one
 * already sent (review_status stays approved after sending), so the button has to refuse those.
 */
export function generationBlock(
  editionId: string,
  month: string,
  reports: DeliveryReport[],
  generations: Generation[],
): 'draft' | 'sent' | 'running' | null {
  if (generations.some((g) => g.edition_id === editionId && g.report_month === month && g.status === 'running')) return 'running'
  const drafts = reports.filter((r) => r.origin === 'auto' && r.edition_id === editionId && r.report_month === month)
  if (drafts.some((r) => r.send_status === 'sent' || r.send_status === 'partial' || r.send_status === 'sending')) return 'sent'
  if (drafts.some((r) => r.review_status === 'pending' || r.review_status === 'approved')) return 'draft'
  return null
}

/** Has this month's send time (saved day and HH:MM, KST) passed? Then a new draft cannot be approved. */
export function sendTimePassed(sendDay: number, sendTime: string, now = new Date()): boolean {
  const k = new Date(now.getTime() + 9 * 3600_000)
  const minutes = Number(sendTime.slice(0, 2)) * 60 + Number(sendTime.slice(3, 5))
  const current = k.getUTCDate() * 1440 + k.getUTCHours() * 60 + k.getUTCMinutes()
  return current >= sendDay * 1440 + minutes
}
