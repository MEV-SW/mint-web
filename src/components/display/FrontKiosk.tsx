import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import type { DashboardPostPreview } from '../../api/statsApi'
import { formatKioskDate } from '../../utils/date'
import { StoryPhoto } from '../posts/StoryPhoto'

const MIN_INTERVAL_SEC = 3
const MAX_INTERVAL_SEC = 60
const DEFAULT_INTERVAL_SEC = 8
const INTERVAL_STORAGE_KEY = 'mint.kioskIntervalSec'
const DIM_AFTER_MS = 3000

// #143 board geometry at scale 1 (1920×1080): mast + column heads 132, footer 80,
// one open row 340 and 4–6 collapsed rows of 88 in between.
const CHROME_TOP = 132
const CHROME_BOTTOM = 80
const OPEN_ROW = 340
const CLOSED_ROW = 88
const MIN_CLOSED = 4
const MAX_CLOSED = 6
// The open row may sit at most on the 4th visible line before the list scrolls up.
const ANCHOR = 3

function clampIntervalSec(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_INTERVAL_SEC
  return Math.min(MAX_INTERVAL_SEC, Math.max(MIN_INTERVAL_SEC, Math.round(value)))
}

function readStoredIntervalSec(): number {
  try {
    const raw = window.localStorage.getItem(INTERVAL_STORAGE_KEY)
    if (raw === null) return DEFAULT_INTERVAL_SEC
    return clampIntervalSec(Number(raw))
  } catch {
    return DEFAULT_INTERVAL_SEC
  }
}

function useKioskIntervalSec() {
  const [sec, setSec] = useState(readStoredIntervalSec)

  const update = useCallback((value: number) => {
    const clamped = clampIntervalSec(value)
    setSec(clamped)
    try {
      window.localStorage.setItem(INTERVAL_STORAGE_KEY, String(clamped))
    } catch {
      /* private mode or storage disabled — ignore */
    }
  }, [])

  return [sec, update] as const
}

type Props = {
  editionName: string
  stories: DashboardPostPreview[]
  featuredKeywords?: { id: string; name: string }[]
  onClose: () => void
}

function clockLabel(now: number): string {
  return new Date(now).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Wall clock shared by the footer label and the "보도" column (today/yesterday flips at midnight). */
function useNow() {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000)
    return () => window.clearInterval(id)
  }, [])

  return now
}

/** Collapsed-row count and scale for the window height (handoff §2). */
function boardFit(height: number): { closed: number; scale: number } {
  const list = height - CHROME_TOP - CHROME_BOTTOM
  const minimum = OPEN_ROW + MIN_CLOSED * CLOSED_ROW
  if (list < minimum) return { closed: MIN_CLOSED, scale: Math.max(0, list) / minimum }
  const closed = Math.floor((list - OPEN_ROW) / CLOSED_ROW)
  return { closed: Math.min(MAX_CLOSED, Math.max(MIN_CLOSED, closed)), scale: 1 }
}

function useBoardFit() {
  const [fit, setFit] = useState(() => boardFit(window.innerHeight))

  useEffect(() => {
    const onResize = () => setFit(boardFit(window.innerHeight))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return fit
}

/** Controls fade to 85% three seconds after the last pointer/touch activity. */
function useIdleDim(rootRef: React.RefObject<HTMLDivElement | null>) {
  const [dim, setDim] = useState(false)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    let timer = window.setTimeout(() => setDim(true), DIM_AFTER_MS)
    const wake = () => {
      setDim(false)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setDim(true), DIM_AFTER_MS)
    }
    root.addEventListener('pointermove', wake)
    root.addEventListener('pointerdown', wake)
    return () => {
      window.clearTimeout(timer)
      root.removeEventListener('pointermove', wake)
      root.removeEventListener('pointerdown', wake)
    }
  }, [rootRef])

  return dim
}

export function FrontKiosk({ editionName, stories, featuredKeywords = [], onClose }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const firstControlRef = useRef<HTMLButtonElement>(null)
  const fullscreenRef = useRef<HTMLButtonElement>(null)
  const [active, setActive] = useState(0)
  const [pausedByButton, setPausedByButton] = useState(false)
  const [holding, setHolding] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [intervalSec, setIntervalSec] = useKioskIntervalSec()
  const intervalMs = intervalSec * 1000
  const now = useNow()
  const { closed, scale } = useBoardFit()
  const dim = useIdleDim(rootRef)

  const count = stories.length
  const looping = count > 1
  const paused = pausedByButton || holding
  const deckKey = stories.map((item) => item.id).join('|')
  const visibleRows = closed + 1
  const top = Math.max(0, Math.min(active - ANCHOR, count - visibleRows))
  const lastVisible = Math.min(count, top + visibleRows)

  // A new deck (edition switch, refetch with different stories) starts again from the top.
  const [shownDeck, setShownDeck] = useState(deckKey)
  if (shownDeck !== deckKey) {
    setShownDeck(deckKey)
    setActive(0)
    setPausedByButton(false)
  }

  const go = useCallback(
    (delta: number) => {
      if (!looping) return
      setActive((current) => (((current + delta) % count) + count) % count)
    },
    [looping, count],
  )

  useEffect(() => {
    if (paused || !looping) return
    const timer = window.setTimeout(() => go(1), intervalMs)
    return () => window.clearTimeout(timer)
  }, [paused, looping, go, active, intervalMs])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      // The interval slider keeps its own arrow keys.
      if ((event.target as HTMLElement | null)?.closest?.('input')) return
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault()
        go(1)
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault()
        go(-1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, onClose])

  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  // Focus starts on the first control; on close it returns to the 1면 "전시" button.
  useLayoutEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    firstControlRef.current?.focus()
    return () => {
      if (document.fullscreenElement) void document.exitFullscreen()
      window.requestAnimationFrame(() => {
        const target = opener?.isConnected ? opener : document.querySelector<HTMLElement>('.np-kiosk-toggle')
        target?.focus()
      })
    }
  }, [])

  // Opened before the deck loaded: focus sat on 전체화면; move it to the pause button once it appears.
  useEffect(() => {
    if (!looping) return
    const current = document.activeElement
    if (current === fullscreenRef.current || current === document.body) firstControlRef.current?.focus()
  }, [looping])

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
        return
      }
      await rootRef.current?.requestFullscreen()
    } catch {
      /* browser or permission — ignore */
    }
  }

  const position = count <= 1 ? null : count <= visibleRows ? `${count}건` : `${top + 1}–${lastVisible} / ${count}`
  const boardStyle = {
    '--kiosk-scale': scale,
    '--kiosk-shift': top,
    '--kiosk-rows': closed,
  } as CSSProperties

  // Portalled to <body>: the 1면 page wrapper keeps a transform from its entry animation,
  // which would trap position: fixed inside the content column instead of the viewport.
  return createPortal(
    <div
      ref={rootRef}
      className={`front-kiosk${dim && !paused ? ' is-dim' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={`${editionName} 전시`}
    >
      <header className="front-kiosk-mast">
        <span className="front-kiosk-wordmark">MOTREXEV</span>
        <span className="front-kiosk-edition">
          {editionName || '1면'}
          <span aria-hidden> · </span>1면 전시
        </span>
        {position && (
          <span className="front-kiosk-position" aria-live="off">
            {position}
          </span>
        )}
        <div className="front-kiosk-controls">
          {looping && (
            <>
              <label className="front-kiosk-interval">
                <input
                  type="range"
                  min={MIN_INTERVAL_SEC}
                  max={MAX_INTERVAL_SEC}
                  step={1}
                  value={intervalSec}
                  onChange={(event) => setIntervalSec(Number(event.target.value))}
                  aria-label="자동 전환 간격(초)"
                />
                <span className="front-kiosk-interval-value">{intervalSec}초</span>
              </label>
              <button
                ref={firstControlRef}
                type="button"
                aria-pressed={pausedByButton}
                onClick={() => setPausedByButton((value) => !value)}
              >
                {pausedByButton ? (
                  '▶ 다시 재생'
                ) : (
                  <>
                    <span className="front-kiosk-pause-icon" aria-hidden />
                    일시정지
                  </>
                )}
              </button>
            </>
          )}
          <button
            ref={(node) => {
              fullscreenRef.current = node
              if (!looping) firstControlRef.current = node
            }}
            type="button"
            onClick={() => void toggleFullscreen()}
          >
            {isFullscreen ? '창 모드' : '전체화면'}
          </button>
          <button type="button" onClick={onClose} aria-label="전시 모드 종료 (Esc)">
            종료 Esc
          </button>
        </div>
      </header>

      {count > 0 ? (
        <>
          <div className="front-kiosk-heads" aria-hidden>
            <span>보도</span>
            <span>기사</span>
            <span>출처</span>
          </div>
          <div
            className="front-kiosk-board"
            style={boardStyle}
            onPointerDown={() => setHolding(true)}
            onPointerUp={() => setHolding(false)}
            onPointerCancel={() => setHolding(false)}
            onPointerLeave={() => setHolding(false)}
            // Focus moving into an off-screen row must not scroll the clipped viewport.
            onScroll={(event) => {
              event.currentTarget.scrollTop = 0
            }}
          >
            <ul className="front-kiosk-list" aria-label={`${editionName || '1면'} 기사`}>
              {stories.map((story, index) => {
                const open = index === active
                const offscreen = index < top || index >= lastVisible
                const date = formatKioskDate(story.published_at, story.collected_at, now)
                const source = story.source_name ?? ''
                return (
                  <li key={story.id} className={`front-kiosk-row${open ? ' is-open' : ''}`} inert={offscreen}>
                    <button
                      type="button"
                      className="front-kiosk-row-hit"
                      aria-expanded={open}
                      aria-current={open ? 'true' : undefined}
                      aria-label={[date.label, story.title, source].filter(Boolean).join(', ')}
                      onClick={() => setActive(index)}
                    >
                      <span className={`front-kiosk-date${date.text.length > 5 ? ' is-long' : ''}`}>
                        <span className="front-kiosk-date-value">{date.text}</span>
                        {date.collected && <span className="front-kiosk-date-note">수집</span>}
                      </span>
                      <span className="front-kiosk-copy">
                        <span className="front-kiosk-title">{story.title}</span>
                        {open && (
                          <span className="front-kiosk-dek">
                            {story.ai_summary || '요약이 준비되면 이곳에 표시됩니다.'}
                          </span>
                        )}
                      </span>
                      <span className="front-kiosk-source">{source}</span>
                    </button>
                    {open && (
                      <>
                        <span className="front-kiosk-photo" aria-hidden>
                          <StoryPhoto postId={story.id} src={story.image_url} />
                        </span>
                        {looping && paused && (
                          <span className="front-kiosk-paused" role="status">
                            <span className="front-kiosk-pause-icon" aria-hidden />
                            일시정지됨
                          </span>
                        )}
                        {looping && (
                          <span className="front-kiosk-progress" aria-hidden>
                            <span
                              key={`${story.id}-${paused ? 'p' : 'r'}-${intervalSec}`}
                              className="front-kiosk-progress-fill"
                              style={{
                                animationDuration: `${intervalMs}ms`,
                                animationPlayState: paused ? 'paused' : 'running',
                              }}
                            />
                          </span>
                        )}
                      </>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        </>
      ) : (
        <div className="front-kiosk-empty">
          <p className="front-kiosk-empty-title">이 1면에 전시할 기사가 없습니다.</p>
          <p className="front-kiosk-empty-note">
            기사가 들어오면 자동으로 채워집니다.<span aria-hidden> · </span>종료 Esc
          </p>
        </div>
      )}

      <footer className="front-kiosk-foot">
        <span className="front-kiosk-keywords">
          {featuredKeywords.length > 0 && (
            <>
              <span className="front-kiosk-keywords-label">분야 키워드</span>
              {featuredKeywords.map((item) => item.name).join(' · ')}
            </>
          )}
        </span>
        <time>{clockLabel(now)}</time>
      </footer>
    </div>,
    document.body,
  )
}
