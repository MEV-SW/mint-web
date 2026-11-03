import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  TOKEN_EXPIRY_DAYS,
  issueApiToken,
  listMyApiTokens,
  mcpEndpointUrl,
  revokeMyApiToken,
  type ApiToken,
  type IssuedApiToken,
} from '../api/apiTokenApi'
import { Btn } from '../components/common/Btn'
import { LoadErrorBanner } from '../components/common/PageStates'
import { useToast } from '../components/common/Toast'
import { useConfirm } from '../components/common/useConfirm'
import { PageShell } from '../components/layout/PageShell'
import { apiErrorDetail } from '../utils/apiError'
import { cx } from '../utils/cx'
import { formatDate, formatShortDateTime } from '../utils/date'

type Client = 'claude-code' | 'claude-desktop' | 'codex'

const CLIENTS: Array<[Client, string]> = [
  ['claude-code', 'Claude Code'],
  ['claude-desktop', 'Claude 데스크톱'],
  ['codex', 'Codex CLI'],
]

function guide(client: Client, url: string): { note: string; code: string } {
  if (client === 'claude-code') {
    return {
      note: '터미널에서 토큰을 환경변수로 둔 뒤 한 번 등록합니다.',
      code: `export MINT_API_TOKEN="mint_pat_…"\nclaude mcp add --transport http mint ${url} --header "Authorization: Bearer \${MINT_API_TOKEN}"`,
    }
  }
  if (client === 'claude-desktop') {
    return {
      note: '설정 › 개발자 › 구성 편집에서 claude_desktop_config.json에 넣고 앱을 다시 엽니다. Node.js가 필요합니다.',
      code: JSON.stringify(
        {
          mcpServers: {
            mint: {
              command: 'npx',
              args: ['-y', 'mcp-remote', url, '--header', 'Authorization: Bearer ${MINT_API_TOKEN}'],
              env: { MINT_API_TOKEN: 'mint_pat_…' },
            },
          },
        },
        null,
        2,
      ),
    }
  }
  return {
    note: '~/.codex/config.toml에 넣고, 토큰은 셸 환경변수로 둡니다.',
    code: `[mcp_servers.mint]\nurl = "${url}"\nbearer_token_env_var = "MINT_API_TOKEN"\n\n# 셸에서\nexport MINT_API_TOKEN="mint_pat_…"`,
  }
}

function TokenStatus({ token }: { token: ApiToken }) {
  if (token.revoked_at) return <span className="aic-status is-off">폐기됨</span>
  if (!token.active) return <span className="aic-status is-off">만료됨</span>
  return <span className="aic-status is-on">사용 중</span>
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** mint-server#225 — 계정 메뉴 › AI 연결: personal API tokens and MCP connection guides. */
export function AiConnectionPage() {
  const toast = useToast()
  const confirm = useConfirm()
  const qc = useQueryClient()
  const tokens = useQuery({ queryKey: ['my-api-tokens'], queryFn: listMyApiTokens })
  const [name, setName] = useState('')
  const [expires, setExpires] = useState<number>(90)
  const [issued, setIssued] = useState<IssuedApiToken | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [client, setClient] = useState<Client>('claude-code')
  const url = mcpEndpointUrl()
  const current = guide(client, url)

  const issue = useMutation({
    mutationFn: () => issueApiToken(name.trim(), expires),
    onSuccess: (token) => {
      setIssued(token)
      setName('')
      setFormError(null)
      void qc.invalidateQueries({ queryKey: ['my-api-tokens'] })
    },
    onError: (e) => setFormError(apiErrorDetail(e) || '토큰을 만들지 못했습니다.'),
  })

  const revoke = useMutation({
    mutationFn: (id: string) => revokeMyApiToken(id),
    onSuccess: () => {
      toast('토큰을 폐기했습니다.')
      void qc.invalidateQueries({ queryKey: ['my-api-tokens'] })
    },
    onError: (e) => toast(apiErrorDetail(e) || '폐기하지 못했습니다.', 'err'),
  })

  async function requestRevoke(token: ApiToken) {
    const ok = await confirm({
      title: `「${token.name}」 토큰을 폐기할까요?`,
      body: '이 토큰으로 연결한 AI 도구는 바로 MINT를 읽지 못합니다. 되돌릴 수 없습니다.',
      confirmLabel: '폐기',
      danger: true,
    })
    if (ok) revoke.mutate(token.id)
  }

  const activeCount = (tokens.data ?? []).filter((t) => t.active).length

  return (
    <PageShell
      section="내 계정 · AI 연결"
      title="AI 연결"
      lead="Claude·Codex 같은 AI 도구가 MINT의 기사·리포트·트렌드를 읽을 수 있게 개인 토큰을 만듭니다. 읽기만 하고, 내가 웹에서 보는 범위만 보입니다."
    >
      <section className="card card-pad aic-section" aria-labelledby="aic-issue">
        <h2 id="aic-issue">토큰 만들기</h2>
        <div className="aic-issue-row">
          <div className="field">
            <label htmlFor="aic-name">이름</label>
            <input
              id="aic-name"
              className="input"
              value={name}
              maxLength={64}
              placeholder="예: 회사 노트북 Claude"
              onChange={(e) => {
                setName(e.target.value)
                setFormError(null)
              }}
            />
          </div>
          <div className="field">
            <label htmlFor="aic-expires">만료</label>
            <select
              id="aic-expires"
              className="input"
              value={expires}
              onChange={(e) => {
                setExpires(Number(e.target.value))
                setFormError(null)
              }}
            >
              {TOKEN_EXPIRY_DAYS.map((days) => (
                <option key={days} value={days}>
                  {days}일
                </option>
              ))}
            </select>
          </div>
          <Btn
            variant="primary"
            className="aic-issue-btn"
            disabled={!name.trim() || issue.isPending || activeCount >= 5}
            onClick={() => issue.mutate()}
          >
            {issue.isPending ? '만드는 중…' : '토큰 만들기'}
          </Btn>
        </div>
        <p className="aic-hint">사용 중인 토큰은 5개까지 둘 수 있습니다. 무기한 토큰은 없습니다.</p>
        {formError && (
          <p className="source-form-field-error" role="alert">
            {formError}
          </p>
        )}
        {/* Announce only the notice; the secret itself sits outside any live region. */}
        <p className="sr-only" role="status" aria-live="polite">
          {issued ? `「${issued.name}」 토큰을 만들었습니다. 아래 칸에서 복사해 두세요.` : ''}
        </p>
        {issued && (
          <div className="aic-issued">
            <strong>「{issued.name}」 토큰을 만들었습니다. 지금 복사해 두세요.</strong>
            <p>이 화면을 벗어나면 다시 볼 수 없습니다. 잃어버리면 폐기하고 새로 만드세요.</p>
            <div className="aic-token">
              <code aria-label="토큰 원문">{issued.token}</code>
              <Btn
                variant="outline"
                size="sm"
                onClick={() =>
                  void copyText(issued.token).then((ok) =>
                    toast(ok ? '토큰을 복사했습니다.' : '복사하지 못했습니다. 직접 선택해 복사해 주세요.', ok ? 'ok' : 'err'),
                  )
                }
              >
                복사
              </Btn>
            </div>
            <button type="button" className="aic-dismiss" onClick={() => setIssued(null)}>
              복사했습니다, 닫기
            </button>
          </div>
        )}
      </section>

      <section className="card card-pad aic-section" aria-labelledby="aic-list">
        <h2 id="aic-list">내 토큰</h2>
        {tokens.isError ? (
          <LoadErrorBanner
            title="토큰 목록을 불러오지 못했습니다"
            error={tokens.error}
            failedAt={tokens.errorUpdatedAt}
            onRetry={() => void tokens.refetch()}
            retrying={tokens.isFetching}
          />
        ) : (tokens.data ?? []).length === 0 ? (
          <p className="aic-hint">아직 만든 토큰이 없습니다.</p>
        ) : (
          <ul className="aic-tokens">
            {(tokens.data ?? []).map((token) => (
              <li key={token.id} className={cx('aic-token-row', !token.active && 'is-off')}>
                <div className="aic-token-main">
                  <strong>{token.name}</strong>
                  <span className="aic-token-meta">
                    <code>{token.token_prefix}…</code> · 만료 {formatDate(token.expires_at)} · 마지막 사용{' '}
                    {token.last_used_at ? formatShortDateTime(token.last_used_at) : '없음'}
                  </span>
                </div>
                <TokenStatus token={token} />
                {token.active && (
                  <Btn variant="outline" size="sm" disabled={revoke.isPending} onClick={() => void requestRevoke(token)}>
                    폐기
                  </Btn>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card card-pad aic-section" aria-labelledby="aic-guide">
        <h2 id="aic-guide">연결 방법</h2>
        <p className="aic-hint">
          MCP 주소: <code>{url}</code> · 토큰은 설정 파일보다 환경변수에 두세요.
        </p>
        <div className="seg aic-client-seg" role="tablist" aria-label="AI 도구">
          {CLIENTS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={client === id}
              className={client === id ? 'on' : undefined}
              onClick={() => setClient(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="aic-guide-note">{current.note}</p>
        <div className="aic-code">
          <pre>
            <code>{current.code}</code>
          </pre>
          <Btn
            variant="outline"
            size="sm"
            onClick={() => void copyText(current.code).then((ok) => toast(ok ? '복사했습니다.' : '복사하지 못했습니다.', ok ? 'ok' : 'err'))}
          >
            복사
          </Btn>
        </div>
        <p className="aic-hint">
          연결한 뒤 “지난 3개월 충전 규제 흐름 정리해줘”처럼 물어보면 MINT 기사·리포트를 찾아 답합니다. claude.ai 웹과
          ChatGPT 연결은 다음 단계에서 지원합니다.
        </p>
      </section>
    </PageShell>
  )
}
