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

type Snippet = { label?: string; code: string }
type Step = { title: string; text: string[]; snippets?: Snippet[] }

const FIRST_QUESTION = '전기차·충전 분야 6~10월 분기별 핵심 흐름 3개와 근거 기사 링크를 정리해줘'

// mint-server#225 — numbered steps per tool. Each command gets its own copy button.
function guideSteps(client: Client, url: string): Step[] {
  const firstStep: Step = {
    title: '⑤ 첫 질문',
    text: ['기간·분야·원하는 형식을 함께 적으면 MINT 기사·리포트를 찾아 답합니다.'],
    snippets: [{ code: FIRST_QUESTION }],
  }
  if (client === 'claude-code') {
    return [
      {
        title: '① 준비',
        text: ['Claude Code를 설치하고, 위 「토큰 만들기」에서 토큰을 만들어 복사해 둡니다.'],
      },
      {
        title: '② 토큰 넣기',
        text: [
          '터미널에서 아래 명령을 실행하고, 물으면 토큰을 붙여넣은 뒤 Enter를 누릅니다. 입력한 토큰은 화면에 보이지 않습니다.',
          '「길이: 0」이 나오면 토큰이 들어가지 않은 것입니다. 다시 실행하세요. 토큰을 채팅창에 붙여넣지 마세요.',
        ],
        snippets: [
          { label: 'zsh (macOS 기본)', code: 'read -s "MINT_API_TOKEN?MINT 토큰: " && export MINT_API_TOKEN && echo && echo "길이: ${#MINT_API_TOKEN}"' },
          { label: 'bash', code: 'read -s -p "MINT 토큰: " MINT_API_TOKEN && export MINT_API_TOKEN && echo && echo "길이: ${#MINT_API_TOKEN}"' },
        ],
      },
      {
        title: '③ 등록',
        text: [
          '②를 실행한 같은 터미널에서 등록합니다. ②보다 먼저 등록하면 빈 토큰이 저장되어 401 오류가 납니다.',
          '「already exists」가 나오면 이미 등록된 것입니다. 먼저 지우고 다시 등록하세요.',
        ],
        snippets: [
          {
            label: '등록',
            code: `claude mcp add --scope user --transport http mint ${url} --header "Authorization: Bearer \${MINT_API_TOKEN}"`,
          },
          { label: '이미 등록돼 있으면 먼저', code: 'claude mcp remove mint --scope user' },
        ],
      },
      {
        title: '④ 연결 확인',
        text: [
          '목록에서 mint가 Connected인지 확인합니다. 그다음 Claude Code 세션을 새로 엽니다. 이미 열려 있던 세션에는 도구가 보이지 않습니다.',
          '새 세션에서 /mcp를 입력하면 mint와 도구 목록을 볼 수 있습니다. --scope user로 등록해서 어느 폴더에서든 쓸 수 있습니다.',
          '등록할 때 토큰 값이 ~/.claude.json에 저장됩니다. 토큰을 새로 만들면 지우고 다시 등록하세요.',
        ],
        snippets: [{ code: 'claude mcp list' }],
      },
      firstStep,
    ]
  }
  if (client === 'claude-desktop') {
    return [
      {
        title: '① 준비',
        text: [
          'Claude 데스크톱 앱과 Node.js(18 이상)를 설치하고, 위 「토큰 만들기」에서 토큰을 만들어 복사해 둡니다.',
          '연결은 npx로 실행하는 mcp-remote가 대신합니다.',
        ],
      },
      {
        title: '② 토큰 넣기',
        text: [
          '설정 › 개발자 › 구성 편집으로 claude_desktop_config.json을 엽니다.',
          'macOS: ~/Library/Application Support/Claude/claude_desktop_config.json · Windows: %APPDATA%\\Claude\\claude_desktop_config.json',
          '아래 내용을 넣고 <토큰> 자리를 실제 토큰으로 바꿉니다. 「Bearer 」와 한 칸 띄움은 남겨 두세요. 이미 다른 mcpServers가 있으면 mint 항목만 그 안에 추가합니다.',
          '이 파일에는 토큰이 평문으로 남습니다. 파일을 공유하거나 캡처하지 마세요.',
        ],
        snippets: [
          {
            label: 'claude_desktop_config.json',
            code: JSON.stringify(
              {
                mcpServers: {
                  mint: {
                    command: 'npx',
                    args: ['-y', 'mcp-remote', url, '--header', 'Authorization:${AUTH_HEADER}'],
                    env: { AUTH_HEADER: 'Bearer <토큰>' },
                  },
                },
              },
              null,
              2,
            ),
          },
        ],
      },
      {
        title: '③ 등록',
        text: ['파일을 저장하고 앱을 완전히 종료(macOS Cmd+Q)한 뒤 다시 엽니다. 창만 닫으면 설정을 다시 읽지 않습니다.'],
      },
      {
        title: '④ 연결 확인',
        text: [
          '설정 › 개발자에서 mint 상태를 확인하고, 새 대화의 도구 목록에 mint가 보이는지 봅니다.',
          '연결되지 않으면 로그를 확인합니다. macOS: ~/Library/Logs/Claude/mcp*.log',
        ],
      },
      firstStep,
    ]
  }
  return [
    {
      title: '① 준비',
      text: ['Codex CLI를 설치하고, 위 「토큰 만들기」에서 토큰을 만들어 복사해 둡니다.'],
    },
    {
      title: '② 토큰 넣기',
      text: [
        'Codex는 실행할 때마다 환경변수에서 토큰을 읽습니다. 그래서 셸 시작 파일(zsh는 ~/.zshrc, bash는 ~/.bashrc)에 아래 한 줄을 넣고 <토큰> 자리를 실제 토큰으로 바꿉니다.',
        '저장한 뒤 새 터미널을 열고 길이를 확인합니다. 「길이: 0」이면 토큰이 들어가지 않은 것입니다.',
        '시작 파일에는 토큰이 평문으로 남습니다. 이 파일을 저장소나 dotfiles에 올리지 마세요.',
      ],
      snippets: [
        { label: '~/.zshrc 에 추가', code: 'export MINT_API_TOKEN="<토큰>"' },
        { label: '새 터미널에서 확인', code: 'echo "길이: ${#MINT_API_TOKEN}"' },
      ],
    },
    {
      title: '③ 등록',
      text: ['~/.codex/config.toml에 아래 내용을 넣습니다. 파일에는 토큰 대신 환경변수 이름만 들어갑니다.'],
      snippets: [
        { label: '~/.codex/config.toml', code: `[mcp_servers.mint]\nurl = "${url}"\nbearer_token_env_var = "MINT_API_TOKEN"` },
      ],
    },
    {
      title: '④ 연결 확인',
      text: [
        'codex mcp list에 mint가 보이는지 확인합니다. 이 목록은 설정된 서버를 보여 줍니다.',
        'Codex를 새로 실행하고 /mcp를 입력하면 실제로 쓰는 MCP 서버를 볼 수 있습니다.',
      ],
      snippets: [{ code: 'codex mcp list' }],
    },
    firstStep,
  ]
}

const TROUBLES: Array<{ symptom: string; cause: string; fix: string }> = [
  {
    symptom: '401 invalid_token · “토큰이 없거나 만료·폐기되었습니다”',
    cause: '토큰이 비었거나 잘렸거나, 만료·폐기된 토큰입니다.',
    fix: '토큰 길이를 확인하고, 「내 토큰」에서 상태가 사용 중인지 봅니다. 그다음 지우고 다시 등록합니다.',
  },
  {
    symptom: '등록할 때 “already exists”',
    cause: '같은 이름(mint)이 이미 등록되어 있습니다. 다시 add 해도 바뀌지 않습니다.',
    fix: '먼저 remove로 지우고 add로 다시 등록합니다.',
  },
  {
    symptom: 'Connected인데 도구가 안 보임',
    cause: '연결 전에 열어 둔 세션입니다.',
    fix: '세션(또는 앱)을 새로 엽니다.',
  },
  {
    symptom: '429 요청이 너무 많습니다',
    cause: '토큰당 1분 60회, 사람당 하루 2,000회 한도를 넘었습니다.',
    fix: '잠시 뒤 다시 시도합니다.',
  },
  {
    symptom: '400 토큰은 Authorization 헤더로만',
    cause: '토큰을 주소(쿼리)에 넣었습니다.',
    fix: '주소에서 토큰을 빼고 Authorization 헤더로 보냅니다.',
  },
  {
    symptom: '403 접근 거부',
    cause: '접속 지역 제한(해외 IP)입니다.',
    fix: '국내 네트워크에서 연결합니다.',
  },
  {
    symptom: '421 Invalid Host',
    cause: '서버 설정 문제입니다.',
    fix: '관리자에게 알려 주세요.',
  },
]

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
  const steps = guideSteps(client, url)

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
          MCP 주소: <code>{url}</code> · 쓰는 AI 도구를 고르고 ①부터 차례로 따라 하세요.
        </p>
        <div className="seg aic-client-seg" role="tablist" aria-label="AI 도구">
          {CLIENTS.map(([id, label]) => (
            <button
              key={id}
              id={`aic-tab-${id}`}
              type="button"
              role="tab"
              aria-selected={client === id}
              aria-controls="aic-steps"
              className={client === id ? 'on' : undefined}
              onClick={() => setClient(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <ol id="aic-steps" className="aic-steps" role="tabpanel" aria-labelledby={`aic-tab-${client}`}>
          {steps.map((step) => (
            <li key={step.title} className="aic-step">
              <h3>{step.title}</h3>
              {step.text.map((line) => (
                <p key={line}>{line}</p>
              ))}
              {step.snippets?.map((snippet) => (
                <div key={snippet.code} className="aic-snippet">
                  {snippet.label && <span className="aic-snippet-label">{snippet.label}</span>}
                  <div className="aic-code">
                    <pre>
                      <code>{snippet.code}</code>
                    </pre>
                    <Btn
                      variant="outline"
                      size="sm"
                      aria-label={`${step.title} ${snippet.label ?? ''} 복사`.replace(/\s+/g, ' ')}
                      onClick={() =>
                        void copyText(snippet.code).then((ok) =>
                          toast(ok ? '복사했습니다.' : '복사하지 못했습니다.', ok ? 'ok' : 'err'),
                        )
                      }
                    >
                      복사
                    </Btn>
                  </div>
                </div>
              ))}
            </li>
          ))}
        </ol>

        <div className="help-faq aic-more">
          <details className="help-faq-item">
            <summary>문제 해결</summary>
            <dl className="aic-trouble">
              {TROUBLES.map((t) => (
                <div key={t.symptom}>
                  <dt>{t.symptom}</dt>
                  <dd>
                    <span>원인: {t.cause}</span>
                    <span>해결: {t.fix}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </details>
          <details className="help-faq-item">
            <summary>잘 묻는 법·데이터 범위</summary>
            <p>기간·분야·형식을 함께 적으세요. 예: “{FIRST_QUESTION}”</p>
            <p>
              기사는 2026-06-05부터, 일일 리포트는 2026-06-29부터, 주간 리포트는 2026-10-26 주부터 있습니다. 7일이 지나
              보존 정리된 기사는 요약·링크가 없을 수 있습니다.
            </p>
            <p>숨긴 기사는 보이지 않습니다. 내가 웹에서 보는 범위만 AI도 볼 수 있습니다.</p>
          </details>
          <details className="help-faq-item">
            <summary>토큰 보안</summary>
            <p>토큰은 비밀번호처럼 다루세요. 채팅·코드·저장소·캡처에 남기지 마세요.</p>
            <p>기기마다 토큰을 따로 만들고, 새어 나간 것 같으면 「내 토큰」에서 바로 폐기하세요.</p>
            <p>만료 전에 새 토큰을 만들어 다시 등록하세요. 만료된 토큰으로는 401 오류가 납니다.</p>
          </details>
        </div>
        <p className="aic-hint">claude.ai 웹과 ChatGPT 연결은 다음 단계에서 지원합니다.</p>
      </section>
    </PageShell>
  )
}
