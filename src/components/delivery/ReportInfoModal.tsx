import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { updateDeliveryReport, type DeliveryReport, type DeliveryReportKind } from '../../api/deliveryApi'
import { apiErrorDetail } from '../../utils/apiError'
import { Btn } from '../common/Btn'
import { Modal } from '../common/Modal'
import { useToast } from '../common/Toast'
import { KIND_LABEL, reportEditRule } from './autoReportState'

/** mint-server#235 §4: 보고서 정보 수정 (Design 시안 3). Files stay as they are; only these fields change. */
export function ReportInfoModal({ report, onClose }: { report: DeliveryReport; onClose: () => void }) {
  const toast = useToast()
  const qc = useQueryClient()
  const rule = reportEditRule(report)
  const locked = rule.mode === 'none'
  const lockMeta = rule.mode !== 'all'
  const [title, setTitle] = useState(report.title)
  const [subject, setSubject] = useState(report.email_subject)
  const [kind, setKind] = useState<DeliveryReportKind>(report.kind)
  const [start, setStart] = useState(report.period_start)
  const [end, setEnd] = useState(report.period_end)
  const [error, setError] = useState<string | null>(null)

  const changes = {
    ...(title.trim() !== report.title ? { title: title.trim() } : {}),
    ...(subject.trim() !== report.email_subject ? { email_subject: subject.trim() } : {}),
    ...(!lockMeta && kind !== report.kind ? { kind } : {}),
    ...(!lockMeta && start !== report.period_start ? { period_start: start } : {}),
    ...(!lockMeta && end !== report.period_end ? { period_end: end } : {}),
  }
  const missing = !title.trim() || !subject.trim()
  const badPeriod = !start || !end || end < start
  const dirty = Object.keys(changes).length > 0
  const sent = report.send_status === 'sent' || report.send_status === 'partial'

  const refresh = () => {
    for (const key of ['delivery-reports', 'delivery-report', 'delivery-preview']) {
      void qc.invalidateQueries({ queryKey: [key] })
    }
  }
  const save = useMutation({
    mutationFn: () => updateDeliveryReport(report.id, changes),
    onSuccess: () => {
      refresh()
      toast('보고서 정보를 고쳤습니다. 목록과 미리보기, 다음 발송 메일 제목에 반영됩니다.')
      onClose()
    },
    onError: (e) => {
      // The report may have changed state on the server (sending, approved): show the current rule.
      refresh()
      setError(apiErrorDetail(e) || '고치지 못했습니다.')
    },
  })

  return (
    <Modal
      title={locked ? '보고서 정보' : '보고서 정보 수정'}
      onClose={onClose}
      footer={
        locked ? (
          <Btn variant="outline" onClick={onClose}>
            닫기
          </Btn>
        ) : (
          <>
            <Btn variant="outline" onClick={onClose}>
              취소
            </Btn>
            <Btn variant="primary" disabled={!dirty || missing || badPeriod || save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? '저장 중…' : '저장'}
            </Btn>
          </>
        )
      }
    >
      {rule.note && <p className="dlv-lock-note">{rule.note}</p>}
      <div className="field">
        <label htmlFor="dlv-info-title">보고서 이름</label>
        <input id="dlv-info-title" className="input" maxLength={200} value={title} disabled={locked} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="dlv-info-subject">메일 제목</label>
        <input id="dlv-info-subject" className="input" maxLength={200} value={subject} disabled={locked} onChange={(e) => setSubject(e.target.value)} />
      </div>
      <div className="field">
        <label id="dlv-info-kind-label">종류</label>
        <div className={lockMeta ? 'seg is-locked' : 'seg'} role="radiogroup" aria-labelledby="dlv-info-kind-label">
          {(Object.keys(KIND_LABEL) as DeliveryReportKind[]).map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={kind === value}
              className={kind === value ? 'on' : undefined}
              disabled={lockMeta}
              onClick={() => setKind(value)}
            >
              {KIND_LABEL[value]}
            </button>
          ))}
        </div>
      </div>
      <div className="dlv-form-row">
        <div className="field">
          <label htmlFor="dlv-info-start">기간 시작</label>
          <input id="dlv-info-start" type="date" className="input" value={start} disabled={lockMeta} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="dlv-info-end">기간 끝</label>
          <input id="dlv-info-end" type="date" className="input" value={end} disabled={lockMeta} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </div>
      {rule.mode === 'names' && <p className="dlv-hint">자동 생성 보고서의 기간과 종류는 바꿀 수 없습니다.</p>}
      {!locked && missing && (
        <p className="source-form-field-error" role="alert">
          보고서 이름과 메일 제목은 비울 수 없습니다.
        </p>
      )}
      {!lockMeta && badPeriod && (
        <p className="source-form-field-error" role="alert">
          {!start || !end ? '기간을 입력해 주세요.' : '기간 끝은 시작보다 빠를 수 없습니다.'}
        </p>
      )}
      {error && (
        <p className="source-form-field-error" role="alert">
          {error}
        </p>
      )}
      {!locked && (
        <p className="dlv-hint">
          PDF와 메일 본문은 바뀌지 않습니다. 파일을 바꾸려면 새로 올려 주세요.
          {sent && ' 이미 보낸 메일은 그대로이고, 지난 발송 기록에는 보낸 때의 이름이 남습니다. 다시 보내기를 포함해 다음 발송부터 새 정보를 씁니다.'}
          {report.review_status === 'pending' && ' 메일 제목을 고치면 미리보기가 바뀌므로 바뀐 내용을 보고 승인해 주세요.'}
          {report.review_status === 'expired' && ' 메일 제목을 고치면 미리보기가 바뀌므로 바뀐 내용을 보고 보내 주세요.'}
        </p>
      )}
    </Modal>
  )
}
