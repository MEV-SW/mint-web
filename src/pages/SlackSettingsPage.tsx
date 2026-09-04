import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { createWebhook, deleteWebhook, listWebhooks, testSlack } from '../api/slackApi'
import { Btn } from '../components/common/Btn'
import { Modal } from '../components/common/Modal'
import { PageShell } from '../components/layout/PageShell'
import { useToast } from '../components/common/Toast'

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
  })

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
            테스트 발송
          </Btn>
          <Btn variant="primary" icon="plus" onClick={() => setShowAdd(true)}>
            웹훅 추가
          </Btn>
        </>
      }
    >
      <div className="card card-pad webhook-list">
        {webhooks.map((w) => (
          <div key={w.id} className="webhook-row">
            <div>
              <strong>{w.channel_name}</strong>
              <div className="webhook-row-meta">
                {PURPOSE_LABEL[w.purpose] ?? w.purpose} · {w.is_active ? '활성' : '비활성'}
              </div>
            </div>
            <Btn
              variant="outline"
              size="sm"
              icon="trash"
              onClick={() => {
                if (!window.confirm(`「${w.channel_name}」 웹훅을 삭제할까요?`)) return
                remove.mutate(w.id)
              }}
            >
              삭제
            </Btn>
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
            <label>용도</label>
            <select className="input" value={purpose} onChange={(e) => setPurpose(e.target.value)}>
              {PURPOSE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </Modal>
      )}
    </PageShell>
  )
}
