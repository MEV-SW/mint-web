import { useCallback, useEffect, useRef, useState } from 'react'
import type { DashboardPostPreview } from '../../api/statsApi'
import { formatDate } from '../../utils/date'
import { EditorialPhotoSlot } from '../dashboard/EditorialPhotoSlot'

const INTERVAL_MS = 12_000

type Props = {
  editionName: string
  stories: DashboardPostPreview[]
  heroImageUrl: string | null
  heroImageSeed?: string
  onClose: () => void
}

function folio(n: number): string {
  return String(n).padStart(2, '0')
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
  heroImageUrl,
  heroImageSeed,
  onClose,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const clock = useClockLabel()

  const count = stories.length
  const story = stories[index]
  const isHero = index === 0
  const deckKey = stories.map((item) => item.id).join('|')
  const year = new Date().toLocaleDateString('en', { timeZone: 'Asia/Seoul', year: 'numeric' })

  const go = useCallback(
    (delta: number) => {
      if (count < 1) return
      setIndex((current) => (current + delta + count) % count)
    },
    [count],
  )

  useEffect(() => {
    setIndex(0)
  }, [deckKey])

  useEffect(() => {
    if (paused || count <= 1) return
    const timer = window.setInterval(() => go(1), INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [paused, count, go, index])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        go(1)
      }
      if (event.key === 'ArrowLeft') {
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

  const showPlate = Boolean(isHero && heroImageUrl)

  return (
    <div
      ref={rootRef}
      className="front-kiosk"
      role="dialog"
      aria-modal="true"
      aria-label={`${editionName} 전시`}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
    >
      <header className="front-kiosk-mast">
        <div className="front-kiosk-mast-brand">
          <span className="front-kiosk-wordmark">MINT</span>
          <span className="front-kiosk-wordmark-sub">MotrexEV · {year}</span>
        </div>
        <div className="front-kiosk-mast-center">
          <span className="front-kiosk-edition">{editionName || '1면'}</span>
          {count > 1 && (
            <span
              key={`${story?.id ?? index}-${paused ? 'p' : 'r'}`}
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

      {count > 1 && (
        <>
          <button type="button" className="front-kiosk-skip is-prev" aria-label="이전 기사" onClick={() => go(-1)}>
            이전
          </button>
          <button type="button" className="front-kiosk-skip is-next" aria-label="다음 기사" onClick={() => go(1)}>
            다음
          </button>
        </>
      )}

      <div className="front-kiosk-stage">
        {story ? (
          <article key={story.id} className={`front-kiosk-slide${showPlate ? ' has-plate' : ''}`}>
            <div className="front-kiosk-copy">
              <p className="front-kiosk-kicker">
                <em>{folio(index + 1)}</em>
                <span aria-hidden />
                {editionName || '1면'}
              </p>
              <h1 className="front-kiosk-title">{story.title}</h1>
              <p className="front-kiosk-dek">
                {story.ai_summary || '요약이 준비되면 이곳에 표시됩니다.'}
              </p>
              <p className="front-kiosk-byline">
                <b>{story.source_name ?? '출처'}</b>
                <span>{formatDate(story.collected_at)}</span>
              </p>
            </div>
            <aside className="front-kiosk-plate" aria-hidden={!showPlate}>
              {showPlate ? (
                <EditorialPhotoSlot src={heroImageUrl} seed={heroImageSeed ?? story.id} canRegenerate={false} />
              ) : (
                <div className="front-kiosk-folio">
                  <span>{folio(index + 1)}</span>
                  <small>
                    {count > 0 ? `${folio(index + 1)} / ${folio(count)}` : ''}
                  </small>
                </div>
              )}
            </aside>
          </article>
        ) : (
          <div className="front-kiosk-empty">
            <p>이 1면에 전시할 기사가 없습니다.</p>
            <button type="button" onClick={onClose}>
              1면으로
            </button>
          </div>
        )}
      </div>

      {count > 1 && (
        <nav className="front-kiosk-index" aria-label="슬라이드">
          {stories.map((item, i) => (
            <button
              key={item.id}
              type="button"
              className={i === index ? 'is-on' : undefined}
              aria-label={`${i + 1}번째 기사`}
              aria-current={i === index ? 'true' : undefined}
              onClick={() => setIndex(i)}
            >
              {folio(i + 1)}
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}
