/**
 * mint-server#211 — weekly report week labels. A week runs Monday to Sunday (KST) and is
 * named after the month its Thursday falls in: n = ceil(Thursday's day of month / 7).
 * Dates are plain YYYY-MM-DD strings, so no time zone conversion is involved.
 */

function parseDay(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function addDays(day: Date, days: number): Date {
  return new Date(day.getTime() + days * 86_400_000)
}

const pad = (n: number) => String(n).padStart(2, '0')

function currentKstYear(): number {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', year: 'numeric' }).format(new Date()))
}

/** "10월 4주", or "2025년 12월 5주" when the Thursday is not in the current year. */
export function weekName(weekStart: string, thisYear: number = currentKstYear()): string {
  const thursday = addDays(parseDay(weekStart), 3)
  const n = Math.ceil(thursday.getUTCDate() / 7)
  const month = `${thursday.getUTCMonth() + 1}월 ${n}주`
  const year = thursday.getUTCFullYear()
  return year === thisYear ? month : `${year}년 ${month}`
}

/** "10.19–10.25", or "2025.12.29–01.04" when the Thursday is not in the current year. */
export function weekRange(weekStart: string, thisYear: number = currentKstYear()): string {
  const start = parseDay(weekStart)
  const end = addDays(start, 6)
  const thursday = addDays(start, 3)
  const head = `${pad(start.getUTCMonth() + 1)}.${pad(start.getUTCDate())}`
  const tail = `${pad(end.getUTCMonth() + 1)}.${pad(end.getUTCDate())}`
  return thursday.getUTCFullYear() === thisYear ? `${head}–${tail}` : `${start.getUTCFullYear()}.${head}–${tail}`
}

const KST_STAMP = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

const KST_DAY = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit' })

function parts(format: Intl.DateTimeFormat, iso: string): Record<string, string> {
  return Object.fromEntries(format.formatToParts(new Date(iso)).map((p) => [p.type, p.value]))
}

/** Server timestamps are UTC; naive ones (no offset) are read as UTC too. */
function asUtc(iso: string): string {
  return /[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`
}

/** "10.26 09:00" in KST. */
export function kstStamp(iso: string | null | undefined): string {
  if (!iso) return ''
  const p = parts(KST_STAMP, asUtc(iso))
  return `${p.month}.${p.day} ${p.hour}:${p.minute}`
}

/** "10.21" in KST. */
export function kstDay(iso: string | null | undefined): string {
  if (!iso) return ''
  const p = parts(KST_DAY, asUtc(iso))
  return `${p.month}.${p.day}`
}
