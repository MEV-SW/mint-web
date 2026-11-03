import type { DeliveryReport } from '../../api/deliveryApi'

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
