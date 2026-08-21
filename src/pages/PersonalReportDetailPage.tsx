import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getPersonalReport, markPersonalReportViewed } from '../api/personalizationApi'
import { ImportanceBadge } from '../components/common/Badges'
import { Icon } from '../components/common/Icon'
import { ListenButton, buildBriefingSpeech } from '../components/common/ListenButton'

export function PersonalReportDetailPage() {
  const { id } = useParams<{ id: string }>()
  const report = useQuery({
    queryKey: ['personal-report', id],
    queryFn: () => getPersonalReport(id!),
    enabled: Boolean(id),
  })
  useEffect(() => {
    if (id) void markPersonalReportViewed(id, true)
  }, [id])

  if (!report.data) return <div className="content-inner">리포트를 불러오는 중…</div>

  const items = report.data.items ?? []

  return (
    <div className="content-inner page-fade personal-report-detail">
      <Link to="/reports" className="back-link"><Icon name="chevL" /> 리포트</Link>
      <header>
        <span>{report.data.report_date} · MY DAILY REPORT</span>
        <h1>{report.data.title}</h1>
        <div style={{ margin: '12px 0' }}>
          <ListenButton
            label="브리핑 듣기"
            text={buildBriefingSpeech({
              title: report.data.title,
              summary: report.data.summary,
              extras: items.slice(0, 6).map((item) => item.post.title),
            })}
          />
        </div>
        <p>{report.data.summary}</p>
      </header>
      <ol>
        {items.map((item) => (
          <li key={item.post.id}>
            <Link to={`/posts/${item.post.id}`}>
              <span className="report-rank">{String(item.rank).padStart(2, '0')}</span>
              <div>
                <div className="personal-news-tags">{item.matched_keyword_names.map((name) => <span key={name}>{name}</span>)}</div>
                <h2>{item.post.title}</h2>
                {item.post.summary && <p>{item.post.summary}</p>}
              </div>
              <ImportanceBadge level={item.post.importance} />
            </Link>
          </li>
        ))}
      </ol>
    </div>
  )
}
