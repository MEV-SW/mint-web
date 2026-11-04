import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  addRecipient,
  addRecipientsBulk,
  BATCH_PAGE,
  cancelBatch,
  deleteDeliveryReport,
  deleteRecipient,
  dismissGeneration,
  downloadReportHtml,
  downloadReportPdf,
  getBatch,
  getBatchDeliveries,
  getDeliveryReport,
  getDeliveryStatus,
  getMailPreview,
  getAutoSettings,
  listGenerations,
  getRetryPreview,
  getSendPreview,
  listBatches,
  listDeliveryReports,
  listRecipients,
  retryBatch,
  sendReport,
  sendTest,
  setRecipientsActive,
  updateRecipient,
  uploadDeliveryReport,
  type Batch,
  type BatchProgress,
  type DeliveryReport,
  type DeliveryReportKind,
  type Generation,
  type Recipient,
  type SendPreview,
} from '../../api/deliveryApi'
import { useAuthStore } from '../../store/authStore'
import { apiErrorCode, apiErrorDetail } from '../../utils/apiError'
import { cx } from '../../utils/cx'
import { Btn } from '../common/Btn'
import { Modal } from '../common/Modal'
import { OverflowMenu } from '../common/OverflowMenu'
import { useToast } from '../common/Toast'
import { useConfirm } from '../common/useConfirm'
import { AutoSettingsCard, ReviewCard, StateText } from './AutoReportParts'
import { draftTitle, KIND_LABEL, kstDateTime, kstShort, reportEditRule, reportState, targetMonth } from './autoReportState'
import { ReportInfoModal } from './ReportInfoModal'

/** mint-server#228 — 관리 › 외부전달 › 이메일 보고서 (Design 시안 02~06, 승인 2026-11-03). */

const PDF_MAX = 10 * 1024 * 1024
const HTML_MAX = 200 * 1024

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`
  return `${Math.max(1, Math.round(bytes / 1024))}KB`
}

/** "2026.06.05 ~ 11.03" (the end drops the year when it is the same). */
function formatPeriod(start: string, end: string, short = false): string {
  const [sy, sm, sd] = start.split('-')
  const [ey, em, ed] = end.split('-')
  const head = short ? `${sm}.${sd}` : `${sy}.${sm}.${sd}`
  return `${head} ~ ${ey === sy ? '' : `${ey}.`}${em}.${ed}`
}

function shortDate(iso: string): string {
  return kstShort(iso).split(' ')[0]
}

function failedCount(batch: Batch): number {
  return batch.failed + batch.skipped
}

function resultLabel(batch: Batch): { text: string; bad: boolean } {
  if (batch.status === 'queued' || batch.status === 'sending') return { text: `보내는 중 ${batch.done}/${batch.total}`, bad: false }
  if (batch.kind === 'test') {
    if (batch.sent) return { text: '성공', bad: false }
    return { text: batch.unknown ? '확인 필요' : '실패', bad: true }
  }
  const failed = failedCount(batch)
  const parts = [`${batch.sent}명 성공`]
  if (failed) parts.push(`${failed}명 실패`)
  if (batch.unknown) parts.push(`${batch.unknown}명 확인 필요`)
  if (batch.status === 'cancelled') parts.push('중지됨')
  return { text: parts.join(' · '), bad: failed > 0 || batch.unknown > 0 || batch.status !== 'done' }
}

/** A row of the 보고서 card: a stored report, or (#232) a running/failed generation without a draft. */
export type ReportItem =
  | { key: string; kind: 'report'; report: DeliveryReport }
  | { key: string; kind: 'generation'; generation: Generation; editionName: string }

export function EmailReportsPanel({ tabs }: { tabs: ReactNode }) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null)
  const [sendNow, setSendNow] = useState(0)

  const status = useQuery({ queryKey: ['delivery-status'], queryFn: getDeliveryStatus })
  const reports = useQuery({
    queryKey: ['delivery-reports'],
    queryFn: listDeliveryReports,
  })
  const generations = useQuery({
    queryKey: ['delivery-generations'],
    queryFn: listGenerations,
    refetchInterval: (query) => (query.state.data?.some((g) => g.status === 'running') ? 3000 : false),
  })
  const autoSettings = useQuery({ queryKey: ['delivery-auto-settings'], queryFn: getAutoSettings })
  const editionNames = new Map((autoSettings.data?.editions ?? []).map((e) => [e.id, e.name]))
  const month = targetMonth()
  const { current, past } = groupItems(reports.data ?? [], generations.data ?? [], month, editionNames)
  const items = [...current, ...past]
  const selected = items.find((item) => item.key === selectedKey) ?? items[0] ?? null
  const selectedReport = selected?.kind === 'report' ? selected.report : null
  const isAutoView = selected?.kind === 'generation' || selectedReport?.origin === 'auto'
  const refreshList = () => {
    void reports.refetch()
    void generations.refetch()
  }
  // When a running generation settles, its draft appears in the report list (not the generations).
  const runningIds = (generations.data ?? []).filter((g) => g.status === 'running').map((g) => g.id).join(',')
  const lastRunningRef = useRef(runningIds)
  useEffect(() => {
    const finished = lastRunningRef.current.split(',').filter((id) => id && !runningIds.includes(id))
    lastRunningRef.current = runningIds
    if (finished.length) {
      void reports.refetch()
      void autoSettings.refetch()
    }
  }, [runningIds, reports, autoSettings])

  const notice = !status.data
    ? null
    : !status.data.enabled
      ? '이메일 발송이 꺼져 있습니다. 보고서 올리기·미리보기·수신자 관리는 할 수 있습니다.'
      : !status.data.configured
        ? 'SES 발송 설정이 끝나지 않아 보낼 수 없습니다. 관리자에게 문의해 주세요.'
        : status.data.sandbox
          ? `SES 샌드박스 상태입니다. SES에서 인증한 주소로만 보낼 수 있습니다(24시간 ${status.data.sent_last_24h ?? 0}/${status.data.max_24h ?? 200}통).`
          : null

  return (
    <>
      <div className="dlv-tabbar">{tabs}</div>
      {notice && (
        <p className="dlv-notice" role="status">
          {notice}
        </p>
      )}
      <div className="dlv-grid">
        <div className="dlv-col">
          <ReportsCard
            current={current}
            past={past}
            month={month}
            maxGenerations={autoSettings.data?.max_generations ?? null}
            loading={reports.isLoading}
            selectedKey={selected?.key ?? null}
            onSelect={setSelectedKey}
            onUpload={() => setShowUpload(true)}
            onChanged={refreshList}
          />
          <RecipientsCard />
        </div>
        <div className="dlv-col">
          {isAutoView ? (
            <ReviewCard
              key={`review-${selected?.key ?? 'none'}`}
              report={selectedReport}
              generation={selected?.kind === 'generation' ? selected.generation : null}
              editionName={
                selected?.kind === 'generation'
                  ? selected.editionName
                  : editionNames.get(selectedReport?.edition_id ?? '') ?? ''
              }
              activeRecipients={status.data?.active_recipients ?? 0}
              scheduledFor={selected?.kind === 'generation' && autoSettings.data ? autoSettings.data.next.send_at : null}
              onSendNow={() => setSendNow((n) => n + 1)}
              onSelectReport={() => setSelectedKey(null)}
            />
          ) : (
            <PreviewCard report={selectedReport} />
          )}
          <SendCard
            key={`send-${selected?.key ?? 'none'}`}
            report={selectedReport}
            canSend={Boolean(status.data?.enabled && status.data?.configured)}
            sendRequest={sendNow}
            onShowHistory={(batchId) => {
              setExpandedBatch(batchId)
              document.getElementById('dlv-history')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
          />
        </div>
        <AutoSettingsCard onGenerated={(id) => setSelectedKey(`g:${id}`)} />
        <HistoryCard expanded={expandedBatch} onExpand={setExpandedBatch} canSend={Boolean(status.data?.enabled && status.data?.configured)} />
      </div>
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUploaded={(id) => {
            setSelectedKey(`r:${id}`)
            setShowUpload(false)
          }}
        />
      )}
    </>
  )
}

/** "이번 달 초안" = this cycle's auto drafts and their running/failed generations; the rest is "지난 보고서". */
function groupItems(reports: DeliveryReport[], generations: Generation[], month: string, names: Map<string, string>) {
  const current: ReportItem[] = []
  const past: ReportItem[] = []
  const liveEditions = new Set<string>()
  for (const report of reports) {
    const item: ReportItem = { key: `r:${report.id}`, kind: 'report', report }
    const live = report.review_status === 'pending' || report.review_status === 'approved'
    if (report.origin === 'auto' && report.report_month === month && live) {
      current.push(item)
      if (report.edition_id) liveEditions.add(report.edition_id)
    } else if (report.review_status !== 'superseded') {
      past.push(item)
    }
  }
  // The latest generation per edition for this month, when it is running or failed and has no live draft.
  const latest = new Map<string, Generation>()
  for (const g of generations) {
    if (g.report_month !== month || !g.edition_id) continue
    if (!latest.has(g.edition_id)) latest.set(g.edition_id, g)
  }
  for (const [editionId, g] of latest) {
    // mint-server#235 §1-3: decided after picking the latest, so an older failure does not come back.
    if (g.dismissed_at || liveEditions.has(editionId) || !(g.status === 'running' || g.status === 'failed' || g.status === 'skipped')) continue
    current.push({ key: `g:${g.id}`, kind: 'generation', generation: g, editionName: names.get(editionId) ?? '' })
  }
  return { current, past }
}

function Card({ title, aside, className, children, id }: { title: string; aside?: ReactNode; className?: string; children: ReactNode; id?: string }) {
  return (
    <section className={cx('card dlv-card', className)} aria-labelledby={`${id ?? className}-title`} id={id}>
      <div className="dlv-card-head">
        <h2 id={`${id ?? className}-title`}>{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

// --- 보고서 -------------------------------------------------------------------------------

const PAST_VISIBLE = 3

function ReportsCard({
  current,
  past,
  month,
  maxGenerations,
  loading,
  selectedKey,
  onSelect,
  onUpload,
  onChanged,
}: {
  current: ReportItem[]
  past: ReportItem[]
  month: string
  maxGenerations: number | null
  loading: boolean
  selectedKey: string | null
  onSelect: (key: string) => void
  onUpload: () => void
  onChanged: () => void
}) {
  const toast = useToast()
  const confirm = useConfirm()
  const qc = useQueryClient()
  const [showAllPast, setShowAllPast] = useState(false)
  const [infoId, setInfoId] = useState<string | null>(null)
  const infoReport = infoId ? ([...current, ...past].find((i) => i.kind === 'report' && i.report.id === infoId) ?? null) : null
  const dismiss = useMutation({
    mutationFn: dismissGeneration,
    onSuccess: () => {
      toast('목록에서 지웠습니다. 생성 기록과 이번 달 횟수는 그대로입니다.')
      void qc.invalidateQueries({ queryKey: ['delivery-generations'] })
    },
    onError: (e) => toast(apiErrorDetail(e) || '지우지 못했습니다.', 'err'),
  })
  const remove = useMutation({
    mutationFn: deleteDeliveryReport,
    onSuccess: () => {
      toast('보고서를 지웠습니다. 발송 기록은 남습니다.')
      onChanged()
      void qc.invalidateQueries({ queryKey: ['delivery-batches'] })
    },
    onError: (e) => toast(apiErrorDetail(e) || '지우지 못했습니다.', 'err'),
  })
  const download = (fn: () => Promise<void>) =>
    void fn().catch((e: unknown) => toast(apiErrorDetail(e) || '내려받지 못했습니다.', 'err'))

  async function requestRemove(report: DeliveryReport) {
    const ok = await confirm({
      title: `「${report.title}」 보고서를 지울까요?`,
      body: 'PDF와 메일 본문이 지워집니다. 발송 기록은 남지만 다시 보내기는 할 수 없습니다.',
      confirmLabel: '삭제',
      danger: true,
    })
    if (ok) remove.mutate(report.id)
  }

  async function requestDismiss(generationId: string, title: string) {
    const limit = maxGenerations === null ? '' : `(최대 ${maxGenerations}회)`
    const ok = await confirm({
      title: `「${title}」 실패 항목을 목록에서 지울까요?`,
      body: `보고서 목록에서만 사라집니다. 생성 기록은 남고, 이번 달 생성 횟수${limit}에도 그대로 들어갑니다. 다시 만들려면 자동 발송 카드의 지금 만들기를 쓰세요. 다시 만들다 실패하면 목록에 새로 나타납니다.`,
      confirmLabel: '지우기',
    })
    if (ok) dismiss.mutate(generationId)
  }

  const createdOn = current.find((i) => i.kind === 'report')
  const shownPast = showAllPast ? past : past.slice(0, PAST_VISIBLE)
  const row = (item: ReportItem) => {
    if (item.kind === 'generation') {
      const g = item.generation
      const state = g.status === 'running' ? 'generating' : 'failed'
      return (
        <li key={item.key} className={cx('dlv-report', item.key === selectedKey && 'is-selected')}>
          <button type="button" className="dlv-report-main" aria-pressed={item.key === selectedKey} onClick={() => onSelect(item.key)}>
            <span className="dlv-report-top">
              <strong>{draftTitle(month, item.editionName)}</strong>
              <StateText state={state} />
            </span>
            <span className="dlv-report-meta">
              {periodOfMonth(month)} · 월간 · {state === 'generating' ? `자동 생성 중 (${kstDateTime(g.created_at)} 시작)` : `자동 생성 실패 ${shortTime(g.finished_at ?? g.created_at)}`}
            </span>
            {state === 'generating' ? (
              <span className="dlv-report-meta">다 만들면 관리자에게 알립니다</span>
            ) : (
              <span className="dlv-report-meta dlv-report-reason" title={g.error ?? undefined}>
                사유: {g.error ?? '알 수 없음'}
              </span>
            )}
          </button>
          {state === 'failed' && (
            <OverflowMenu
              label={`${draftTitle(month, item.editionName)} 메뉴`}
              items={[
                {
                  key: 'dismiss',
                  label: '목록에서 지우기…',
                  disabled: dismiss.isPending,
                  onClick: () => void requestDismiss(g.id, draftTitle(month, item.editionName)),
                },
              ]}
            />
          )}
        </li>
      )
    }
    const report = item.report
    const state = reportState(report)
    const auto = report.origin === 'auto'
    const live = report.review_status === 'pending' || report.review_status === 'approved'
    return (
      <li key={item.key} className={cx('dlv-report', item.key === selectedKey && 'is-selected')}>
        <button type="button" className="dlv-report-main" aria-pressed={item.key === selectedKey} onClick={() => onSelect(item.key)}>
          <span className="dlv-report-top">
            <strong>{report.title}</strong>
            <StateText state={state} />
          </span>
          <span className="dlv-report-meta">
            <span className="dlv-wide-only">{formatPeriod(report.period_start, report.period_end)}</span>
            <span className="dlv-narrow-only">{formatPeriod(report.period_start, report.period_end, true)}</span>
            {' · '}
            {KIND_LABEL[report.kind]}
            {' · '}
            {auto ? `자동 생성` : '직접 올림'}
            <span className="dlv-wide-only"> {auto ? shortTime(report.created_at) : shortDate(report.created_at)}</span>
            {' · '}
            {formatSize(report.pdf_size)}
          </span>
          <span className="dlv-report-meta">{rowResult(report, live)}</span>
        </button>
        <OverflowMenu
          label={`${report.title} 메뉴`}
          items={[
            { key: 'info', label: reportEditRule(report).mode === 'none' ? '정보 보기…' : '정보 수정…', onClick: () => setInfoId(report.id) },
            { key: 'pdf', label: 'PDF 내려받기', onClick: () => download(() => downloadReportPdf(report)) },
            { key: 'html', label: '메일 본문 HTML 내려받기', onClick: () => download(() => downloadReportHtml(report)) },
            {
              key: 'delete',
              label: '삭제…',
              danger: true,
              disabled: remove.isPending || report.send_status === 'sending' || report.review_status === 'approved',
              onClick: () => void requestRemove(report),
            },
          ]}
        />
      </li>
    )
  }

  return (
    <Card
      title="보고서"
      className="dlv-reports"
      aside={
        <Btn variant="primary" size="sm" onClick={onUpload}>
          <span className="dlv-wide-only">보고서 </span>올리기
        </Btn>
      }
    >
      {loading ? (
        <p className="dlv-empty">불러오는 중…</p>
      ) : current.length + past.length === 0 ? (
        <p className="dlv-empty">아직 올린 보고서가 없습니다. PDF와 메일 본문 HTML을 올려 주세요.</p>
      ) : (
        <>
          {current.length > 0 && (
            <>
              <p className="dlv-group-label">
                이번 달 초안{createdOn?.kind === 'report' ? ` · ${shortDate(createdOn.report.created_at)} 자동 생성` : ''}
              </p>
              <ul className="dlv-report-list">{current.map(row)}</ul>
            </>
          )}
          {past.length > 0 && (
            <>
              {current.length > 0 && <p className="dlv-group-label">지난 보고서</p>}
              <ul className="dlv-report-list">{shownPast.map(row)}</ul>
              {past.length > PAST_VISIBLE && !showAllPast && (
                <button type="button" className="dlv-more" onClick={() => setShowAllPast(true)}>
                  지난 보고서 더 보기 ({past.length - PAST_VISIBLE}건) ▾
                </button>
              )}
            </>
          )}
        </>
      )}
      {infoReport?.kind === 'report' && <ReportInfoModal key={infoReport.report.id} report={infoReport.report} onClose={() => setInfoId(null)} />}
    </Card>
  )
}

function shortTime(iso: string): string {
  return kstShort(iso)
}

function periodOfMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return `${y}.${String(m).padStart(2, '0')}.01 ~ ${String(m).padStart(2, '0')}.${last}`
}

function rowResult(report: DeliveryReport, live: boolean): string {
  const sentCount = report.counts?.sent ?? 0
  if (report.send_status === 'sent' || report.send_status === 'partial') {
    return `${kstShort(report.last_sent_at ?? report.updated_at)} ${sentCount}명에게 보냄`
  }
  if (report.origin === 'auto') {
    if (report.review_status === 'pending') return `${kstDateTime(report.scheduled_at)} 발송 예정 · 승인해야 보냅니다`
    if (report.review_status === 'approved') return `${kstDateTime(report.scheduled_at)} 발송 예정 · ${kstShort(report.approved_at)} 승인`
    if (report.review_status === 'expired') {
      const due = kstDateTime(report.scheduled_at)
      return report.reviewed_note === '발송 시각까지 승인되지 않음' ? `${due}까지 승인하지 않아 보내지 않음` : `보내지 않음 (${report.reviewed_note ?? ''})`
    }
    if (report.review_status === 'rejected') return '버린 초안'
  }
  return live ? '' : '아직 보내지 않음'
}

function UploadModal({ onClose, onUploaded }: { onClose: () => void; onUploaded: (id: string) => void }) {
  const toast = useToast()
  const qc = useQueryClient()
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [kind, setKind] = useState<DeliveryReportKind>('monthly')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [pdf, setPdf] = useState<File | null>(null)
  const [html, setHtml] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const sizeError =
    pdf && pdf.size > PDF_MAX ? 'PDF는 10MB 이하만 올릴 수 있습니다.' : html && html.size > HTML_MAX ? '메일 본문 HTML은 200KB 이하만 올릴 수 있습니다.' : null
  const ready = Boolean(title.trim() && subject.trim() && start && end && pdf && html && !sizeError)

  const upload = useMutation({
    mutationFn: () =>
      uploadDeliveryReport({
        title: title.trim(),
        email_subject: subject.trim(),
        kind,
        period_start: start,
        period_end: end,
        pdf: pdf as File,
        email_html: html as File,
      }),
    onSuccess: (report) => {
      void qc.invalidateQueries({ queryKey: ['delivery-reports'] })
      toast(
        report.sanitize_notes.length
          ? `보고서를 올렸습니다. 본문에서 ${report.sanitize_notes.join(', ')}했습니다.`
          : '보고서를 올렸습니다.',
      )
      onUploaded(report.id)
    },
    onError: (e) => setError(apiErrorDetail(e) || '올리지 못했습니다.'),
  })

  return (
    <Modal
      title="보고서 올리기"
      onClose={onClose}
      footer={
        <>
          <Btn variant="outline" onClick={onClose}>
            취소
          </Btn>
          <Btn variant="primary" disabled={!ready || upload.isPending} onClick={() => upload.mutate()}>
            {upload.isPending ? '올리는 중…' : '올리기'}
          </Btn>
        </>
      }
    >
      <div className="field">
        <label htmlFor="dlv-title">보고서 이름</label>
        <input id="dlv-title" className="input" maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="전기차 충전 6개월 동향 보고서" />
      </div>
      <div className="field">
        <label htmlFor="dlv-subject">메일 제목</label>
        <input id="dlv-subject" className="input" maxLength={200} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="[MINT] 전기차 충전 6개월 동향 보고서" />
      </div>
      <div className="field">
        <label id="dlv-kind-label">종류</label>
        <div className="seg" role="radiogroup" aria-labelledby="dlv-kind-label">
          {(Object.keys(KIND_LABEL) as DeliveryReportKind[]).map((value) => (
            <button key={value} type="button" role="radio" aria-checked={kind === value} className={kind === value ? 'on' : undefined} onClick={() => setKind(value)}>
              {KIND_LABEL[value]}
            </button>
          ))}
        </div>
      </div>
      <div className="dlv-form-row">
        <div className="field">
          <label htmlFor="dlv-start">기간 시작</label>
          <input id="dlv-start" type="date" className="input" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="dlv-end">기간 끝</label>
          <input id="dlv-end" type="date" className="input" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="dlv-pdf">보고서 PDF (10MB 이하)</label>
        <input id="dlv-pdf" type="file" accept="application/pdf,.pdf" onChange={(e) => setPdf(e.target.files?.[0] ?? null)} />
      </div>
      <div className="field">
        <label htmlFor="dlv-html">메일 본문 HTML (200KB 이하)</label>
        <input id="dlv-html" type="file" accept="text/html,.html,.htm" onChange={(e) => setHtml(e.target.files?.[0] ?? null)} />
        <p className="dlv-hint">스크립트·외부 이미지·스타일 블록은 올릴 때 지워집니다. 미리보기에서 보이는 그대로 보냅니다.</p>
      </div>
      {(sizeError || error) && (
        <p className="source-form-field-error" role="alert">
          {sizeError || error}
        </p>
      )}
    </Modal>
  )
}

// --- 받는 사람 -----------------------------------------------------------------------------

type RecipientFilter = 'all' | 'on' | 'off'
const RECIPIENT_FILTERS: [RecipientFilter, string][] = [
  ['all', '전체'],
  ['on', '켜짐'],
  ['off', '꺼짐'],
]

function RecipientsCard() {
  const toast = useToast()
  const confirm = useConfirm()
  const qc = useQueryClient()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<RecipientFilter>('all')
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null)
  // The confirmed people are fixed when the dialog opens, so a refetch cannot change who is sent (§2-1).
  const [bulkTarget, setBulkTarget] = useState<{ on: boolean; people: Recipient[] } | null>(null)
  const recipients = useQuery({ queryKey: ['delivery-recipients'], queryFn: listRecipients })
  const list = recipients.data ?? []
  const activeCount = list.filter((r) => r.is_active).length
  // mint-server#235 §3-1: the list holds everyone (at most 500), so searching stays in the browser.
  const needle = query.trim().toLowerCase()
  const visible = list.filter((r) => {
    if (filter === 'on' && !r.is_active) return false
    if (filter === 'off' && r.is_active) return false
    return !needle || r.name.toLowerCase().includes(needle) || r.email.toLowerCase().includes(needle)
  })
  const narrowed = needle !== '' || filter !== 'all'
  const toOn = visible.filter((r) => !r.is_active).length
  const toOff = visible.length - toOn

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['delivery-recipients'] })
    void qc.invalidateQueries({ queryKey: ['delivery-status'] })
    void qc.invalidateQueries({ queryKey: ['delivery-preview'] })
  }
  // Several addresses pasted at once (comma / line / space separated) go through the bulk API.
  const isBulk = (email.match(/@/g)?.length ?? 0) > 1
  const add = useMutation({
    mutationFn: async () => {
      if (!isBulk) {
        await addRecipient(email.trim(), name.trim())
        return null
      }
      // Keep spaces inside "이름 <주소>"; otherwise spaces also separate addresses.
      return addRecipientsBulk(email.includes('<') ? email.replace(/;/g, '\n') : email.replace(/[;\s]+/g, '\n'))
    },
    onSuccess: (bulk) => {
      setEmail('')
      setName('')
      setError(null)
      refresh()
      if (bulk) {
        toast(
          `${bulk.added}명 추가 · 이미 있는 주소 ${bulk.duplicates}개 · 형식이 틀린 항목 ${bulk.invalid.length}개`,
          bulk.invalid.length ? 'err' : 'ok',
        )
      }
    },
    onError: (e) => setError(apiErrorDetail(e) || '추가하지 못했습니다.'),
  })
  const toggle = useMutation({
    mutationFn: (r: Recipient) => updateRecipient(r.id, { is_active: !r.is_active }),
    onSuccess: refresh,
    onError: (e) => toast(apiErrorDetail(e) || '바꾸지 못했습니다.', 'err'),
  })
  const rename = useMutation({
    mutationFn: ({ id, value }: { id: string; value: string }) => updateRecipient(id, { name: value.trim() }),
    onSuccess: () => {
      setEditing(null)
      refresh()
      toast('이름을 고쳤습니다.')
    },
    onError: (e) => toast(apiErrorDetail(e) || '이름을 고치지 못했습니다.', 'err'),
  })
  const bulk = useMutation({
    mutationFn: ({ on, people }: { on: boolean; people: Recipient[] }) => setRecipientsActive(people.map((r) => r.id), on),
    onSuccess: (result, { on }) => {
      setBulkTarget(null)
      refresh()
      toast(`${result.updated}명을 ${on ? '켰' : '껐'}습니다. 켜진 사람은 모두 ${result.active_recipients}명입니다.`)
    },
    onError: (e) => {
      setBulkTarget(null)
      refresh()
      toast(apiErrorDetail(e) || '바꾸지 못했습니다.', 'err')
    },
  })
  const remove = useMutation({
    mutationFn: (id: string) => deleteRecipient(id),
    onSuccess: refresh,
    onError: (e) => toast(apiErrorDetail(e) || '지우지 못했습니다.', 'err'),
  })

  async function requestRemove(r: Recipient) {
    const ok = await confirm({ title: `${r.name || r.email} 님을 받는 사람에서 지울까요?`, confirmLabel: '삭제', danger: true })
    if (ok) remove.mutate(r.id)
  }

  return (
    <Card title="받는 사람" className="dlv-recipients" aside={<span className="dlv-aside">켜짐 {activeCount} / {list.length}명</span>}>
      <form
        className="dlv-recipient-form"
        onSubmit={(e) => {
          e.preventDefault()
          if (email.trim()) add.mutate()
        }}
      >
        <input className="input" type="text" inputMode="email" aria-label="이메일 (여러 명은 쉼표로 구분)" placeholder="이메일" value={email} onChange={(e) => { setEmail(e.target.value); setError(null) }} />
        <input className="input" aria-label="이름 (선택)" placeholder="이름 (선택)" maxLength={64} value={name} disabled={isBulk} onChange={(e) => setName(e.target.value)} />
        <Btn variant="outline" type="submit" disabled={!email.trim() || add.isPending}>
          추가
        </Btn>
      </form>
      {error && (
        <p className="source-form-field-error" role="alert">
          {error}
        </p>
      )}
      {list.length > 0 && (
        <>
          <div className="dlv-recipient-tools">
            <input
              className="input"
              type="search"
              placeholder="이름 또는 주소로 찾기"
              aria-label="받는 사람 찾기"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setEditing(null)
              }}
            />
            <div className="seg" role="radiogroup" aria-label="켜짐 꺼짐 필터">
              {RECIPIENT_FILTERS.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={filter === value}
                  className={filter === value ? 'on' : undefined}
                  onClick={() => {
                    setFilter(value)
                    setEditing(null)
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="dlv-recipient-bulk">
            <span>{narrowed ? `${list.length}명 중 ${visible.length}명 표시` : `${list.length}명`}</span>
            <span className="dlv-recipient-bulk-actions">
              <Btn variant="outline" size="sm" disabled={!toOn || bulk.isPending} onClick={() => setBulkTarget({ on: true, people: visible })}>
                {narrowed ? '보이는 사람' : '전체'} 켜기 {toOn}명
              </Btn>
              <Btn variant="outline" size="sm" disabled={!toOff || bulk.isPending} onClick={() => setBulkTarget({ on: false, people: visible })}>
                {narrowed ? '보이는 사람' : '전체'} 끄기 {toOff}명
              </Btn>
            </span>
          </div>
        </>
      )}
      {visible.length > 0 && (
        <ul className={cx('dlv-recipient-list', !showAll && 'is-collapsed', visible.length > 8 && 'is-scroll')}>
          {visible.map((r) =>
            editing?.id === r.id ? (
              <li key={r.id} className="dlv-recipient is-editing">
                <input
                  className="input"
                  aria-label="이름"
                  maxLength={64}
                  autoFocus
                  value={editing.value}
                  onChange={(e) => setEditing({ id: r.id, value: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) rename.mutate(editing)
                    if (e.key === 'Escape') setEditing(null)
                  }}
                />
                <span className="dlv-mono">{r.email}</span>
                <Btn variant="primary" size="sm" disabled={rename.isPending} onClick={() => rename.mutate(editing)}>
                  저장
                </Btn>
                <Btn variant="outline" size="sm" onClick={() => setEditing(null)}>
                  취소
                </Btn>
              </li>
            ) : (
              <li key={r.id} className={cx('dlv-recipient', !r.is_active && 'is-off')}>
                <strong>{r.name || '이름 없음'}</strong>
                <span className="dlv-mono">{r.email}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={r.is_active}
                  aria-label={`${r.name || r.email} 받기`}
                  className={cx('switch', r.is_active && 'on')}
                  disabled={toggle.isPending}
                  onClick={() => toggle.mutate(r)}
                />
                <button type="button" className="dlv-text-btn" onClick={() => setEditing({ id: r.id, value: r.name })}>
                  수정
                </button>
                <button type="button" className="dlv-text-btn" onClick={() => void requestRemove(r)}>
                  삭제
                </button>
              </li>
            ),
          )}
        </ul>
      )}
      {visible.length > 4 && !showAll && (
        <button type="button" className="dlv-more dlv-narrow-only" onClick={() => setShowAll(true)}>
          {visible.length}명 중 4명 표시 · 모두 보기
        </button>
      )}
      {!list.length && !recipients.isLoading && <p className="dlv-empty">아직 받는 사람이 없습니다.</p>}
      {list.length > 0 && !visible.length && (
        <p className="dlv-empty">
          {needle ? (
            <>
              「{query.trim()}」에 맞는 {filter === 'on' ? '켜진 ' : filter === 'off' ? '꺼진 ' : ''}사람이 없습니다.{' '}
              <button type="button" className="dlv-text-btn" onClick={() => setQuery('')}>
                찾기 지우기
              </button>
            </>
          ) : filter === 'on' ? (
            '켜진 사람이 없습니다.'
          ) : (
            '꺼진 사람이 없습니다.'
          )}
        </p>
      )}
      <p className="dlv-hint dlv-wide-only">여러 명은 쉼표·줄바꿈·세미콜론·공백으로 구분해 한 번에 붙여넣을 수 있습니다. 이름을 함께 넣으려면 &quot;이름 &lt;주소&gt;&quot;를 쉼표나 줄바꿈으로 구분해 주세요. 꺼진 사람은 목록에 남지만 보내지 않습니다. 받는 사람은 서로의 주소를 볼 수 없게 한 사람씩 보냅니다.</p>
      {bulkTarget && (
        <BulkConfirm
          on={bulkTarget.on}
          total={list.length}
          activeCount={activeCount}
          visible={bulkTarget.people}
          narrowed={narrowed}
          condition={[needle && `「${query.trim()}」`, filter === 'on' ? '켜짐' : filter === 'off' ? '꺼짐' : ''].filter(Boolean).join(' · ')}
          pending={bulk.isPending}
          onClose={() => setBulkTarget(null)}
          onConfirm={() => bulk.mutate(bulkTarget)}
        />
      )}
    </Card>
  )
}

function BulkConfirm({
  on,
  total,
  activeCount,
  visible,
  narrowed,
  condition,
  pending,
  onClose,
  onConfirm,
}: {
  on: boolean
  total: number
  activeCount: number
  visible: Recipient[]
  narrowed: boolean
  condition: string
  pending: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  const change = visible.filter((r) => r.is_active !== on).length
  const same = visible.length - change
  const after = on ? activeCount + change : activeCount - change
  return (
    <Modal
      title={narrowed ? `보이는 사람 중 ${change}명을 ${on ? '켤' : '끌'}까요?` : `${on ? '꺼진' : '켜진'} ${change}명을 모두 ${on ? '켤' : '끌'}까요?`}
      onClose={onClose}
      footer={
        <>
          <Btn variant="outline" onClick={onClose}>
            취소
          </Btn>
          <Btn variant="primary" disabled={pending || !change} onClick={onConfirm}>
            {change}명 {on ? '켜기' : '끄기'}
          </Btn>
        </>
      }
    >
      <dl className="dlv-confirm">
        {narrowed && (
          <>
            <dt>찾은 조건</dt>
            <dd className="is-plain">{condition}</dd>
            <dt>보이는 사람</dt>
            <dd className="is-plain">{visible.length}명</dd>
          </>
        )}
        <dt>{on ? '새로 켜는' : '새로 끄는'} 사람</dt>
        <dd>{change}명</dd>
        {same > 0 && (
          <>
            <dt>이미 {on ? '켜진' : '꺼진'} 사람</dt>
            <dd className="is-plain">{same}명 (그대로)</dd>
          </>
        )}
        {narrowed && (
          <>
            <dt>나머지</dt>
            <dd className="is-plain">{total - visible.length}명 (바꾸지 않음)</dd>
          </>
        )}
        <dt>{on ? '켠' : '끈'} 뒤 켜진 사람</dt>
        <dd>{after}명</dd>
      </dl>
      <p className="dlv-hint">
        {on ? '' : '지금 켜고 꺼 둔 상태는 되돌릴 수 없습니다. '}
        승인한 초안과 지금 보내기는 보내는 시각에 켜져 있는 사람에게 갑니다. 이미 그 보고서를 받은 사람은 빠지므로 보내기 확인 창의 인원과 다를 수 있습니다.
      </p>
    </Modal>
  )
}

// --- 미리보기 -----------------------------------------------------------------------------

function PreviewCard({ report }: { report: DeliveryReport | null }) {
  const preview = useQuery({
    queryKey: ['delivery-preview', report?.id],
    queryFn: () => getMailPreview(report!.id),
    enabled: Boolean(report),
  })
  const data = preview.data
  return (
    <Card title="메일 미리보기" className="dlv-preview" aside={<span className="dlv-aside dlv-wide-only">선택한 보고서 기준</span>}>
      {!report ? (
        <p className="dlv-empty">보고서를 올리면 메일 모습을 미리 볼 수 있습니다.</p>
      ) : !data ? (
        <p className="dlv-empty">{preview.isError ? '미리보기를 불러오지 못했습니다.' : '불러오는 중…'}</p>
      ) : (
        <>
          <dl className="dlv-preview-head">
            <dt>보내는 사람</dt>
            <dd>{data.from_display ?? '발신 주소 설정 전'}</dd>
            <dt>받는 사람</dt>
            <dd>
              켜진 {data.active_recipients}명<span className="dlv-wide-only"> (한 사람씩 따로 받음)</span>
            </dd>
            <dt>제목</dt>
            <dd className="dlv-strong">{data.subject}</dd>
            <dt>첨부</dt>
            <dd>
              {data.attachment.filename}
              <span className="dlv-wide-only"> · {formatSize(data.attachment.size_bytes)}</span>
            </dd>
          </dl>
          {/* sandbox="" = no scripts, forms, popups or same-origin access; the server adds a CSP meta too. */}
          <iframe className="dlv-preview-frame" title="메일 본문 미리보기" sandbox="" referrerPolicy="no-referrer" srcDoc={data.html} />
        </>
      )}
    </Card>
  )
}

// --- 보내기 -------------------------------------------------------------------------------

function useBatchProgress(batchId: string | null | undefined) {
  return useQuery({
    queryKey: ['delivery-batch', batchId],
    queryFn: () => getBatch(batchId!),
    enabled: Boolean(batchId),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return !status || status === 'queued' || status === 'sending' ? 3000 : false
    },
  })
}

function SendCard({
  report,
  canSend,
  sendRequest,
  onShowHistory,
}: {
  report: DeliveryReport | null
  canSend: boolean
  sendRequest: number
  onShowHistory: (batchId: string) => void
}) {
  const toast = useToast()
  const qc = useQueryClient()
  const myEmail = useAuthStore((s) => s.user?.email)
  const [confirmPreview, setConfirmPreview] = useState<SendPreview | null>(null)
  const [runningId, setRunningId] = useState<string | null>(null)
  const detail = useQuery({
    queryKey: ['delivery-report', report?.id],
    queryFn: () => getDeliveryReport(report!.id),
    enabled: Boolean(report),
  })
  const activeId = runningId ?? detail.data?.active_batch?.id ?? null
  const progress = useBatchProgress(activeId)
  const running = progress.data && (progress.data.status === 'queued' || progress.data.status === 'sending') ? progress.data : null

  // When a batch ends, refresh everything that shows its result (once per batch).
  const settledRef = useRef<string | null>(null)
  useEffect(() => {
    if (activeId && progress.data && !running && settledRef.current !== activeId) {
      settledRef.current = activeId
      void qc.invalidateQueries({ queryKey: ['delivery-report', report?.id] })
      void qc.invalidateQueries({ queryKey: ['delivery-batches'] })
      void qc.invalidateQueries({ queryKey: ['delivery-reports'] })
      void qc.invalidateQueries({ queryKey: ['delivery-preview'] })
    }
  }, [activeId, progress.data, running, qc, report?.id])

  const preview = useMutation({
    mutationFn: () => getSendPreview(report!.id),
    onSuccess: (data) => (data.count ? setConfirmPreview(data) : toast('보낼 사람이 없습니다. 켜진 사람이 모두 이미 받았습니다.', 'err')),
    onError: (e) => toast(apiErrorDetail(e) || '받는 사람을 확인하지 못했습니다.', 'err'),
  })
  // #232 §6-1: an auto draft can be sent by hand only after its deadline (expired), with the
  // content hash of the preview the admin reviewed.
  const autoDraft = report?.origin === 'auto'
  const directSendable = !autoDraft || report?.review_status === 'expired'
  const mailPreview = useQuery({
    queryKey: ['delivery-preview', report?.id],
    queryFn: () => getMailPreview(report!.id),
    enabled: Boolean(report && autoDraft),
  })
  const requestedRef = useRef(sendRequest)
  useEffect(() => {
    if (sendRequest !== requestedRef.current) {
      requestedRef.current = sendRequest
      if (report && directSendable && canSend) preview.mutate()
    }
  })
  const send = useMutation({
    mutationFn: (digest: string) => sendReport(report!.id, digest, autoDraft ? mailPreview.data?.content_hash : undefined),
    onSuccess: (started) => {
      setConfirmPreview(null)
      setRunningId(started.batch_id)
      void qc.invalidateQueries({ queryKey: ['delivery-batches'] })
    },
    onError: (e) => {
      setConfirmPreview(null)
      if (apiErrorCode(e) === 'recipients_changed') {
        toast('받는 사람이 바뀌었습니다. 다시 확인해 주세요.', 'err')
        preview.mutate()
        return
      }
      if (apiErrorCode(e) === 'content_changed') {
        toast('보고서 내용이 바뀌었습니다. 미리보기를 다시 확인해 주세요.', 'err')
        void qc.invalidateQueries({ queryKey: ['delivery-preview', report?.id] })
        return
      }
      toast(apiErrorDetail(e) || '보내지 못했습니다.', 'err')
    },
  })
  const test = useMutation({
    mutationFn: () => sendTest(report!.id),
    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: ['delivery-batches'] })
      if (result.status === 'sent') toast(`테스트 메일을 ${result.to}로 보냈습니다.`)
      else toast(`테스트 메일: ${result.error_label ?? '확인 필요'}`, 'err')
    },
    onError: (e) => toast(apiErrorDetail(e) || '테스트 발송을 하지 못했습니다.', 'err'),
  })
  const cancel = useMutation({
    mutationFn: () => cancelBatch(activeId!),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['delivery-batch', activeId] }),
  })

  const last = detail.data?.last_batch ?? null
  const disabled = !report || !canSend

  return (
    <Card title="보내기" className="dlv-send">
      <div className="dlv-send-actions">
        <Btn variant="outline" disabled={disabled || Boolean(running) || test.isPending} onClick={() => test.mutate()}>
          {test.isPending ? '보내는 중…' : '나에게 테스트 발송'}
        </Btn>
        <Btn
          variant="primary"
          disabled={disabled || Boolean(running) || preview.isPending || !directSendable || (autoDraft && !mailPreview.data)}
          onClick={() => preview.mutate()}
        >
          {running ? '보내는 중…' : '지금 보내기'}
        </Btn>
      </div>
      {autoDraft && !directSendable && (
        <p className="dlv-hint">초안은 승인하면 발송 예정 시각에 자동으로 갑니다. 지금 보내기는 기한이 지난 초안과 직접 올린 보고서에만 쓸 수 있습니다.</p>
      )}
      {running ? (
        <div className="dlv-progress" role="status">
          <div className="dlv-progress-bar" aria-hidden="true">
            <span style={{ width: `${running.total ? (running.done / running.total) * 100 : 0}%` }} />
          </div>
          <strong>
            보내는 중 {running.done} / {running.total}명
          </strong>
          <p>창을 닫아도 서버에서 계속 보냅니다. 끝나면 발송 기록에 남습니다.</p>
          <button type="button" className="dlv-text-btn" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
            발송 중지
          </button>
        </div>
      ) : (
        <>
          {myEmail && <p className="dlv-hint">테스트는 로그인한 내 주소({myEmail})로만 갑니다.</p>}
          {last && <LastBatch batch={last} onShowHistory={onShowHistory} />}
        </>
      )}
      {confirmPreview && report && (
        <SendConfirm
          title="이 보고서를 지금 보낼까요?"
          reportTitle={report.title}
          preview={confirmPreview}
          countNote="켜진 사람만"
          pending={send.isPending}
          onClose={() => setConfirmPreview(null)}
          onConfirm={() => send.mutate(confirmPreview.digest)}
        />
      )}
    </Card>
  )
}

function LastBatch({ batch, onShowHistory }: { batch: BatchProgress; onShowHistory: (id: string) => void }) {
  const failed = failedCount(batch)
  const when = kstShort(batch.finished_at ?? batch.created_at)
  if (!failed && !batch.unknown && batch.status === 'done') {
    return (
      <div className="dlv-last is-ok">
        <strong>
          ✓ {batch.sent}명 모두 보냈습니다 · {when}
        </strong>
        <p>발송 기록에 남았습니다.</p>
      </div>
    )
  }
  const first = batch.failures[0]
  return (
    <div className="dlv-last is-bad">
      <strong>
        ! {batch.sent}명 보냄{failed ? ` · ${failed}명 실패` : ''}
        {batch.unknown ? ` · ${batch.unknown}명 확인 필요` : ''} · {when}
      </strong>
      {first && (
        <p>
          {first.email} · {first.error_label ?? '실패'}
        </p>
      )}
      <Btn variant="outline" size="sm" onClick={() => onShowHistory(batch.id)}>
        발송 기록에서 보기
      </Btn>
    </div>
  )
}

function SendConfirm({
  title,
  reportTitle,
  preview,
  countNote,
  pending,
  onClose,
  onConfirm,
}: {
  title: string
  reportTitle: string
  preview: SendPreview
  countNote: string
  pending: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Btn variant="outline" onClick={onClose}>
            취소
          </Btn>
          <Btn variant="primary" disabled={pending} onClick={onConfirm}>
            {pending ? '보내는 중…' : `${preview.count}명에게 보내기`}
          </Btn>
        </>
      }
    >
      <dl className="dlv-confirm">
        <dt>보고서</dt>
        <dd>{reportTitle}</dd>
        <dt>받는 사람</dt>
        <dd>
          {preview.count}명 ({countNote})
        </dd>
        <dt>첨부</dt>
        <dd>{preview.attachment.filename}</dd>
      </dl>
      <p className="dlv-hint">보낸 메일은 되돌릴 수 없습니다. 한 사람씩 따로 보내므로 서로의 주소는 보이지 않습니다.</p>
    </Modal>
  )
}

// --- 발송 기록 ------------------------------------------------------------------------------

function HistoryCard({ expanded, onExpand, canSend }: { expanded: string | null; onExpand: (id: string | null) => void; canSend: boolean }) {
  const [hideTest, setHideTest] = useState(false)
  const batches = useInfiniteQuery({
    queryKey: ['delivery-batches', hideTest],
    queryFn: ({ pageParam }) => listBatches(hideTest, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => (last.length > BATCH_PAGE ? last[BATCH_PAGE - 1].created_at : undefined),
    refetchInterval: (query) =>
      query.state.data?.pages.some((page) => page.some((b) => b.status === 'queued' || b.status === 'sending')) ? 3000 : false,
  })
  const list = (batches.data?.pages ?? []).flatMap((page) => page.slice(0, BATCH_PAGE))
  return (
    <Card
      title="발송 기록"
      className="dlv-history"
      id="dlv-history"
      aside={
        <span className="dlv-history-tools">
          <label className="dlv-check">
            <input type="checkbox" checked={hideTest} onChange={(e) => setHideTest(e.target.checked)} />
            테스트 숨기기
          </label>
          <span className="dlv-aside">{list.length}건 표시</span>
        </span>
      }
    >
      {!list.length ? (
        <p className="dlv-empty">{batches.isLoading ? '불러오는 중…' : hideTest ? '테스트 말고 보낸 기록이 아직 없습니다.' : '아직 보낸 기록이 없습니다.'}</p>
      ) : (
        <div className="dlv-history-table" role="table" aria-label="발송 기록">
          <div className="dlv-history-row is-head" role="row">
            <span role="columnheader">보낸 시각</span>
            <span role="columnheader">보고서</span>
            <span role="columnheader">방식</span>
            <span role="columnheader">받는 사람</span>
            <span role="columnheader">결과</span>
            <span role="columnheader" className="sr-only">
              펼치기
            </span>
          </div>
          {list.map((batch) => {
            const result = resultLabel(batch)
            const hasDetail = batch.kind !== 'test' && batch.total > 0
            const open = expanded === batch.id
            return (
              <Fragment key={batch.id}>
                <div className="dlv-history-row" role="row">
                  <span role="cell" className="dlv-history-when">
                    {kstShort(batch.created_at)}
                  </span>
                  <span role="cell" className="dlv-history-title">
                    {batch.report_title}
                    {batch.kind === 'test' && ' (테스트)'}
                    {batch.kind === 'retry' && ' (다시 보내기)'}
                  </span>
                  <span role="cell" className="dlv-history-trigger">
                    {batch.trigger === 'schedule' ? '자동' : '직접'}
                  </span>
                  <span role="cell" className="dlv-history-count">
                    {batch.kind === 'test' ? '나에게' : `${batch.total}명`}
                  </span>
                  <span role="cell" className={cx('dlv-history-result', result.bad ? 'is-bad' : 'is-ok')}>
                    {result.text}
                  </span>
                  <span role="cell" className="dlv-history-toggle">
                    {hasDetail && (
                      <button type="button" className="dlv-text-btn" aria-expanded={open} onClick={() => onExpand(open ? null : batch.id)}>
                        {open ? '접기 ▴' : '펼치기 ▾'}
                      </button>
                    )}
                  </span>
                </div>
                {open && <HistoryDetail batch={batch} canSend={canSend} />}
              </Fragment>
            )
          })}
        </div>
      )}
      {batches.hasNextPage && (
        <button type="button" className="dlv-more" disabled={batches.isFetchingNextPage} onClick={() => void batches.fetchNextPage()}>
          {batches.isFetchingNextPage ? '불러오는 중…' : '이전 기록 더 보기 ▾'}
        </button>
      )}
    </Card>
  )
}

function HistoryDetail({ batch, canSend }: { batch: Batch; canSend: boolean }) {
  const toast = useToast()
  const qc = useQueryClient()
  const [confirmPreview, setConfirmPreview] = useState<SendPreview | null>(null)
  const [find, setFind] = useState('')
  // The list polls while a batch is open, so its progress in the key keeps this detail current.
  const detail = useQuery({
    queryKey: ['delivery-batch-deliveries', batch.id, batch.status, batch.done],
    queryFn: () => getBatchDeliveries(batch.id),
    placeholderData: (previous) => previous,
  })
  const preview = useMutation({
    mutationFn: () => getRetryPreview(batch.id),
    onSuccess: (data) => (data.count ? setConfirmPreview(data) : toast('다시 보낼 사람이 없습니다.', 'err')),
    onError: (e) => toast(apiErrorDetail(e) || '다시 보낼 사람을 확인하지 못했습니다.', 'err'),
  })
  const retry = useMutation({
    mutationFn: (digest: string) => retryBatch(batch.id, digest),
    onSuccess: () => {
      setConfirmPreview(null)
      toast('실패한 사람에게 다시 보내기 시작했습니다. 창을 닫아도 서버에서 계속 보냅니다.')
      void qc.invalidateQueries({ queryKey: ['delivery-batches'] })
      void qc.invalidateQueries({ queryKey: ['delivery-report'] })
      void qc.invalidateQueries({ queryKey: ['delivery-batch-deliveries', batch.id] })
    },
    onError: (e) => {
      setConfirmPreview(null)
      if (apiErrorCode(e) === 'recipients_changed') {
        toast('다시 보낼 사람이 바뀌었습니다. 다시 확인해 주세요.', 'err')
        preview.mutate()
        return
      }
      toast(apiErrorDetail(e) || '다시 보내지 못했습니다.', 'err')
    },
  })
  const data = detail.data
  if (!data) return <div className="dlv-history-detail">불러오는 중…</div>
  const reportDeleted = !batch.report_id
  const needle = find.trim().toLowerCase()
  const match = (r: { name: string; email: string }) => !needle || r.name.toLowerCase().includes(needle) || r.email.toLowerCase().includes(needle)
  const inProgress = (status: string) => status === 'queued' || status === 'sending'
  const waiting = data.not_received.filter((r) => inProgress(r.status))
  const failed = data.not_received.filter((r) => !inProgress(r.status))
  const received = [...data.received].sort((a, b) => Number(!a.name) - Number(!b.name) || a.name.localeCompare(b.name, 'ko') || a.email.localeCompare(b.email))
  const shownReceived = received.filter(match)
  const shownFailed = failed.filter(match)
  const shownWaiting = waiting.filter(match)
  const noMatch = <p className="dlv-empty">찾는 사람이 이 목록에 없습니다.</p>
  return (
    <div className="dlv-history-detail">
      {data.received.length + data.not_received.length > 20 && (
        <input
          className="input dlv-history-find"
          type="search"
          placeholder="이 발송에서 이름 또는 주소로 찾기"
          aria-label="이 발송에서 찾기"
          value={find}
          onChange={(e) => setFind(e.target.value)}
        />
      )}
      {failed.length > 0 && (
        <div className="dlv-history-detail-group">
          <strong className="dlv-history-detail-title">받지 못한 사람 {failed.length}명</strong>
          {shownFailed.length ? (
            <ul>
              {shownFailed.map((r, i) => (
                <li key={`${r.email}-${i}`}>
                  <strong>{r.name || '이름 없음'}</strong>
                  <span className="dlv-mono">{r.email}</span>
                  <span className={r.status === 'unknown' ? 'dlv-warn' : 'dlv-error'}>{r.error_label ?? (r.status === 'unknown' ? '확인 필요' : '실패')}</span>
                </li>
              ))}
            </ul>
          ) : (
            noMatch
          )}
          <Btn
            variant="outline"
            size="sm"
            disabled={!canSend || reportDeleted || data.retry_count === 0 || preview.isPending}
            onClick={() => preview.mutate()}
          >
            실패한 {data.retry_count}명에게 다시 보내기
          </Btn>
          {reportDeleted ? (
            <p className="dlv-hint">보고서가 지워져 다시 보낼 수 없습니다.</p>
          ) : (
            data.retry_count < failed.length && <p className="dlv-hint">결과 확인이 필요하거나 꺼진·지워진 사람, 이미 받은 사람은 다시 보내지 않습니다.</p>
          )}
        </div>
      )}
      {waiting.length > 0 && (
        <div className="dlv-history-detail-group">
          <strong className="dlv-history-detail-title">아직 보내는 중 {waiting.length}명</strong>
          {shownWaiting.length ? (
            <ul className={shownWaiting.length > 8 ? 'is-scroll' : undefined}>
              {shownWaiting.map((r, i) => (
                <li key={`${r.email}-${i}`}>
                  <strong>{r.name || '이름 없음'}</strong>
                  <span className="dlv-mono">{r.email}</span>
                  <span className="dlv-history-sent">보내는 중</span>
                </li>
              ))}
            </ul>
          ) : (
            noMatch
          )}
        </div>
      )}
      {(received.length > 0 || (!failed.length && !waiting.length)) && (
        <div className="dlv-history-detail-group">
          <strong className="dlv-history-detail-title">
            받은 사람 {received.length}명{needle ? ` 중 ${shownReceived.length}명 표시` : ''}
          </strong>
          {shownReceived.length ? (
            <ul className={shownReceived.length > 8 ? 'is-scroll' : undefined}>
              {shownReceived.map((r, i) => (
                <li key={`${r.email}-${i}`} className="is-received">
                  <strong>{r.name || '이름 없음'}</strong>
                  <span className="dlv-mono">{r.email}</span>
                  <span className="dlv-history-sent">{kstShort(r.sent_at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            noMatch
          )}
        </div>
      )}
      {confirmPreview && (
        <SendConfirm
          title={`실패한 ${confirmPreview.count}명에게 다시 보낼까요?`}
          reportTitle={batch.report_title}
          preview={confirmPreview}
          countNote="이 발송에서 받지 못한 사람"
          pending={retry.isPending}
          onClose={() => setConfirmPreview(null)}
          onConfirm={() => retry.mutate(confirmPreview.digest)}
        />
      )}
    </div>
  )
}
