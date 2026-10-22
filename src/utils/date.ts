export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })
}

/** Compact one-line time for tables: "10.20 08:30", with the year when it is not this year. */
export function formatShortDateTime(iso: string | null | undefined): string {
  if (!iso) return '-'
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  const short = `${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  return d.getFullYear() === new Date().getFullYear() ? short : `${d.getFullYear()}.${short}`
}

export function relativeCrawl(iso: string | null | undefined): string {
  if (!iso) return '미수집'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '방금 전'
  if (mins < 60) return `${mins}분 전`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}시간 전`
  return formatDate(iso)
}

const SEOUL_PARTS = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function seoulParts(time: number) {
  const parts = Object.fromEntries(SEOUL_PARTS.formatToParts(time).map((p) => [p.type, p.value]))
  return { y: parts.year, m: parts.month, d: parts.day, hh: parts.hour, mm: parts.minute }
}

function dayKey(time: number): string {
  const p = seoulParts(time)
  return `${p.y}-${p.m}-${p.d}`
}

export type KioskDate = { text: string; collected: boolean; label: string }

/**
 * #143 kiosk "보도" column, Asia/Seoul calendar: today → HH:MM, yesterday → 어제,
 * this year → MM.DD, other years → YYYY.MM.DD. A missing or future published_at
 * falls back to collected_at and is flagged so the row can say "수집".
 */
export function formatKioskDate(
  publishedAt: string | null | undefined,
  collectedAt: string,
  now: number = Date.now(),
): KioskDate {
  const published = publishedAt ? Date.parse(publishedAt) : Number.NaN
  const collected = !(Number.isFinite(published) && published <= now)
  const time = collected ? Date.parse(collectedAt) : published
  const p = seoulParts(time)
  const today = seoulParts(now)
  // Seoul has no DST, so the previous calendar day is exactly 24h earlier.
  let text: string
  let kind: '시각' | '날짜'
  if (dayKey(time) === dayKey(now)) {
    text = `${p.hh}:${p.mm}`
    kind = '시각'
  } else if (dayKey(time) === dayKey(now - 86_400_000)) {
    text = '어제'
    kind = '날짜'
  } else {
    text = p.y === today.y ? `${p.m}.${p.d}` : `${p.y}.${p.m}.${p.d}`
    kind = '날짜'
  }
  const prefix = collected ? '수집' : '보도'
  return { text, collected, label: text === '어제' ? `${prefix} 어제` : `${prefix} ${kind} ${text}` }
}
