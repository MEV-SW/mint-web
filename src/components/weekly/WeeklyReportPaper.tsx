import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { WeeklyReportDetail, WeeklyReportItem, WeeklyReportSection } from '../../types/weeklyReport'
import { kstDay, kstStamp, weekName, weekRange } from '../../utils/weekLabel'
import { byRank, isOverflow, isVisible, readableSections } from './weeklyItems'

export const EMPTY_WEEK_TITLE = '이번 주에는 주간 리포트에 담을 중요 기사가 없습니다.'

export function GeneratedLine({ report }: { report: WeeklyReportDetail }) {
  return (
    <p className="wk-generated">
      자동 생성 {kstStamp(report.generated_at)}
      {report.edited && (
        <>
          {' · '}
          <span className="wk-generated-edited">수정됨</span>
          {report.edited_by_name ? ` · ${report.edited_by_name}` : ''}
          {report.edited_at ? ` · ${kstStamp(report.edited_at)}` : ''}
        </>
      )}
    </p>
  )
}

function ArticleRow({ item, fallback }: { item: WeeklyReportItem; fallback: boolean }) {
  const meta = [item.source_name, kstDay(item.collected_at)].filter(Boolean).join(' · ')
  // In a fallback report the line is the title itself; showing it twice adds nothing.
  const showLine = !(fallback && item.line.trim() === item.title.trim())
  return (
    <li className="wk-article">
      <div className="wk-article-main">
        <Link className="wk-article-title" to={`/posts/${item.post_id}`}>
          {item.title}
        </Link>
        {showLine && <p className="wk-article-line">{item.line}</p>}
        <div className="wk-article-meta">
          {meta && <span>{meta}</span>}
          <Link className="wk-article-open" to={`/posts/${item.post_id}`} aria-hidden tabIndex={-1}>
            기사 보기 →
          </Link>
        </div>
      </div>
    </li>
  )
}

function SectionBlock({ section, fallback }: { section: WeeklyReportSection; fallback: boolean }) {
  const [open, setOpen] = useState(false)
  const items = byRank(section.items)
  const visible = items.filter(isVisible)
  const overflow = items.filter(isOverflow)
  const headId = `wk-section-${section.section}`
  return (
    <section className="wk-section" aria-labelledby={headId}>
      <div className="wk-section-head">
        <h2 id={headId}>{section.label}</h2>
        <span className="wk-num">{visible.length}</span>
      </div>
      {visible.length > 0 && (
        <ol className="wk-articles">
          {visible.map((item) => (
            <ArticleRow key={item.post_id} item={item} fallback={fallback} />
          ))}
        </ol>
      )}
      {section.overflow_count > 0 && overflow.length > 0 && (
        <>
          {open && (
            <ol className="wk-articles wk-articles-more" start={visible.length + 1}>
              {overflow.map((item) => (
                <ArticleRow key={item.post_id} item={item} fallback={fallback} />
              ))}
            </ol>
          )}
          <button
            type="button"
            className="wk-more-btn"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? '접기 ▴' : `그 밖에 ${section.overflow_count}건 펼치기 ▾`}
          </button>
        </>
      )}
    </section>
  )
}

/** One week in read mode (all readers). */
export function WeeklyReportPaper({
  report,
  editionName,
  actions,
  banner,
}: {
  report: WeeklyReportDetail
  editionName: string
  actions?: React.ReactNode
  banner?: React.ReactNode
}) {
  const empty = report.model === 'none'
  const fallback = report.model === 'fallback'
  const sections = readableSections(report.sections)
  return (
    <article className="wk-paper" aria-labelledby="wk-paper-title">
      {banner}
      <header className="wk-paper-head">
        <div className="wk-paper-head-main">
          <div className="wk-kicker">주간 리포트 · {editionName}</div>
          <div className="wk-week">
            <span className="wk-week-name">{weekName(report.week_start)}</span>
            <span className="wk-week-range wk-num">{weekRange(report.week_start)}</span>
          </div>
          <GeneratedLine report={report} />
          <h1 id="wk-paper-title" className="wk-paper-title">
            {report.title}
          </h1>
        </div>
        {actions && <div className="wk-paper-actions">{actions}</div>}
      </header>

      {empty ? (
        <div className="wk-empty-box">
          <p className="wk-empty-title">{EMPTY_WEEK_TITLE}</p>
          <p className="wk-empty-note">데일리 리포트와 중요도 높음·보통 기사가 모두 없던 주입니다.</p>
        </div>
      ) : (
        <div className="wk-flow">
          <div className="wk-flow-label">{fallback ? '이번 주 데일리 리포트 요약' : '핵심 흐름'}</div>
          <p className="wk-flow-body">{report.summary}</p>
        </div>
      )}

      {sections.map((section) => (
        <SectionBlock key={section.section} section={section} fallback={fallback} />
      ))}

      <p className="wk-basis">
        근거: 데일리 리포트 <span className="wk-num">{report.input_daily_count}</span>편 · 기사{' '}
        <span className="wk-num">{report.input_post_count}</span>건
      </p>
    </article>
  )
}
