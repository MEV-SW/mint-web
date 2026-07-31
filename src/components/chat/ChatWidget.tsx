import { useMutation } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
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
    '안녕하세요! EV·충전 관련 질문은 MINT에 수집된 기사를 먼저 찾아 답변합니다.\n그 외 질문은 일반 지식 답변을 안내해 드릴게요.',
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

function ChatCitations({
  citations,
  onNavigate,
}: {
  citations: ChatCitation[]
  onNavigate: () => void
}) {
  if (citations.length === 0) return null

  return (
    <details className="chat-citations">
      <summary className="chat-citations-summary">
        <Icon name="chevD" />
        <span>참고한 게시글 {citations.length}건</span>
      </summary>
      <ul className="chat-citations-list">
        {citations.map((c) => (
          <li key={c.post_id} className="chat-citation-item">
            <Link to={`/posts/${c.post_id}`} onClick={onNavigate}>
              {c.title}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  )
}

export function ChatWidget() {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME])
  const messagesRef = useRef<HTMLDivElement>(null)

  const scrollBottom = () => {
    requestAnimationFrame(() => {
      const el = messagesRef.current
      if (el) el.scrollTop = el.scrollHeight
    })
  }

  const appendAssistant = (msg: Omit<ChatMessage, 'role'>) => {
    setMessages((prev) => [...prev, { role: 'assistant', ...msg }])
    setTimeout(scrollBottom, 50)
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
      content: '알겠습니다. EV·충전이나 MINT 수집 자료 관련 질문을 해 주세요.',
    })
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    submit(input)
  }

  useEffect(() => {
    if (open) scrollBottom()
  }, [open])

  return (
    <div className={`chat-widget${open ? ' is-open' : ''}`} aria-live="polite">
      {open && (
        <div className="chat-widget-panel" role="dialog" aria-label="MINT AI 챗봇">
          <div className="chat-widget-hero">
            <div className="chat-widget-hero-inner">
              <div className="chat-ai-avatar chat-ai-avatar--hero" aria-hidden>
                ✦
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
            <div className="chat-widget-messages" ref={messagesRef}>
              <div className="chat-messages">
              {messages.map((m, i) => (
                <div key={i} className={`chat-bubble ${m.role}`}>
                  {m.role === 'assistant' && (
                    <div className="chat-bubble-avatar" aria-hidden>
                      ✦
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
                      <ChatCitations citations={m.citations} onNavigate={() => setOpen(false)} />
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
                    ✦
                  </div>
                  <div className="chat-bubble-content">
                    <div className="chat-bubble-label">MINT AI</div>
                    <div className="chat-bubble-body chat-loading">
                      답변 생성 중 <TypingDots />
                    </div>
                  </div>
                </div>
              )}
              </div>
            </div>

            {messages.length <= 1 && (
              <div className="chat-suggestions chat-widget-suggestions">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" className="chat-chip" onClick={() => submit(s)}>
                    <span className="chat-chip-mark" aria-hidden>
                      ✦
                    </span>
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
          className="chat-widget-fab"
          title="MINT AI 열기"
          aria-label="MINT AI 챗봇 열기"
          aria-expanded={false}
          onClick={() => setOpen(true)}
        >
          <span className="chat-widget-fab-icon" aria-hidden>
            ✦
          </span>
          <span className="chat-widget-fab-copy">
            <strong>MINT AI</strong>
            <span>무엇이든 물어보세요</span>
          </span>
          <span className="chat-widget-fab-arrow" aria-hidden>
            →
          </span>
        </button>
      )}
    </div>
  )
}
