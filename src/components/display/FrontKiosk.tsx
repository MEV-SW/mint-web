import { useCallback, useEffect, useLayoutEffect, useRef, useState, type TransitionEvent } from 'react'
import type { DashboardPostPreview } from '../../api/statsApi'
import { formatDate } from '../../utils/date'
import { StoryPhoto } from '../posts/StoryPhoto'

const INTERVAL_MS = 8_000
const VISIBLE = 4
const SLOT_OFFSETS = [-1, 0, 1, 2, 3, 4] as const

type Shift = 'rest' | 'fwd' | 'back'

type Props = {
  editionName: string
  stories: DashboardPostPreview[]
  onClose: () => void
}

function folio(n: number): string {
  return String(n).padStart(2, '0')
}

function wrap(index: number, count: number): number {
  if (count < 1) return 0
  return ((index % count) + count) % count
}

function useClockLabel() {
  const [label, setLabel] = useState(() =>
    new Date().toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
    }),
  )

  useEffect(() => {
    const tick = () =>
      setLabel(
        new Date().toLocaleString('ko-KR', {
          timeZone: 'Asia/Seoul',
          month: 'long',
          day: 'numeric',
          weekday: 'long',
          hour: '2-digit',
          minute: '2-digit',
        }),
      )
    const id = window.setInterval(tick, 15_000)
    return () => window.clearInterval(id)
  }, [])

  return label
}

export function FrontKiosk({
  editionName,
  stories,
  onClose,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const snapRef = useRef(false)
  const shiftRef = useRef<Shift>('rest')
  const [topIndex, setTopIndex] = useState(0)
  const [shift, setShift] = useState<Shift>('rest')
  const [paused, setPaused] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const clock = useClockLabel()

  const count = stories.length
  const looping = count > 1
  const deckKey = stories.map((item) => item.id).join('|')
  const year = new Date().toLocaleDateString('en', { timeZone: 'Asia/Seoul', year: 'numeric' })
  const visible = Array.from({ length: VISIBLE }, (_, i) => wrap(topIndex + i, count))
  shiftRef.current = shift

  const go = useCallback(
    (delta: number) => {
      if (!looping || delta === 0 || shiftRef.current !== 'rest') return
      const next: Shift = delta > 0 ? 'fwd' : 'back'
      shiftRef.current = next
      setShift(next)
    },
    [looping],
  )

  const settle = useCallback(
    (dir: 1 | -1) => {
      if (shiftRef.current === 'rest') return
      shiftRef.current = 'rest'
      snapRef.current = true
      setTopIndex((current) => wrap(current + dir, count))
      setShift('rest')
    },
    [count],
  )

  useEffect(() => {
    setTopIndex(0)
    setShift('rest')
    shiftRef.current = 'rest'
    snapRef.current = false
    setPaused(false)
  }, [deckKey])

  useLayoutEffect(() => {
    if (!snapRef.current) return
    const track = trackRef.current
    track?.classList.add('is-snap')
    void track?.offsetWidth
    snapRef.current = false
    requestAnimationFrame(() => track?.classList.remove('is-snap'))
  }, [topIndex, shift])

  useEffect(() => {
    if (shift === 'rest') return
    const track = trackRef.current
    const ms = track ? Number.parseFloat(getComputedStyle(track).transitionDuration) * 1000 : 0
    const dir = shift === 'fwd' ? (1 as const) : (-1 as const)
    if (!Number.isFinite(ms) || ms <= 0) {
      settle(dir)
      return
    }
    const fallback = window.setTimeout(() => settle(dir), ms + 80)
    return () => window.clearTimeout(fallback)
  }, [shift, settle])

  useEffect(() => {
    if (paused || !looping || shift !== 'rest') return
    const timer = window.setInterval(() => go(1), INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [paused, looping, go, shift, topIndex])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
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

  useEffect(() => {
    return () => {
      if (document.fullscreenElement) void document.exitFullscreen()
    }
  }, [])

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

  function jumpTo(index: number) {
    if (!looping || shiftRef.current !== 'rest' || index === topIndex) return
    snapRef.current = true
    setTopIndex(index)
    setShift('rest')
  }

  function onTrackTransitionEnd(event: TransitionEvent<HTMLDivElement>) {
    if (event.target !== trackRef.current) return
    if (event.propertyName !== 'transform') return
    if (shift === 'rest') return
    settle(shift === 'fwd' ? 1 : -1)
  }

  const slots = looping
    ? SLOT_OFFSETS.map((offset) => {
        const index = wrap(topIndex + offset, count)
        return { offset, index, story: stories[index] }
      })
    : stories[0]
      ? [{ offset: 0, index: 0, story: stories[0] }]
      : []

  return (
    <div
      ref={rootRef}
      className="front-kiosk"
      role="dialog"
      aria-modal="true"
      aria-label={`${editionName} 전시`}
    >
      <header className="front-kiosk-mast">
        <div className="front-kiosk-mast-brand">
          <span className="front-kiosk-wordmark">MINT</span>
          <span className="front-kiosk-wordmark-sub">MotrexEV · {year}</span>
        </div>
        <div className="front-kiosk-mast-center">
          <span className="front-kiosk-edition">{editionName || '1면'}</span>
          {looping && shift === 'rest' && (
            <span
              key={`${stories[topIndex]?.id ?? topIndex}-${paused ? 'p' : 'r'}`}
              className="front-kiosk-progress-fill"
              style={{ animationDuration: `${INTERVAL_MS}ms`, animationPlayState: paused ? 'paused' : 'running' }}
            />
          )}
        </div>
        <div className="front-kiosk-mast-end">
          <time>{clock}</time>
          <span className="front-kiosk-mast-actions">
            <button type="button" onClick={() => void toggleFullscreen()}>
              {isFullscreen ? '창 모드' : '전체화면'}
            </button>
            <button type="button" onClick={onClose}>
              1면
            </button>
          </span>
        </div>
      </header>

      {looping && (
        <>
          <button type="button" className="front-kiosk-skip is-prev" aria-label="이전 기사" onClick={() => go(-1)}>
            이전
          </button>
          <button type="button" className="front-kiosk-skip is-next" aria-label="다음 기사" onClick={() => go(1)}>
            다음
          </button>
        </>
      )}

      <div
        className={`front-kiosk-stage${looping ? ' is-ticker' : ' is-single'}`}
        onPointerDown={(event) => {
          if ((event.target as HTMLElement).closest('button, a')) return
          setPaused(true)
        }}
        onPointerUp={() => setPaused(false)}
        onPointerCancel={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
      >
        {slots.length > 0 ? (
          <div
            ref={trackRef}
            className={`front-kiosk-track is-${shift}`}
            onTransitionEnd={onTrackTransitionEnd}
          >
            {slots.map((slot) => {
              return (
                <article key={`${slot.story.id}-${slot.offset}`} className="front-kiosk-card has-plate">
                  <div className="front-kiosk-copy">
                    <p className="front-kiosk-kicker">
                      <em>{folio(slot.index + 1)}</em>
                      <span aria-hidden />
                      {editionName || '1면'}
                    </p>
                    <h1 className="front-kiosk-title">{slot.story.title}</h1>
                    <p className="front-kiosk-dek">
                      {slot.story.ai_summary || '요약이 준비되면 이곳에 표시됩니다.'}
                    </p>
                    <p className="front-kiosk-byline">
                      <b>{slot.story.source_name ?? '출처'}</b>
                      <span>{formatDate(slot.story.collected_at)}</span>
                    </p>
                  </div>
                  <aside className="front-kiosk-plate">
                    <StoryPhoto postId={slot.story.id} src={slot.story.image_url} />
                  </aside>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="front-kiosk-empty">
            <p>이 1면에 전시할 기사가 없습니다.</p>
            <button type="button" onClick={onClose}>
              1면으로
            </button>
          </div>
        )}
      </div>

      {looping && (
        <nav className="front-kiosk-index" aria-label="슬라이드">
          {stories.map((item, i) => (
            <button
              key={item.id}
              type="button"
              className={visible.includes(i) ? 'is-on' : undefined}
              aria-label={`${i + 1}번째 기사`}
              aria-current={i === topIndex ? 'true' : undefined}
              onClick={() => jumpTo(i)}
            >
              {folio(i + 1)}
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}
