import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { createWebhook, deleteWebhook, listWebhooks, testSlack, updateWebhook } from '../api/slackApi'
import { Btn } from '../components/common/Btn'
import { Modal } from '../components/common/Modal'
import { OverflowMenu } from '../components/common/OverflowMenu'
import { PageShell } from '../components/layout/PageShell'
import { useToast } from '../components/common/Toast'
import { useConfirm } from '../components/common/useConfirm'
import type { SlackWebhook } from '../api/slackApi'
import { apiErrorDetail } from '../utils/apiError'
import { cx } from '../utils/cx'

const PURPOSE_OPTIONS = [
  { value: 'all', label: '전체 알림' },
  { value: 'daily', label: '일일 리포트' },
  { value: 'urgent', label: '긴급' },
  { value: 'review', label: '검수' },
] as const

const PURPOSE_LABEL: Record<string, string> = Object.fromEntries(
  PURPOSE_OPTIONS.map((item) => [item.value, item.label]),
)

export function SlackSettingsPage() {
  const toast = useToast()
  const confirm = useConfirm()
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [url, setUrl] = useState('')
  const [channel, setChannel] = useState('')
  const [purpose, setPurpose] = useState<string>('all')

  const { data: webhooks = [] } = useQuery({ queryKey: ['slack-webhooks'], queryFn: listWebhooks })

  const closeAdd = () => {
    setShowAdd(false)
    setUrl('')
    setChannel('')
    setPurpose('all')
  }

  const add = useMutation({
    mutationFn: () =>
      createWebhook({ webhook_url: url, channel_name: channel.trim(), purpose }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['slack-webhooks'] })
      closeAdd()
      toast('웹훅을 등록했습니다.')
    },
    onError: () => toast('등록 실패', 'err'),
  })

  const test = useMutation({
    mutationFn: () => testSlack(),
    onSuccess: (res) => toast(res.message, res.success ? 'ok' : 'err'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteWebhook(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['slack-webhooks'] })
      toast('웹훅을 삭제했습니다.')
    },
    onError: (e) => toast(apiErrorDetail(e) || '삭제 실패', 'err'),
  })

  const toggle = useMutation({
    mutationFn: (w: SlackWebhook) => updateWebhook(w.id, { is_active: !w.is_active }),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['slack-webhooks'] })
      toast(updated.is_active ? '웹훅을 켰습니다.' : '웹훅을 껐습니다.', 'info')
    },
    onError: (e) => toast(apiErrorDetail(e) || '변경 실패', 'err'),
  })

  async function requestToggle(w: SlackWebhook) {
    // Turning off asks first; turning on is immediate.
    if (
      w.is_active &&
      !(await confirm({
        title: `「${w.channel_name}」 웹훅을 끌까요?`,
        body: '다시 켤 때까지 이 채널로 알림을 보내지 않습니다.',
        confirmLabel: '끄기',
        danger: true,
      }))
    ) return
    toggle.mutate(w)
  }

  async function requestRemove(w: SlackWebhook) {
    if (!(await confirm({ title: `「${w.channel_name}」 웹훅을 삭제할까요?`, confirmLabel: '삭제', danger: true }))) return
    remove.mutate(w.id)
  }

  const canSave = Boolean(url.trim() && channel.trim())

  return (
    <PageShell
      section="관리 · 웹훅"
      title="웹훅 설정"
      lead="Slack·Teams Incoming Webhook URL을 등록합니다. 테스트는 활성 웹훅 전체에 발송됩니다."
      leadSingleLine
      actions={
        <>
          <Btn variant="outline" onClick={() => test.mutate()} disabled={test.isPending || !webhooks.length}>
            테스트 메시지 보내기
          </Btn>
          <Btn variant="primary" icon="plus" onClick={() => setShowAdd(true)}>
            웹훅 추가
          </Btn>
        </>
      }
    >
      <div className="card card-pad webhook-list">
        {webhooks.map((w) => (
          <div key={w.id} className={cx('webhook-row', !w.is_active && 'is-off')}>
            <div className="webhook-row-main">
              <strong>{w.channel_name}</strong>
              <div className="webhook-row-meta">
                <span className="webhook-purpose">{PURPOSE_LABEL[w.purpose] ?? w.purpose}</span>
                {/* The API never returns the URL (stored only), so it is always shown masked. */}
                <span className="webhook-url">저장된 URL (가려짐)</span>
              </div>
            </div>
            <span className={cx('webhook-status', w.is_active ? 'is-on' : 'is-off')}>
              {w.is_active ? '활성' : '꺼짐'}
            </span>
            <OverflowMenu
              label={`${w.channel_name} 메뉴`}
              items={[
                {
                  key: 'toggle',
                  label: w.is_active ? '끄기' : '켜기',
                  disabled: toggle.isPending,
                  onClick: () => void requestToggle(w),
                },
                {
                  key: 'delete',
                  label: '삭제…',
                  danger: true,
                  disabled: remove.isPending,
                  onClick: () => void requestRemove(w),
                },
              ]}
            />
          </div>
        ))}
        {!webhooks.length && (
          <p className="webhook-empty">
            등록된 웹훅이 없습니다. Incoming Webhook URL과 받을 채널을 넣으면 일일 리포트 등을 받을
            수 있습니다.
          </p>
        )}
      </div>

      {showAdd && (
        <Modal
          title="웹훅 등록"
          onClose={closeAdd}
          footer={
            <>
              <Btn variant="outline" onClick={closeAdd}>
                취소
              </Btn>
              <Btn variant="primary" onClick={() => add.mutate()} disabled={!canSave || add.isPending}>
                {add.isPending ? '저장 중…' : '저장'}
              </Btn>
            </>
          }
        >
          <div className="field">
            <label>웹훅 URL</label>
            <input
              className="input"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://hooks.slack.com/services/…"
            />
          </div>
          <div className="field">
            <label>채널명</label>
            <input
              className="input"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              placeholder="#mint"
            />
          </div>
          <div className="field">
            <label id="webhook-purpose-label">용도</label>
            <div className="seg webhook-purpose-seg" role="radiogroup" aria-labelledby="webhook-purpose-label">
              {PURPOSE_OPTIONS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  role="radio"
                  aria-checked={purpose === item.value}
                  className={purpose === item.value ? 'on' : undefined}
                  onClick={() => setPurpose(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </PageShell>
  )
}
