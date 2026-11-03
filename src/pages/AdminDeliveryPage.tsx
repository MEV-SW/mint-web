import { useSearchParams } from 'react-router-dom'
import { EmailReportsPanel } from '../components/delivery/EmailReportsPanel'
import { PageShell } from '../components/layout/PageShell'
import { cx } from '../utils/cx'
import { WebhookPanel } from './SlackSettingsPage'

type DeliveryTab = 'webhooks' | 'email'

const TABS: Array<[DeliveryTab, string]> = [
  ['webhooks', '웹훅'],
  ['email', '이메일 보고서'],
]

/** mint-server#228 — 관리 › 10 외부전달: Slack·Teams 웹훅과 이메일 보고서 (`?tab=webhooks|email`). */
export function AdminDeliveryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab: DeliveryTab = searchParams.get('tab') === 'email' ? 'email' : 'webhooks'

  function selectTab(next: DeliveryTab) {
    const params = new URLSearchParams(searchParams)
    if (next === 'webhooks') params.delete('tab')
    else params.set('tab', next)
    setSearchParams(params, { replace: true })
  }

  const tabs = (
    <div className="admin-subtabs dlv-tabs" role="tablist" aria-label="외부전달 화면">
      {TABS.map(([id, label]) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={tab === id}
          className={cx('admin-subtab', tab === id && 'on')}
          onClick={() => selectTab(id)}
        >
          {label}
        </button>
      ))}
    </div>
  )

  return (
    <PageShell
      section="관리 · 외부전달"
      title="외부전달"
      lead="Slack·Teams 웹훅과 이메일 보고서를 한 곳에서 관리합니다. 관리자만 볼 수 있습니다."
      leadSingleLine
    >
      {tab === 'email' ? <EmailReportsPanel tabs={tabs} /> : <WebhookPanel tabs={tabs} />}
    </PageShell>
  )
}
