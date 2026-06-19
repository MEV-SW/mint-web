import { useEffect, useRef, useState } from 'react'
import { fetchOriginalPreview } from '../../api/postApi'
import { Icon } from '../common/Icon'

const FRAME_BASE_W = 1280

interface FrameLayout {
  scale: number
  frameH: number
  w: number
  h: number
}

interface PostOriginalPaneProps {
  postId: string
  url: string | null | undefined
  rawContent?: string
  title: string
}

export function PostOriginalPane({ postId, url, rawContent, title }: PostOriginalPaneProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [layout, setLayout] = useState<FrameLayout>({
    scale: 0.55,
    frameH: 900,
    w: 400,
    h: 500,
  })
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewState, setPreviewState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [previewError, setPreviewError] = useState<string | null>(null)
  const hasUrl = Boolean(url)
  const hasRaw = Boolean(rawContent?.trim())

  useEffect(() => {
    if (!hasUrl) {
      setPreviewState('idle')
      setPreviewError(null)
      return
    }

    let cancelled = false
    setPreviewState('loading')
    setPreviewError(null)

    fetchOriginalPreview(postId)
      .then((html) => {
        if (cancelled) return
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return URL.createObjectURL(blob)
        })
        setPreviewState('ready')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const detail = (err as { response?: { data?: string | { detail?: string } } })?.response?.data
        const message =
          typeof detail === 'string'
            ? detail
            : detail?.detail || '원문 미리보기를 불러오지 못했습니다.'
        setPreviewError(message)
        setPreviewState('error')
      })

    return () => {
      cancelled = true
    }
  }, [hasUrl, postId, url])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  useEffect(() => {
    const el = viewportRef.current
    if (!el || !hasUrl || previewState !== 'ready') return

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
  }, [hasUrl, previewState, url])

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
            {previewState === 'loading' && (
              <div className="post-split-frame-status">원문을 불러오는 중…</div>
            )}
            {previewState === 'error' && (
              <div className="post-split-frame-status post-split-frame-status-error">
                <p>{previewError}</p>
                <p>
                  많은 뉴스 사이트는 iframe 삽입을 막습니다.{' '}
                  <button type="button" className="post-split-inline-link" onClick={openOriginal}>
                    새 탭에서 원문 열기
                  </button>
                </p>
              </div>
            )}
            {previewState === 'ready' && previewUrl && (
              <div
                className="post-split-frame-scaler"
                style={{ width: layout.w, height: layout.h }}
              >
                <iframe
                  className="post-split-frame"
                  src={previewUrl}
                  title={`${title} 원문`}
                  sandbox="allow-same-origin allow-popups"
                  loading="lazy"
                  style={{
                    width: FRAME_BASE_W,
                    height: layout.frameH,
                    transform: `scale(${layout.scale})`,
                  }}
                />
              </div>
            )}
          </div>
          <div className="post-split-frame-note">
            서버에서 원문 HTML을 받아 미리보기합니다.{' '}
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
