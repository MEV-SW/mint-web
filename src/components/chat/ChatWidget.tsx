import { useMutation } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { askChat, type ChatCitation } from '../../api/chatApi'
import { Icon } from '../common/Icon'
import { useToast } from '../common/Toast'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  citations?: ChatCitation[]
  source?: 'mint' | 'general'
  generalConfirm?: { question: string }
}

const SUGGESTIONS = [
  '최근 충전 인프라 이슈 요약해줘',
  '중요 게시판 최근 동향 알려줘',
  'EV 정책 변화가 있었나?',
]

const WELCOME: ChatMessage = {
  role: 'assistant',
  content:
    '안녕하세요! MINT 수집 자료를 우선 참고해 답변합니다.\n관련 게시글이 없으면 일반 지식 답변 여부를 먼저 여쭤봅니다.',
}

function TypingDots() {
  return (
    <span className="chat-typing" aria-hidden>
      <i />
      <i />
      <i />
    </span>
  )
}

export function ChatWidget() {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME])
  const bottomRef = useRef<HTMLDivElement>(null)

  const appendAssistant = (msg: Omit<ChatMessage, 'role'>) => {
    setMessages((prev) => [...prev, { role: 'assistant', ...msg }])
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  const ask = useMutation({
    mutationFn: ({
      message,
      allowGeneral,
    }: {
      message: string
      allowGeneral?: boolean
    }) => askChat(message, { allowGeneral }),
    onSuccess: (res, vars) => {
      appendAssistant({
        content: res.reply,
        citations: res.citations,
        source: res.source ?? undefined,
        generalConfirm: res.needs_general_confirm
          ? { question: vars.message }
          : undefined,
      })
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast(msg || '질문 처리에 실패했습니다.', 'err')
    },
  })

  const scrollBottom = () => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  const submit = (text: string, allowGeneral = false) => {
    const q = text.trim()
    if (!q || ask.isPending) return
    if (!open) setOpen(true)
    if (!allowGeneral) {
      setMessages((prev) => [...prev, { role: 'user', content: q }])
      setInput('')
    }
    ask.mutate({ message: q, allowGeneral })
    scrollBottom()
  }

  const confirmGeneral = (question: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.generalConfirm ? { ...m, generalConfirm: undefined } : m)),
    )
    submit(question, true)
  }

  const declineGeneral = () => {
    setMessages((prev) =>
      prev.map((m) => (m.generalConfirm ? { ...m, generalConfirm: undefined } : m)),
    )
    appendAssistant({
      content: '알겠습니다. MINT에 수집된 자료와 관련된 질문을 해 주세요.',
    })
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    submit(input)
  }

  return (
    <div className={`chat-widget${open ? ' is-open' : ''}`} aria-live="polite">
      {open && (
        <div className="chat-widget-panel" role="dialog" aria-label="MINT AI 챗봇">
          <div className="chat-widget-hero">
            <div className="chat-widget-hero-inner">
              <div className="chat-ai-avatar chat-ai-avatar--hero" aria-hidden>
                <Icon name="sparkles" />
              </div>
              <div className="chat-widget-hero-copy">
                <strong>MINT AI</strong>
                <span>EV·충전 인텔리전스 어시스턴트</span>
              </div>
              <span className="chat-widget-status">
                <i /> Live
              </span>
              <button
                type="button"
                className="chat-widget-close"
                title="접기"
                aria-label="챗봇 접기"
                onClick={() => setOpen(false)}
              >
                <Icon name="x" />
              </button>
            </div>
          </div>

          <div className="chat-widget-body">
            <div className="chat-messages chat-widget-messages">
              {messages.map((m, i) => (
                <div key={i} className={`chat-bubble ${m.role}`}>
                  {m.role === 'assistant' && (
                    <div className="chat-bubble-avatar" aria-hidden>
                      <Icon name="sparkles" />
                    </div>
                  )}
                  <div className="chat-bubble-content">
                    <div className="chat-bubble-label">
                      {m.role === 'user' ? 'You' : 'MINT AI'}
                      {m.source === 'general' && (
                        <span className="chat-source-tag">일반 지식</span>
                      )}
                      {m.source === 'mint' && m.citations && m.citations.length > 0 && (
                        <span className="chat-source-tag mint">MINT 자료</span>
                      )}
                    </div>
                    <div className="chat-bubble-body">{m.content}</div>
                    {m.citations && m.citations.length > 0 && (
                      <div className="chat-citations">
                        <div className="chat-citations-label">참고 자료</div>
                        {m.citations.map((c) => (
                          <div key={c.post_id} className="chat-citation-item">
                            <Link to={`/posts/${c.post_id}`} onClick={() => setOpen(false)}>
                              {c.title}
                            </Link>
                            {c.url && (
                              <a href={c.url} target="_blank" rel="noreferrer" className="chat-ext">
                                <Icon name="ext" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {m.generalConfirm && (
                      <div className="chat-confirm-actions">
                        <button
                          type="button"
                          className="chat-confirm-btn primary"
                          disabled={ask.isPending}
                          onClick={() => confirmGeneral(m.generalConfirm!.question)}
                        >
                          일반 지식으로 답변 받기
                        </button>
                        <button
                          type="button"
                          className="chat-confirm-btn"
                          disabled={ask.isPending}
                          onClick={declineGeneral}
                        >
                          괜찮아요
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {ask.isPending && (
                <div className="chat-bubble assistant">
                  <div className="chat-bubble-avatar" aria-hidden>
                    <Icon name="sparkles" />
                  </div>
                  <div className="chat-bubble-content">
                    <div className="chat-bubble-label">MINT AI</div>
                    <div className="chat-bubble-body chat-loading">
                      답변 생성 중 <TypingDots />
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {messages.length <= 1 && (
              <div className="chat-suggestions chat-widget-suggestions">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" className="chat-chip" onClick={() => submit(s)}>
                    <Icon name="sparkles" />
                    {s}
                  </button>
                ))}
              </div>
            )}

            <form className="chat-widget-composer" onSubmit={onSubmit}>
              <textarea
                className="chat-composer-input"
                rows={2}
                placeholder="EV·충전 관련 무엇이든 물어보세요…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    submit(input)
                  }
                }}
              />
              <button
                type="submit"
                className="chat-composer-send"
                disabled={ask.isPending || !input.trim()}
                aria-label="전송"
              >
                <Icon name="arrowUp" />
              </button>
            </form>
          </div>
        </div>
      )}

      {!open && (
        <button
          type="button"
          className="chat-widget-launcher"
          title="MINT AI 열기"
          aria-label="MINT AI 챗봇 열기"
          aria-expanded={false}
          onClick={() => setOpen(true)}
        >
          <span className="chat-widget-launcher-glow" aria-hidden />
          <span className="chat-widget-launcher-ring" aria-hidden />
          <span className="chat-ai-avatar chat-ai-avatar--launcher" aria-hidden>
            <Icon name="sparkles" />
          </span>
          <span className="chat-widget-launcher-copy">
            <strong>MINT AI</strong>
            <span>EV·충전 인텔리전스</span>
          </span>
          <span className="chat-widget-launcher-cta" aria-hidden>
            <Icon name="chevR" />
          </span>
        </button>
      )}
    </div>
  )
}
