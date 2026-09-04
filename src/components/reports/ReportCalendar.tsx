import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Btn } from '../common/Btn'
import { Icon } from '../common/Icon'

export interface OrgReportDay {
  id: string
  title: string
  report_date: string
  slack_sent: boolean
  edition_id?: string | null
  edition_name?: string | null
  created_at?: string
}

export interface PersonalReportDay {
  id: string
  title: string
  report_date: string
  item_count: number
  popup_seen: boolean
}

interface ReportCalendarProps {
  orgReports: OrgReportDay[]
  personalReports: PersonalReportDay[]
  loading?: boolean
  personalUnavailable?: boolean
  hidePersonal?: boolean
  canGenerateOrg?: boolean
  generatingOrg?: boolean
  generatingPersonal?: boolean
  onGenerateOrg?: () => void
  onGeneratePersonal?: () => void
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const

function dateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function todayKey(): string {
  return dateKey(new Date())
}

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatMonthLabel(year: number, monthIndex: number): string {
  return `${year}.${String(monthIndex + 1).padStart(2, '0')}`
}

function formatSelectedLabel(key: string): string {
  const d = parseDateKey(key)
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })
}

function buildMonthCells(year: number, monthIndex: number): (string | null)[] {
  const first = new Date(year, monthIndex, 1)
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const startPad = first.getDay()
  const cells: (string | null)[] = []
  for (let i = 0; i < startPad; i++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(dateKey(new Date(year, monthIndex, day)))
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function briefingKicker(report: OrgReportDay): string {
  if (report.edition_name) return report.edition_name
  const parts = report.title.split(' · ')
  if (parts.length >= 3) return parts[1]
  return '브리핑'
}

function sortBriefings(a: OrgReportDay, b: OrgReportDay): number {
  const aOrder = a.edition_name ?? a.title
  const bOrder = b.edition_name ?? b.title
  return aOrder.localeCompare(bOrder, 'ko')
}

function latestPerEdition(reports: OrgReportDay[]): OrgReportDay[] {
  const newest = new Map<string, OrgReportDay>()
  const ordered = [...reports].sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''))
  for (const report of ordered) {
    newest.set(report.edition_id ?? report.id, report)
  }
  return [...newest.values()].sort(sortBriefings)
}

function pickInitialDate(
  orgByDate: Map<string, OrgReportDay[]>,
  personalByDate: Map<string, PersonalReportDay>,
): string {
  const today = todayKey()
  if (orgByDate.has(today) || personalByDate.has(today)) return today

  const allDates = [...new Set([...orgByDate.keys(), ...personalByDate.keys()])].sort()
  if (allDates.length > 0) return allDates[allDates.length - 1]
  return today
}

export function ReportCalendar({
  orgReports,
  personalReports,
  loading = false,
  personalUnavailable = false,
  hidePersonal = false,
  canGenerateOrg = false,
  generatingOrg = false,
  generatingPersonal: _generatingPersonal = false,
  onGenerateOrg,
  onGeneratePersonal: _onGeneratePersonal,
}: ReportCalendarProps) {
  const orgByDate = useMemo(() => {
    const map = new Map<string, OrgReportDay[]>()
    for (const report of orgReports) {
      const list = map.get(report.report_date) ?? []
      list.push(report)
      map.set(report.report_date, list)
    }
    for (const [day, list] of map) map.set(day, latestPerEdition(list))
    return map
  }, [orgReports])

  const personalByDate = useMemo(() => {
    const map = new Map<string, PersonalReportDay>()
    for (const report of personalReports) map.set(report.report_date, report)
    return map
  }, [personalReports])

  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const [selected, setSelected] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (loading || initialized) return
    const initial = pickInitialDate(orgByDate, personalByDate)
    setSelected(initial)
    const d = parseDateKey(initial)
    setCursor({ year: d.getFullYear(), month: d.getMonth() })
    setInitialized(true)
  }, [loading, initialized, orgByDate, personalByDate])

  const cells = useMemo(
    () => buildMonthCells(cursor.year, cursor.month),
    [cursor.year, cursor.month],
  )

  const selectedKey = selected ?? todayKey()
  const selectedOrgReports = orgByDate.get(selectedKey) ?? []
  const selectedPersonal = personalByDate.get(selectedKey)
  const today = todayKey()

  function shiftMonth(delta: number) {
    setCursor((prev) => {
      const d = new Date(prev.year, prev.month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  return (
    <div className="report-cal">
      <div className="report-cal-toolbar">
        <div className="report-cal-nav">
          <button
            type="button"
            className="report-cal-nav-btn"
            onClick={() => shiftMonth(-1)}
            aria-label="이전 달"
          >
            <Icon name="chevL" />
          </button>
          <h2 className="report-cal-month">{formatMonthLabel(cursor.year, cursor.month)}</h2>
          <button
            type="button"
            className="report-cal-nav-btn"
            onClick={() => shiftMonth(1)}
            aria-label="다음 달"
          >
            <Icon name="chevR" />
          </button>
          <button
            type="button"
            className="report-cal-today-btn"
            onClick={() => {
              const t = todayKey()
              const d = parseDateKey(t)
              setCursor({ year: d.getFullYear(), month: d.getMonth() })
              setSelected(t)
            }}
          >
            오늘
          </button>
        </div>
        <div className="report-cal-actions">
          {canGenerateOrg && (
            <Btn
              variant="outline"
              size="sm"
              icon="sparkles"
              onClick={onGenerateOrg}
              disabled={generatingOrg}
            >
              {generatingOrg ? '생성 중…' : '오늘 생성'}
            </Btn>
          )}
        </div>
      </div>

      <div className="report-cal-legend" aria-hidden>
        <span>
          <i className="report-cal-dot report-cal-dot-org" /> 브리핑
        </span>
      </div>

      <div className="report-cal-layout">
        <section className="report-cal-grid-wrap" aria-label="리포트 달력">
          {loading ? (
            <div className="personal-empty">불러오는 중…</div>
          ) : (
            <>
              <div className="report-cal-weekdays">
                {WEEKDAYS.map((label) => (
                  <div key={label} className="report-cal-weekday">
                    {label}
                  </div>
                ))}
              </div>
              <div className="report-cal-grid">
                {cells.map((key, index) => {
                  if (!key) {
                    return <div key={`empty-${index}`} className="report-cal-cell is-empty" />
                  }
                  const dayReports = orgByDate.get(key) ?? []
                  const hasOrg = dayReports.length > 0
                  const hasPersonal = personalByDate.has(key)
                  const isToday = key === today
                  const isSelected = key === selectedKey
                  const dayNum = Number(key.slice(-2))
                  return (
                    <button
                      key={key}
                      type="button"
                      className={[
                        'report-cal-cell',
                        isToday ? 'is-today' : '',
                        isSelected ? 'is-selected' : '',
                        hasOrg || hasPersonal ? 'has-report' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => setSelected(key)}
                    >
                      <span className="report-cal-daynum">{dayNum}</span>
                      <span className="report-cal-markers">
                        {dayReports.slice(0, 3).map((report) => (
                          <i
                            key={report.id}
                            className="report-cal-dot report-cal-dot-org"
                            title={briefingKicker(report)}
                          />
                        ))}
                        {!hidePersonal && hasPersonal && (
                          <i className="report-cal-dot report-cal-dot-mine" />
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </section>

        <aside className="report-cal-panel" aria-label="선택일 리포트">
          <div className="report-cal-panel-head">
            <h3>{formatSelectedLabel(selectedKey)}</h3>
            <p>선택한 날짜의 분야 브리핑</p>
          </div>

          <div className="report-cal-panel-body">
            {selectedOrgReports.length > 0 ? (
              selectedOrgReports.map((report) => (
                <Link key={report.id} to={`/reports/${report.id}`} className="report-cal-entry">
                  <span className="report-cal-entry-kicker">
                    <i className="report-cal-dot report-cal-dot-org" /> {briefingKicker(report)}
                  </span>
                  <strong>{report.title}</strong>
                  <small>{report.slack_sent ? 'Slack 발송됨' : '미발송'}</small>
                </Link>
              ))
            ) : (
              <div className="report-cal-entry is-empty">
                <span className="report-cal-entry-kicker">
                  <i className="report-cal-dot report-cal-dot-org" /> 브리핑
                </span>
                <p>이 날짜의 브리핑이 없습니다.</p>
              </div>
            )}

            {!hidePersonal && (personalUnavailable ? (
              <div className="report-cal-entry is-empty">
                <span className="report-cal-entry-kicker">
                  <i className="report-cal-dot report-cal-dot-mine" /> 내 리포트
                </span>
                <p>개인화 기능을 사용할 수 없습니다.</p>
              </div>
            ) : selectedPersonal ? (
              <Link to={`/personal-reports/${selectedPersonal.id}`} className="report-cal-entry">
                <span className="report-cal-entry-kicker">
                  <i className="report-cal-dot report-cal-dot-mine" /> 내 리포트
                  {!selectedPersonal.popup_seen ? ' · 새 소식' : ''}
                </span>
                <strong>{selectedPersonal.title}</strong>
                <small>{selectedPersonal.item_count}건</small>
              </Link>
            ) : (
              <div className="report-cal-entry is-empty">
                <span className="report-cal-entry-kicker">
                  <i className="report-cal-dot report-cal-dot-mine" /> 내 리포트
                </span>
                <p>이 날짜의 개인 리포트가 없습니다.</p>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}
