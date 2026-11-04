import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import {
  approveDraft,
  downloadReportPdf,
  generateReport,
  getAutoSettings,
  getMailPreview,
  listAllDeliveryReports,
  listDeliveryReports,
  listGenerations,
  rejectDraft,
  saveAutoSettings,
  type AutoSettings,
  type DeliveryReport,
  type Generation,
} from '../../api/deliveryApi'
import { apiErrorDetail } from '../../utils/apiError'
import { cx } from '../../utils/cx'
import { Btn } from '../common/Btn'
import { Modal } from '../common/Modal'
import { useToast } from '../common/Toast'
import {
  STATE_LABEL,
  draftTitle,
  generationBlock,
  kstDateTime,
  monthLabel,
  reportState,
  scheduleGapMinutes,
  sendTimePassed,
  targetMonth,
  topicParticle,
  type AutoState,
} from './autoReportState'

/** mint-server#232 — 자동 생성 초안 검토와 자동 발송 설정 (Design 시안 E1~E5·M1, 승인 2026-11-03). */

export function StateText({ state }: { state: AutoState }) {
  if (!state) return null
  return <span className={cx('dlv-state', `is-${state}`)}>{STATE_LABEL[state]}</span>
}

function Row({ label, children, strong }: { label: string; children: ReactNode; strong?: boolean }) {
  return (
    <>
      <dt>{label}</dt>
      <dd className={strong ? 'dlv-strong' : undefined}>{children}</dd>
    </>
  )
}

// --- 초안 검토 (시안 E1·E3) -----------------------------------------------------------------

export function ReviewCard({
  report,
  generation,
  editionName,
  activeRecipients,
  scheduledFor,
  onSendNow,
  onSelectReport,
}: {
  report: DeliveryReport | null
  generation: Generation | null
  editionName: string
  activeRecipients: number
  scheduledFor: string | null
  onSendNow: () => void
  onSelectReport: (id: string) => void
}) {
  const toast = useToast()
  const qc = useQueryClient()
  const [dialog, setDialog] = useState<'approve' | 'reject' | 'regenerate' | null>(null)
  const [reasonOpen, setReasonOpen] = useState(false)
  const failReason = generation?.error ?? '알 수 없음'
  const preview = useQuery({
    queryKey: ['delivery-preview', report?.id],
    queryFn: () => getMailPreview(report!.id),
    enabled: Boolean(report),
  })
  const state: AutoState = report ? reportState(report) : generation?.status === 'running' ? 'generating' : 'failed'
  const month = report?.report_month ?? generation?.report_month ?? ''
  const title = report?.title ?? draftTitle(month, editionName)
  const editionId = report?.edition_id ?? generation?.edition_id ?? null
  const refresh = () => {
    for (const key of ['delivery-reports', 'delivery-generations', 'delivery-report', 'delivery-preview', 'delivery-auto-settings']) {
      void qc.invalidateQueries({ queryKey: [key] })
    }
  }
  const approve = useMutation({
    mutationFn: () => approveDraft(report!.id, preview.data!.content_hash),
    onSuccess: () => {
      setDialog(null)
      toast('승인했습니다. 발송 예정 시각에 자동으로 보냅니다.')
      refresh()
    },
    onError: (e) => {
      setDialog(null)
      toast(apiErrorDetail(e) || '승인하지 못했습니다.', 'err')
      refresh()
    },
  })
  const reject = useMutation({
    mutationFn: () => rejectDraft(report!.id),
    onSuccess: () => {
      setDialog(null)
      toast('초안을 버렸습니다. 이 분야는 이번 달 자동으로 보내지 않습니다.')
      refresh()
    },
    onError: (e) => toast(apiErrorDetail(e) || '버리지 못했습니다.', 'err'),
  })
  const regenerate = useMutation({
    mutationFn: () => generateReport(editionId!, month),
    onSuccess: () => {
      setDialog(null)
      toast('초안을 다시 만들고 있습니다. 다 만들면 관리자에게 알립니다.')
      refresh()
    },
    onError: (e) => {
      setDialog(null)
      toast(apiErrorDetail(e) || '다시 만들지 못했습니다.', 'err')
    },
  })
  const pdf = () => report && void downloadReportPdf(report).catch((e: unknown) => toast(apiErrorDetail(e) || '열지 못했습니다.', 'err'))
  const sendAt = report?.scheduled_at ?? scheduledFor

  return (
    <section className="card dlv-card dlv-preview dlv-review" aria-labelledby="dlv-review-title">
      <div className="dlv-card-head">
        <h2 id="dlv-review-title">초안 검토</h2>
        <StateText state={state} />
      </div>
      <dl className="dlv-preview-head">
        <Row label="보고서" strong>
          {title}
        </Row>
        {state === 'generating' && <Row label="시작">{kstDateTime(generation?.created_at)} 자동 생성</Row>}
        {state === 'failed' && !report && <Row label="실패 시각">{kstDateTime(generation?.finished_at ?? generation?.created_at)}</Row>}
        {report && state !== 'approved' && <Row label="만든 시각">{kstDateTime(report.created_at)} 자동 생성</Row>}
        {report && state === 'approved' && <Row label="승인">{kstDateTime(report.approved_at)}</Row>}
        {state !== 'generating' && (
          <Row label="발송 예정" strong={state === 'pending'}>
            {kstDateTime(sendAt)}
            {state === 'expired' ? ' (지남)' : ` · 켜진 ${activeRecipients}명`}
          </Row>
        )}
        {state === 'expired' && <Row label="결과">{report?.reviewed_note === '발송 시각까지 승인되지 않음' ? '승인하지 않아 보내지 않음' : `보내지 않음 (${report?.reviewed_note ?? ''})`}</Row>}
      </dl>
      <div className="dlv-review-note">
        {state === 'pending' && <p>발송 예정 시각까지 승인하지 않으면 보내지 않습니다.</p>}
        {state === 'approved' && <p>정한 시각에 자동으로 보냅니다. 보내지 않으려면 초안을 버리거나 자동 발송을 끄세요.</p>}
        {state === 'expired' && <p>발송 시각까지 승인하지 않아 보내지 않았습니다. 내용을 확인한 뒤 지금 보내기로 직접 보낼 수 있습니다.</p>}
        {state === 'rejected' && <p>버린 초안입니다. 이 분야는 이번 달 자동으로 보내지 않습니다.</p>}
        {state === 'superseded' && <p>다시 만들어 새 초안으로 바뀌었습니다.</p>}
        {state === 'generating' && (
          <>
            <p>초안을 만들고 있습니다. 보통 몇 분 걸립니다. 창을 닫아도 서버에서 계속 만듭니다. 다 만들면 관리자에게 알립니다.</p>
            <div className="dlv-progress-bar is-indeterminate" aria-hidden="true">
              <span />
            </div>
          </>
        )}
        {state === 'failed' && (
          <>
            <p>초안을 만들지 못했습니다.</p>
            <p className={reasonOpen ? undefined : 'dlv-reason-clamp'}>
              <span className="dlv-error">사유: {failReason}</span>
            </p>
            {failReason.length > 120 && (
              <p>
                <button type="button" className="dlv-text-btn" aria-expanded={reasonOpen} onClick={() => setReasonOpen((v) => !v)}>
                  {reasonOpen ? '접기 ▴' : '전체 보기 ▾'}
                </button>
              </p>
            )}
            <p>발송 예정 시각 전에 다시 만들고 승인해야 보냅니다.</p>
          </>
        )}
      </div>
      {report && !preview.data && (
        <p className="dlv-empty" role={preview.isError ? 'alert' : undefined}>
          {preview.isError ? (
            <>
              미리보기를 불러오지 못해 승인·보내기를 할 수 없습니다.{' '}
              <button type="button" className="dlv-text-btn" onClick={() => void preview.refetch()}>
                다시 불러오기
              </button>
            </>
          ) : (
            '미리보기를 불러오는 중…'
          )}
        </p>
      )}
      {report && preview.data && (
        <>
          <dl className="dlv-preview-head">
            <Row label="보내는 사람">{preview.data.from_display ?? '발신 주소 설정 전'}</Row>
            <Row label="제목" strong>
              {preview.data.subject}
            </Row>
            <Row label="첨부">
              <span className="dlv-attach">
                <span>
                  {preview.data.attachment.filename} · {formatBytes(preview.data.attachment.size_bytes)}
                </span>
                <Btn variant="outline" size="sm" onClick={pdf}>
                  PDF 열기
                </Btn>
              </span>
            </Row>
          </dl>
          {/* sandbox="" = no scripts, forms, popups or same-origin access; the server adds a CSP meta too. */}
          <iframe className="dlv-preview-frame" title="메일 본문 미리보기" sandbox="" referrerPolicy="no-referrer" srcDoc={preview.data.html} />
        </>
      )}
      <div className="dlv-review-actions">
        {(state === 'pending' || state === 'generating') && (
          <>
            <Btn variant="outline" disabled={state === 'generating' || regenerate.isPending} onClick={() => setDialog('regenerate')}>
              다시 만들기
            </Btn>
            <Btn variant="outline" disabled={state === 'generating'} onClick={() => setDialog('reject')}>
              버리기…
            </Btn>
            <Btn variant="primary" className="dlv-push" disabled={state === 'generating' || !preview.data} onClick={() => setDialog('approve')}>
              승인
            </Btn>
          </>
        )}
        {state === 'failed' && (
          <Btn variant="primary" disabled={!editionId || regenerate.isPending} onClick={() => regenerate.mutate()}>
            다시 만들기
          </Btn>
        )}
        {state === 'approved' && (
          <>
            <Btn variant="outline" onClick={pdf}>
              PDF 열기
            </Btn>
            <Btn variant="outline" className="dlv-push" onClick={() => setDialog('reject')}>
              버리기…
            </Btn>
          </>
        )}
        {state === 'expired' && (
          <>
            <Btn variant="outline" onClick={pdf}>
              PDF 열기
            </Btn>
            <Btn variant="outline" onClick={() => setDialog('reject')}>
              버리기…
            </Btn>
            <Btn variant="primary" className="dlv-push" onClick={onSendNow}>
              지금 보내기…
            </Btn>
          </>
        )}
        {state === 'superseded' && report && (
          <Btn variant="outline" onClick={() => onSelectReport('')}>
            새 초안 보기
          </Btn>
        )}
      </div>
      {state === 'pending' && <p className="dlv-hint">다시 만들기: 같은 기간으로 초안을 새로 만듭니다. 버리기: 이 분야는 이번 달 자동으로 보내지 않습니다.</p>}

      {dialog === 'approve' && report && preview.data && (
        <Modal
          title="이 초안을 승인할까요?"
          onClose={() => setDialog(null)}
          footer={
            <>
              <Btn variant="outline" onClick={() => setDialog(null)}>
                취소
              </Btn>
              <Btn variant="primary" disabled={approve.isPending} onClick={() => approve.mutate()}>
                승인
              </Btn>
            </>
          }
        >
          <dl className="dlv-confirm">
            <dt>보고서</dt>
            <dd>{report.title}</dd>
            <dt>발송 예정</dt>
            <dd>{kstDateTime(report.scheduled_at)}</dd>
            <dt>받는 사람</dt>
            <dd>켜진 {activeRecipients}명 (발송 시각에 켜져 있는 사람)</dd>
            <dt>첨부</dt>
            <dd>{preview.data.attachment.filename}</dd>
          </dl>
          <p className="dlv-hint">승인하면 발송 예정 시각에 자동으로 보냅니다. 승인 뒤 보내지 않으려면 초안을 버리거나 자동 발송을 끄세요.</p>
        </Modal>
      )}
      {dialog === 'reject' && report && (
        <Modal
          title="이 초안을 버릴까요?"
          onClose={() => setDialog(null)}
          footer={
            <>
              <Btn variant="outline" onClick={() => setDialog(null)}>
                취소
              </Btn>
              <Btn variant="primary" disabled={reject.isPending} onClick={() => reject.mutate()}>
                버리기
              </Btn>
            </>
          }
        >
          <dl className="dlv-confirm">
            <dt>보고서</dt>
            <dd>{report.title}</dd>
            <dt>발송 예정</dt>
            <dd>보내지 않음 (원래 {kstDateTime(report.scheduled_at)})</dd>
          </dl>
          <p className="dlv-hint">초안을 지웁니다. 이 분야는 이번 달 자동으로 보내지 않습니다. 필요하면 보고서 올리기로 직접 올려 보낼 수 있습니다.</p>
        </Modal>
      )}
      {dialog === 'regenerate' && (
        <Modal
          title="초안을 다시 만들까요?"
          onClose={() => setDialog(null)}
          footer={
            <>
              <Btn variant="outline" onClick={() => setDialog(null)}>
                취소
              </Btn>
              <Btn variant="primary" disabled={regenerate.isPending} onClick={() => regenerate.mutate()}>
                다시 만들기
              </Btn>
            </>
          }
        >
          <dl className="dlv-confirm">
            <dt>보고서</dt>
            <dd>{title}</dd>
            {report && (
              <>
                <dt>기간</dt>
                <dd>
                  {report.period_start.replaceAll('-', '.')} ~ {report.period_end.slice(5).replace('-', '.')}
                </dd>
              </>
            )}
          </dl>
          <p className="dlv-hint">
            같은 기간으로 새로 만듭니다. 다 만들면 지금 초안을 대신하고, 다시 검토해야 합니다.
            {sendAt ? ` 발송 예정 ${kstDateTime(sendAt)}은 그대로입니다.` : ''}
          </p>
        </Modal>
      )}
    </section>
  )
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`
  return `${Math.max(1, Math.round(bytes / 1024))}KB`
}

// --- 자동 발송 설정 (시안 E1·E5) --------------------------------------------------------------

const DAYS = Array.from({ length: 28 }, (_, i) => i + 1)
const TIMES = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`)

export function AutoSettingsCard({ onGenerated }: { onGenerated: (generationId: string) => void }) {
  const settings = useQuery({ queryKey: ['delivery-auto-settings'], queryFn: getAutoSettings })
  if (!settings.data) {
    return (
      <section className="card dlv-card dlv-auto" aria-labelledby="dlv-auto-title">
        <div className="dlv-card-head">
          <h2 id="dlv-auto-title">자동 발송</h2>
        </div>
        <p className="dlv-empty">{settings.isError ? '설정을 불러오지 못했습니다.' : '불러오는 중…'}</p>
      </section>
    )
  }
  // Only saved values reset the form; a new draft changes `next` and must not drop unsaved edits.
  const { enabled, editions, generate_day, generate_time, send_day, send_time, notify_webhook } = settings.data
  const savedKey = JSON.stringify([enabled, editions, generate_day, generate_time, send_day, send_time, notify_webhook])
  return <AutoSettingsForm key={savedKey} initial={settings.data} onGenerated={onGenerated} />
}

function AutoSettingsForm({ initial, onGenerated }: { initial: AutoSettings; onGenerated: (generationId: string) => void }) {
  const toast = useToast()
  const qc = useQueryClient()
  const [enabled, setEnabled] = useState(initial.enabled)
  const [editions, setEditions] = useState(() => new Set(initial.editions.filter((e) => e.selected).map((e) => e.id)))
  const [generateDay, setGenerateDay] = useState(initial.generate_day)
  const [sendDay, setSendDay] = useState(initial.send_day)
  const [sendTime, setSendTime] = useState(initial.send_time)
  const noEdition = editions.size === 0
  // Same rule as the server: the send time is at least 24 hours after the generate time.
  const tooEarly = scheduleGapMinutes(generateDay, initial.generate_time, sendDay, sendTime) < 24 * 60
  const save = useMutation({
    mutationFn: () =>
      saveAutoSettings({
        enabled,
        edition_ids: [...editions],
        generate_day: generateDay,
        generate_time: initial.generate_time,
        send_day: sendDay,
        send_time: sendTime,
        notify_webhook: initial.notify_webhook,
      }),
    onSuccess: () => {
      toast('자동 발송 설정을 저장했습니다. 바꾼 설정은 다음 생성부터 적용됩니다.')
      void qc.invalidateQueries({ queryKey: ['delivery-auto-settings'] })
    },
    onError: (e) => toast(apiErrorDetail(e) || '저장하지 못했습니다.', 'err'),
  })
  const toggle = (id: string) =>
    setEditions((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const next = initial.next

  // 지금 만들기 (spec §6): saved editions, last month in KST. Works with the server flag off.
  const [confirmMake, setConfirmMake] = useState(false)
  const reports = useQuery({ queryKey: ['delivery-reports'], queryFn: listDeliveryReports })
  const generations = useQuery({ queryKey: ['delivery-generations'], queryFn: listGenerations })
  const month = targetMonth()
  const savedEditions = initial.editions.filter((e) => e.selected)
  const editionsChanged = editions.size !== savedEditions.length || savedEditions.some((e) => !editions.has(e.id))
  const stateKnown = Boolean(reports.data && generations.data)
  const maxGenerations = initial.max_generations
  const blockOf = (editionId: string) => generationBlock(editionId, month, reports.data ?? [], generations.data ?? [], maxGenerations)
  const makeable = stateKnown ? savedEditions.filter((e) => !blockOf(e.id)) : []
  const limited = stateKnown ? savedEditions.filter((e) => blockOf(e.id) === 'limit') : []
  const limitedNames = limited.map((e) => e.name).join(', ')
  const limitNote = limited.length
    ? `${limitedNames}${topicParticle(limitedNames)} 이번 달 생성 횟수 ${maxGenerations}회를 다 써서 만들지 않습니다.`
    : ''
  const allLimited = limited.length > 0 && limited.length === savedEditions.length
  const make = useMutation({
    // The screen's lists are cached and capped, and the server would replace an approved or sent
    // draft, so decide again from fresh data at the moment of the click.
    mutationFn: async () => {
      const [freshReports, freshGenerations] = await Promise.all([listAllDeliveryReports(), listGenerations()])
      const targets = savedEditions.filter((e) => !generationBlock(e.id, month, freshReports, freshGenerations, maxGenerations))
      const results = await Promise.allSettled(targets.map((e) => generateReport(e.id, month)))
      return { results, attempted: makeable.length }
    },
    onError: (e) => {
      setConfirmMake(false)
      toast(apiErrorDetail(e) || '초안 상태를 확인하지 못해 만들지 않았습니다.', 'err')
    },
    onSuccess: ({ results, attempted }) => {
      setConfirmMake(false)
      for (const key of ['delivery-generations', 'delivery-reports', 'delivery-auto-settings']) {
        void qc.invalidateQueries({ queryKey: [key] })
      }
      const started = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []))
      if (started.length) {
        toast('초안을 만들고 있습니다. 창을 닫아도 서버에서 계속 만듭니다. 다 만들면 관리자에게 알립니다.')
        onGenerated(started[0].id)
      }
      for (const r of results) {
        if (r.status === 'rejected') toast(apiErrorDetail(r.reason) || '초안을 만들지 못했습니다.', 'err')
      }
      if (results.length < attempted) toast('그 사이 초안이 생긴 분야는 만들지 않았습니다.', 'err')
    },
  })
  const makeHint = !savedEditions.length
    ? '분야를 고르고 저장한 뒤 만들 수 있습니다.'
    : editionsChanged
      ? '바꾼 분야를 저장한 뒤 만들 수 있습니다.'
      : !stateKnown
        ? reports.isError || generations.isError
          ? '초안 상태를 확인하지 못해 만들 수 없습니다.'
          : '초안 상태를 확인하는 중입니다.'
        : allLimited
          ? `${savedEditions.length > 1 ? '모든 분야가' : `${limitedNames}${topicParticle(limitedNames)}`} 이번 달 생성 횟수 ${maxGenerations}회를 다 써서 더 만들 수 없습니다. 목록에서 지운 항목도 횟수에 들어갑니다.`
          : !makeable.length
            ? `${monthLabel(month)} 초안이 이미 있거나 만드는 중입니다. 검토 대기 초안은 초안 검토에서 다시 만들 수 있습니다. ${limitNote}`.trim()
            : limited.length
              ? `${monthLabel(month)} ${makeable.map((e) => e.name).join(', ')} 초안을 지금 만듭니다. 자동으로 보내지 않습니다. ${limitNote}`
              : `${monthLabel(month)} 초안을 지금 만듭니다. 자동으로 보내지 않습니다.`
  const makeDisabled = !savedEditions.length || editionsChanged || !stateKnown || !makeable.length || make.isPending
  const deadlinePassed = sendTimePassed(initial.send_day, initial.send_time)

  return (
    <section className="card dlv-card dlv-auto" aria-labelledby="dlv-auto-title">
      <div className="dlv-card-head">
        <h2 id="dlv-auto-title">자동 발송</h2>
        <label className="dlv-switch-label">
          <span>{enabled ? '켜짐' : '꺼짐'}</span>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label="자동 발송"
            className={cx('switch', enabled && 'on')}
            onClick={() => setEnabled((v) => !v)}
          />
        </label>
      </div>
      <div className="dlv-auto-grid">
        <fieldset className="dlv-auto-field">
          <legend>대상 분야</legend>
          <div className="dlv-checks">
            {initial.editions.map((e) => (
              <label key={e.id} className="dlv-check">
                <input type="checkbox" checked={editions.has(e.id)} onChange={() => toggle(e.id)} />
                {e.name}
              </label>
            ))}
          </div>
          <p className={noEdition ? 'dlv-error' : 'dlv-hint'}>{noEdition ? '분야를 하나 이상 고르세요.' : '분야마다 보고서를 1건씩 만듭니다.'}</p>
        </fieldset>
        <div className="dlv-auto-field">
          <label htmlFor="dlv-gen-day">생성일</label>
          <select id="dlv-gen-day" className="input" value={generateDay} onChange={(e) => setGenerateDay(Number(e.target.value))}>
            {DAYS.map((d) => (
              <option key={d} value={d}>
                매달 {d}일
              </option>
            ))}
          </select>
          <p className="dlv-hint">지난달 보고서 초안을 만듭니다.</p>
        </div>
        <div className="dlv-auto-field">
          <label htmlFor="dlv-send-day">발송일 · 시각</label>
          <div className="dlv-inline">
            <select id="dlv-send-day" className="input" value={sendDay} onChange={(e) => setSendDay(Number(e.target.value))}>
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  매달 {d}일
                </option>
              ))}
            </select>
            <select aria-label="발송 시각" className="input" value={sendTime} onChange={(e) => setSendTime(e.target.value)}>
              {TIMES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <p className={tooEarly ? 'dlv-error' : 'dlv-hint'}>{tooEarly ? '발송일은 생성일보다 하루 이상 뒤여야 합니다.' : '승인한 초안만 보냅니다.'}</p>
        </div>
        <div className="dlv-auto-field dlv-next">
          <span className="dlv-field-label">다음 일정</span>
          {!enabled ? (
            <>
              <strong>꺼져 있어 초안을 만들지 않습니다.</strong>
              <p className="dlv-hint">켜면 다음 생성일부터 만듭니다.</p>
            </>
          ) : noEdition || tooEarly ? (
            <p className="dlv-hint">고친 뒤에 표시합니다.</p>
          ) : (
            <>
              <strong>발송 {kstDateTime(next.send_at)}</strong>
              <p className="dlv-hint">
                승인 {next.approved}건 · 검토 대기 {next.pending}건
                <br />
                생성 {kstDateTime(next.generate_at, false)}
              </p>
            </>
          )}
        </div>
      </div>
      <div className="dlv-auto-foot">
        <p className="dlv-hint">
          {noEdition || tooEarly
            ? '저장하려면 빨간 글자를 고치세요. 날짜는 매달 1~28일에서 고릅니다.'
            : enabled
              ? '초안이 생기면 관리자에게 알립니다. 발송 시각까지 승인하지 않은 초안은 보내지 않고 다시 알립니다. 바꾼 설정은 다음 생성부터 적용됩니다.'
              : '끄면 이미 만든 초안은 남지만, 승인된 초안도 자동으로 보내지 않습니다. 날짜는 매달 1~28일에서 고릅니다.'}
          {!initial.scheduler_enabled && ' (서버의 자동 발송 기능이 아직 꺼져 있습니다.)'}
        </p>
        <Btn variant="primary" disabled={noEdition || tooEarly || save.isPending} onClick={() => save.mutate()}>
          설정 저장
        </Btn>
      </div>
      <div className="dlv-auto-foot dlv-auto-make">
        <p className={cx('dlv-hint', allLimited && 'dlv-error')}>{makeHint}</p>
        <Btn variant="outline" disabled={makeDisabled} onClick={() => setConfirmMake(true)}>
          {make.isPending ? '요청 중…' : '지금 만들기'}
        </Btn>
      </div>
      {confirmMake && (
        <Modal
          title="초안을 지금 만들까요?"
          onClose={() => setConfirmMake(false)}
          footer={
            <>
              <Btn variant="outline" onClick={() => setConfirmMake(false)}>
                취소
              </Btn>
              <Btn variant="primary" disabled={make.isPending || !makeable.length} onClick={() => make.mutate()}>
                {make.isPending ? '요청 중…' : '지금 만들기'}
              </Btn>
            </>
          }
        >
          {makeable.map((e) => (
            <p key={e.id} className="dlv-make-line">
              {monthLabel(month)} {e.name} 초안을 만듭니다. 자동으로 보내지 않습니다.
            </p>
          ))}
          {makeable.length + limited.length < savedEditions.length && (
            <p className="dlv-hint">
              {savedEditions
                .filter((e) => !makeable.includes(e) && !limited.includes(e))
                .map((e) => e.name)
                .join(', ')}
              : 이 달 초안이 이미 있거나 만드는 중이라 만들지 않습니다.
            </p>
          )}
          {limited.length > 0 && <p className="dlv-hint">{limitNote}</p>}
          {deadlinePassed && (
            <p className="dlv-error dlv-make-warn">
              이번 달 발송 시각(매달 {initial.send_day}일 {initial.send_time})이 이미 지났습니다. 이 초안은 확인할 수 있지만 승인해 자동으로 보낼 수는 없습니다.
            </p>
          )}
          <p className="dlv-hint">AI 생성 비용이 드는 작업이라 보통 몇 분 걸립니다. 다 만들면 관리자에게 알립니다.</p>
        </Modal>
      )}
    </section>
  )
}
