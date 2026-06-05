import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { generateReport, listReports } from '../api/reportApi'
import { Btn } from '../components/common/Btn'
import { Icon } from '../components/common/Icon'
import { useToast } from '../components/common/Toast'
import { formatDate } from '../utils/date'

function todayInputValue(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function ReportsPage() {
  const toast = useToast()
  const qc = useQueryClient()
  const [reportDate, setReportDate] = useState(todayInputValue)
  const { data: reports = [] } = useQuery({ queryKey: ['reports'], queryFn: listReports })

  const gen = useMutation({
    mutationFn: () => generateReport(reportDate),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reports'] })
      toast('데일리 리포트를 생성했습니다.', 'info')
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast(msg || '리포트 생성 실패 — 게시글이 필요합니다.', 'err')
    },
  })

  return (
    <div className="content-inner page-fade">
      <div className="page-intro" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2>데일리 리포트</h2>
          <p>선택한 날짜에 수집된 중요·AI 발견 게시글을 기반으로 AI가 일일 브리핑을 생성합니다.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            className="input"
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            style={{ width: 160 }}
          />
          <Btn variant="primary" icon="doc" onClick={() => gen.mutate()} disabled={gen.isPending}>
            {gen.isPending ? '생성 중…' : '리포트 수동 생성'}
          </Btn>
        </div>
      </div>

      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 120 }}>날짜</th>
              <th>제목</th>
              <th style={{ width: 160 }}>생성일</th>
              <th style={{ width: 120 }}>Slack</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id} style={{ cursor: 'pointer' }}>
                <td className="mono">{r.report_date}</td>
                <td>
                  <Link to={`/reports/${r.id}`} className="link" style={{ fontWeight: 600 }}>
                    {r.title}
                  </Link>
                </td>
                <td className="mono" style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                  {formatDate(r.created_at)}
                </td>
                <td>
                  {r.slack_sent ? (
                    <span className="badge badge-info">
                      <Icon name="slack" style={{ width: 12, height: 12 }} /> 발송됨
                    </span>
                  ) : (
                    <span className="badge badge-unknown">미발송</span>
                  )}
                </td>
              </tr>
            ))}
            {!reports.length && (
              <tr>
                <td colSpan={4} style={{ color: 'var(--text-muted)' }}>
                  리포트가 없습니다. 게시글 수집 후 생성하세요.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
