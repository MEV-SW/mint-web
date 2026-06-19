import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { createWebhook, deleteWebhook, listWebhooks, testSlack } from '../api/slackApi'
import { Btn } from '../components/common/Btn'
import { Modal } from '../components/common/Modal'
import { PageShell } from '../components/layout/PageShell'
import { useToast } from '../components/common/Toast'

export function SlackSettingsPage() {
  const toast = useToast()
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [url, setUrl] = useState('')
  const [channel, setChannel] = useState('#ev-intel')

  const { data: webhooks = [] } = useQuery({ queryKey: ['slack-webhooks'], queryFn: listWebhooks })

  const add = useMutation({
    mutationFn: () => createWebhook({ webhook_url: url, channel_name: channel }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['slack-webhooks'] })
      setShowAdd(false)
      setUrl('')
      toast('Webhook을 등록했습니다.')
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
      toast('삭제했습니다.')
    },
  })

  return (
    <PageShell
      section="운영 · 알림"
      title="Slack 설정"
      lead="Incoming Webhook URL을 등록하고 테스트 메시지를 보냅니다. URL은 암호화되어 저장됩니다."
      actions={
        <>
          <Btn variant="outline" onClick={() => test.mutate()} disabled={test.isPending || !webhooks.length}>
            테스트 발송
          </Btn>
          <Btn variant="primary" icon="plus" onClick={() => setShowAdd(true)}>
            Webhook 추가
          </Btn>
        </>
      }
    >
      <div className="card card-pad">
        {webhooks.map((w) => (
          <div
            key={w.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 0',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div>
              <strong>{w.channel_name}</strong>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {w.purpose} · {w.is_active ? '활성' : '비활성'}
              </div>
            </div>
            <Btn variant="outline" size="sm" icon="trash" onClick={() => remove.mutate(w.id)} />
          </div>
        ))}
        {!webhooks.length && <p style={{ color: 'var(--text-muted)' }}>등록된 Webhook이 없습니다.</p>}
      </div>

      {showAdd && (
        <Modal
          title="Slack Webhook 등록"
          onClose={() => setShowAdd(false)}
          footer={
            <>
              <Btn variant="outline" onClick={() => setShowAdd(false)}>
                취소
              </Btn>
              <Btn variant="primary" onClick={() => add.mutate()} disabled={!url}>
                저장
              </Btn>
            </>
          }
        >
          <div className="field">
            <label>Webhook URL</label>
            <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://hooks.slack.com/..." />
          </div>
          <div className="field">
            <label>채널명</label>
            <input className="input" value={channel} onChange={(e) => setChannel(e.target.value)} />
          </div>
        </Modal>
      )}
    </PageShell>
  )
}
