import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'

export type FrontSpreadPage = 'mine' | 'mint'

interface FrontPageSpreadProps {
  page: FrontSpreadPage
  onPageChange: (page: FrontSpreadPage) => void
  mine: ReactNode
  mint: ReactNode
}

const SWIPE_THRESHOLD_RATIO = 0.18
const DRAG_START_PX = 10

export function FrontPageSpread({ page, onPageChange, mine, mint }: FrontPageSpreadProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [viewportWidth, setViewportWidth] = useState(0)
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const pointerStart = useRef({ x: 0, y: 0, active: false, moved: false })

  const index = page === 'mint' ? 0 : 1

  useLayoutEffect(() => {
    const el = viewportRef.current
    if (!el) return

    const measure = () => setViewportWidth(el.clientWidth)
    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const rubberBand = useCallback(
    (dx: number) => {
      if (index === 0 && dx > 0) return dx * 0.25
      if (index === 1 && dx < 0) return dx * 0.25
      return dx
    },
    [index],
  )

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('a, button, input, textarea, select, label')) return

    pointerStart.current = { x: e.clientX, y: e.clientY, active: true, moved: false }
    setDragX(0)
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointerStart.current.active) return

    const dx = e.clientX - pointerStart.current.x
    const dy = e.clientY - pointerStart.current.y

    if (!pointerStart.current.moved) {
      if (Math.abs(dx) < DRAG_START_PX && Math.abs(dy) < DRAG_START_PX) return
      if (Math.abs(dy) > Math.abs(dx)) {
        pointerStart.current.active = false
        return
      }
      pointerStart.current.moved = true
      setIsDragging(true)
      viewportRef.current?.setPointerCapture(e.pointerId)
    }

    e.preventDefault()
    setDragX(rubberBand(dx))
  }

  const finishDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointerStart.current.active) return

    const wasDrag = pointerStart.current.moved
    const startX = pointerStart.current.x
    pointerStart.current.active = false
    pointerStart.current.moved = false

    if (wasDrag) {
      viewportRef.current?.releasePointerCapture(e.pointerId)
      const dx = e.clientX - startX
      const threshold = viewportWidth * SWIPE_THRESHOLD_RATIO

      if (dx < -threshold && page === 'mint') onPageChange('mine')
      else if (dx > threshold && page === 'mine') onPageChange('mint')
    }

    setIsDragging(false)
    setDragX(0)
  }

  const translateX = viewportWidth > 0 ? -index * viewportWidth + dragX : 0
  const sheetStyle =
    viewportWidth > 0
      ? { flex: `0 0 ${viewportWidth}px`, width: viewportWidth, maxWidth: viewportWidth }
      : undefined

  return (
    <div className="np-spread" data-page={page}>
      <div className="np-spread-edition-bar" role="tablist" aria-label="1면 선택">
        <button
          type="button"
          role="tab"
          aria-selected={page === 'mint'}
          className={`np-spread-edition-tab${page === 'mint' ? ' active' : ''}`}
          onClick={() => onPageChange('mint')}
        >
          MINT Daily
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={page === 'mine'}
          className={`np-spread-edition-tab${page === 'mine' ? ' active' : ''}`}
          onClick={() => onPageChange('mine')}
        >
          나만의 1면
        </button>
      </div>

      <div
        ref={viewportRef}
        className={`np-spread-viewport${isDragging ? ' is-dragging' : ''}`}
        style={
          viewportWidth > 0
            ? ({ ['--spread-viewport-width' as string]: `${viewportWidth}px` } as CSSProperties)
            : undefined
        }
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onPointerLeave={finishDrag}
      >
        <div
          className="np-spread-track"
          style={{
            transform: `translate3d(${translateX}px, 0, 0)`,
            transition: isDragging ? 'none' : 'transform 0.42s cubic-bezier(0.32, 0.72, 0, 1)',
          }}
        >
          <div className="np-spread-sheet" style={sheetStyle} aria-hidden={page !== 'mint' && !isDragging}>
            <div className="np-newspaper-page">{mint}</div>
          </div>
          <div className="np-spread-sheet" style={sheetStyle} aria-hidden={page !== 'mine' && !isDragging}>
            <div className="np-newspaper-page">{mine}</div>
          </div>
        </div>
      </div>

      <p className="np-spread-hint" aria-hidden>
        ← 드래그하여 1면을 넘기세요 →
      </p>
    </div>
  )
}
