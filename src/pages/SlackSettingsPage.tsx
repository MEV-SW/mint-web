import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { createWebhook, deleteWebhook, listWebhooks, testAllWebhooks, testWebhook, updateWebhook } from '../api/slackApi'
import { Btn } from '../components/common/Btn'
import { Modal } from '../components/common/Modal'
import { OverflowMenu } from '../components/common/OverflowMenu'
import { PageShell } from '../components/layout/PageShell'
import { useToast } from '../components/common/Toast'
import { useConfirm } from '../components/common/useConfirm'
import type { SlackWebhook, WebhookProvider, WebhookTestAllResponse } from '../api/slackApi'
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

const PROVIDER_OPTIONS: { value: WebhookProvider; label: string }[] = [
  { value: 'slack', label: 'Slack' },
  { value: 'teams', label: 'Teams' },
]

const PROVIDER_LABEL: Record<WebhookProvider, string> = { slack: 'Slack', teams: 'Teams' }

/** "Slack 1곳·Teams 1곳 전송, 실패 0" (sent counts per provider, providers that were tested only). */
function testAllSummary(res: WebhookTestAllResponse): string {
  const parts = PROVIDER_OPTIONS.flatMap(({ value, label }) => {
    const tested = res.results.filter((r) => r.provider === value)
    return tested.length ? [`${label} ${tested.filter((r) => r.success).length}곳`] : []
  })
  return `${parts.join('·') || '0곳'} 전송, 실패 ${res.failed}`
}

const URL_PLACEHOLDER: Record<WebhookProvider, string> = {
  slack: 'https://hooks.slack.com/services/…',
  teams: 'https://….environment.api.powerplatform.com/powerautomate/…',
}

export function SlackSettingsPage() {
  const toast = useToast()
  const confirm = useConfirm()
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [url, setUrl] = useState('')
  const [channel, setChannel] = useState('')
  const [purpose, setPurpose] = useState<string>('all')
  const [provider, setProvider] = useState<WebhookProvider>('slack')
  const [formError, setFormError] = useState<string | null>(null)

  const { data: webhooks = [] } = useQuery({ queryKey: ['slack-webhooks'], queryFn: listWebhooks })

  const closeAdd = () => {
    setShowAdd(false)
    setUrl('')
    setChannel('')
    setPurpose('all')
    setProvider('slack')
    setFormError(null)
  }

  const add = useMutation({
    mutationFn: () =>
      createWebhook({ webhook_url: url.trim(), channel_name: channel.trim(), purpose, provider }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['slack-webhooks'] })
      closeAdd()
      toast('웹훅을 등록했습니다.')
    },
    // The server explains a rejected URL in Korean (e.g. a non-Workflows Teams address).
    onError: (e) => setFormError(apiErrorDetail(e) || '등록하지 못했습니다.'),
  })

  const [testResult, setTestResult] = useState<WebhookTestAllResponse | null>(null)
  const test = useMutation({
    mutationFn: () => testAllWebhooks(),
    onSuccess: (res) => {
      setTestResult(res)
      toast(testAllSummary(res), res.failed ? 'err' : 'ok')
    },
    onError: (e) => toast(apiErrorDetail(e) || '전체 테스트 전송 실패', 'err'),
  })

  const testOne = useMutation({
    mutationFn: (w: SlackWebhook) => testWebhook(w.id),
    onSuccess: (res, w) =>
      toast(res.success ? `「${w.channel_name}」에 테스트를 보냈습니다.` : res.message, res.success ? 'ok' : 'err'),
    onError: (e) => toast(apiErrorDetail(e) || '테스트 전송 실패', 'err'),
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
      lead="Slack Incoming Webhook과 Teams 워크플로 웹훅 URL을 등록합니다. 전체 테스트는 켜진 연결 모두에, 연결별 테스트는 각 줄의 메뉴에서 보냅니다."
      leadSingleLine
      actions={
        <>
          <Btn
            variant="outline"
            onClick={() => test.mutate()}
            disabled={test.isPending || !webhooks.some((w) => w.is_active)}
          >
            {test.isPending ? '보내는 중…' : '전체 테스트 보내기'}
          </Btn>
          <Btn variant="primary" icon="plus" onClick={() => setShowAdd(true)}>
            웹훅 추가
          </Btn>
        </>
      }
    >
      {testResult && (
        <div
          className={cx('card card-pad webhook-test-result', testResult.failed > 0 && 'has-failed')}
          role="status"
        >
          <div className="webhook-test-result-head">
            <strong>전체 테스트 결과 · {testAllSummary(testResult)}</strong>
            <button type="button" className="webhook-test-result-close" onClick={() => setTestResult(null)}>
              닫기
            </button>
          </div>
          {testResult.failed > 0 && (
            <ul className="webhook-test-result-failures">
              {testResult.results
                .filter((r) => !r.success)
                .map((r) => (
                  <li key={r.webhook_id}>
                    <strong>{r.channel_name}</strong> ({PROVIDER_LABEL[r.provider] ?? r.provider}) — {r.message}
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}

      <div className="card card-pad webhook-list">
        {webhooks.map((w) => (
          <div key={w.id} className={cx('webhook-row', !w.is_active && 'is-off')}>
            <div className="webhook-row-main">
              <strong>{w.channel_name}</strong>
              <div className="webhook-row-meta">
                <span className={cx('webhook-provider', `is-${w.provider}`)}>{PROVIDER_LABEL[w.provider] ?? w.provider}</span>
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
                  key: 'test',
                  label: '테스트 전송',
                  disabled: testOne.isPending,
                  onClick: () => testOne.mutate(w),
                },
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
            등록된 웹훅이 없습니다. Slack이나 Teams 웹훅 URL과 받을 채널을 넣으면 일일 리포트 등을 받을
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
            <label id="webhook-provider-label">종류</label>
            <div className="seg" role="radiogroup" aria-labelledby="webhook-provider-label">
              {PROVIDER_OPTIONS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  role="radio"
                  aria-checked={provider === item.value}
                  className={provider === item.value ? 'on' : undefined}
                  onClick={() => {
                    setProvider(item.value)
                    setFormError(null)
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label htmlFor="webhook-url-input">웹훅 URL</label>
            <input
              id="webhook-url-input"
              className="input"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value)
                setFormError(null)
              }}
              placeholder={URL_PLACEHOLDER[provider]}
              aria-describedby={provider === 'teams' ? 'webhook-teams-hint' : undefined}
            />
            {provider === 'teams' && (
              <p id="webhook-teams-hint" className="webhook-hint">
                Teams 채널 › 워크플로 › ‘웹훅 요청이 수신되면 채널에 게시’ 템플릿에서 만든 URL을 붙여 넣으세요. URL은
                저장 후 다시 보여 주지 않습니다.
              </p>
            )}
          </div>
          <div className="field">
            <label>채널명</label>
            <input
              className="input"
              value={channel}
              onChange={(e) => {
                setChannel(e.target.value)
                setFormError(null)
              }}
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
                  onClick={() => {
                    setPurpose(item.value)
                    setFormError(null)
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          {formError && (
            <p className="source-form-field-error" role="alert">
              {formError}
            </p>
          )}
        </Modal>
      )}
    </PageShell>
  )
}
