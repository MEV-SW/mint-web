import { useEffect, useRef, useState } from 'react'
import { Icon } from '../common/Icon'

const FRAME_BASE_W = 1280

interface FrameLayout {
  scale: number
  frameH: number
  w: number
  h: number
}

interface PostOriginalPaneProps {
  url: string | null | undefined
  rawContent?: string
  title: string
}

export function PostOriginalPane({ url, rawContent, title }: PostOriginalPaneProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [layout, setLayout] = useState<FrameLayout>({
    scale: 0.55,
    frameH: 900,
    w: 400,
    h: 500,
  })
  const hasUrl = Boolean(url)
  const hasRaw = Boolean(rawContent?.trim())

  useEffect(() => {
    const el = viewportRef.current
    if (!el || !hasUrl) return

    const updateLayout = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      if (w <= 0 || h <= 0) return

      const scale = Math.max(0.28, Math.min(w / FRAME_BASE_W, 1))
      const frameH = h / scale

      setLayout({ scale, frameH, w, h })
    }

    updateLayout()
    const ro = new ResizeObserver(updateLayout)
    ro.observe(el)
    return () => ro.disconnect()
  }, [hasUrl, url])

  const openOriginal = () => {
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="post-original-pane">
      <div className="post-split-head">
        <span>원문 · 미리보기</span>
        {hasUrl && (
          <button type="button" className="post-split-head-link" onClick={openOriginal}>
            새 탭에서 열기 <Icon name="ext" />
          </button>
        )}
      </div>

      {hasUrl ? (
        <>
          <div className="post-split-frame-viewport" ref={viewportRef}>
            <div
              className="post-split-frame-scaler"
              style={{ width: layout.w, height: layout.h }}
            >
              <iframe
                className="post-split-frame"
                src={url!}
                title={`${title} 원문`}
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                referrerPolicy="no-referrer-when-downgrade"
                loading="lazy"
                style={{
                  width: FRAME_BASE_W,
                  height: layout.frameH,
                  transform: `scale(${layout.scale})`,
                }}
              />
            </div>
          </div>
          <div className="post-split-frame-note">
            패널 크기에 맞춘 미리보기입니다. 더 긴 본문은 iframe 안에서 스크롤하세요.{' '}
            <button type="button" className="post-split-inline-link" onClick={openOriginal}>
              새 탭에서 원문 열기
            </button>
          </div>
        </>
      ) : hasRaw ? (
        <div className="post-split-raw">{rawContent}</div>
      ) : (
        <div className="post-split-empty">
          <p>연결된 원문 URL이 없습니다.</p>
        </div>
      )}
    </div>
  )
}
