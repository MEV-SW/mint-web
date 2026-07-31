import { useCallback, useEffect, useRef, useState } from 'react'
import { checkPostEmbeddable, fetchOriginalPreview } from '../../api/postApi'
import { Icon } from '../common/Icon'

const FRAME_BASE_W = 1280
const EMBED_CHECK_MS = 800
const EMBED_RECHECK_MS = 1500
const EMBED_GIVE_UP_MS = 5000

interface FrameLayout {
  scale: number
  frameH: number
  w: number
  h: number
}

type ContentMode = 'checking' | 'direct' | 'stored-body' | 'fetched' | 'unavailable'

interface PostOriginalPaneProps {
  postId: string
  url: string | null | undefined
  rawContent?: string
  title: string
}

function isIframeEmbedBlocked(iframe: HTMLIFrameElement): boolean {
  try {
    const win = iframe.contentWindow
    if (!win) return true

    let href = ''
    try {
      href = win.location.href
    } catch {
      // Cross-origin successful embed — cannot inspect document.
      return false
    }

    if (!href || href === 'about:blank') return true
    if (/^(about:|chrome-error:|chrome:\/\/)/i.test(href)) return true

    const doc = win.document
    if (!doc?.body) return true

    const text = (doc.body.innerText || '').trim()
    if (
      /refused to connect|x-frame-options|frame-ancestors|연결을 거부|표시할 수 없/i.test(text)
    ) {
      return true
    }

    return doc.body.childElementCount === 0 && text.length === 0
  } catch {
    return false
  }
}

export function PostOriginalPane({ postId, url, rawContent, title }: PostOriginalPaneProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const directIframeRef = useRef<HTMLIFrameElement>(null)
  const embedCheckTimerRef = useRef<number | null>(null)
  const contentModeRef = useRef<ContentMode>('checking')
  const directPhaseRef = useRef<'loading' | 'ready'>('loading')

  const [layout, setLayout] = useState<FrameLayout>({
    scale: 0.55,
    frameH: 900,
    w: 400,
    h: 500,
  })
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fetchPhase, setFetchPhase] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null)
  const [directPhase, setDirectPhase] = useState<'loading' | 'ready'>('loading')

  const hasUrl = Boolean(url)
  const storedBody = rawContent?.trim() ?? ''
  const hasStoredBody = storedBody.length > 0

  const [contentMode, setContentMode] = useState<ContentMode>(() => {
    if (hasUrl) return 'checking'
    if (hasStoredBody) return 'stored-body'
    return 'unavailable'
  })

  contentModeRef.current = contentMode
  directPhaseRef.current = directPhase

  const openOriginal = () => {
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
  }

  const showUnavailable = useCallback((reason?: string) => {
    setUnavailableReason(
      reason ||
        (hasUrl
          ? 'iframe 삽입이 차단되었고, 저장본·서버 미리보기도 없습니다.'
          : '연결된 원문 URL과 수집 본문이 없습니다.'),
    )
    setContentMode('unavailable')
  }, [hasUrl])

  const switchToFallback = useCallback(() => {
    if (hasStoredBody) {
      setUnavailableReason(null)
      setContentMode('stored-body')
      return
    }
    if (hasUrl) {
      setContentMode('fetched')
      return
    }
    showUnavailable()
  }, [hasStoredBody, hasUrl, showUnavailable])

  const clearEmbedCheckTimer = () => {
    if (embedCheckTimerRef.current !== null) {
      window.clearTimeout(embedCheckTimerRef.current)
      embedCheckTimerRef.current = null
    }
  }

  const scheduleEmbedCheck = useCallback(() => {
    clearEmbedCheckTimer()

    const runCheck = (onBlocked: () => void) => {
      const iframe = directIframeRef.current
      if (!iframe || contentModeRef.current !== 'direct') return
      if (isIframeEmbedBlocked(iframe)) onBlocked()
      else {
        setDirectPhase('ready')
        directPhaseRef.current = 'ready'
      }
    }

    embedCheckTimerRef.current = window.setTimeout(() => {
      runCheck(() => {
        embedCheckTimerRef.current = window.setTimeout(() => {
          runCheck(() => switchToFallback())
        }, EMBED_RECHECK_MS)
      })
    }, EMBED_CHECK_MS)
  }, [switchToFallback])

  useEffect(() => {
    if (!hasUrl) {
      setContentMode(hasStoredBody ? 'stored-body' : 'unavailable')
      return
    }

    let cancelled = false
    setContentMode('checking')

    checkPostEmbeddable(postId)
      .then((embeddable) => {
        if (cancelled) return
        if (embeddable) {
          setContentMode('direct')
        } else {
          switchToFallback()
        }
      })
      .catch(() => {
        if (!cancelled) switchToFallback()
      })

    return () => {
      cancelled = true
    }
  }, [hasUrl, hasStoredBody, postId, switchToFallback])

  useEffect(() => {
    if (contentMode !== 'direct') {
      clearEmbedCheckTimer()
      return
    }

    setDirectPhase('loading')
    directPhaseRef.current = 'loading'

    const giveUp = window.setTimeout(() => {
      if (contentModeRef.current !== 'direct') return
      if (directPhaseRef.current === 'ready') return
      const iframe = directIframeRef.current
      if (!iframe || isIframeEmbedBlocked(iframe) || directPhaseRef.current === 'loading') {
        switchToFallback()
      }
    }, EMBED_GIVE_UP_MS)

    return () => {
      clearEmbedCheckTimer()
      window.clearTimeout(giveUp)
    }
  }, [contentMode, url, switchToFallback])

  useEffect(() => {
    if (contentMode !== 'fetched') {
      setFetchPhase('idle')
      return
    }

    let cancelled = false
    setFetchPhase('loading')

    fetchOriginalPreview(postId)
      .then((html) => {
        if (cancelled) return
        if (!html?.trim()) {
          if (hasStoredBody) {
            setContentMode('stored-body')
            return
          }
          setFetchPhase('error')
          showUnavailable('표시할 원문 본문이 없습니다.')
          return
        }
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return URL.createObjectURL(blob)
        })
        setFetchPhase('ready')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (hasStoredBody) {
          setContentMode('stored-body')
          return
        }
        const detail = (err as { response?: { data?: string | { detail?: string } } })?.response?.data
        const message =
          typeof detail === 'string'
            ? detail
            : detail?.detail || '원문 본문을 가져오지 못했습니다.'
        setFetchPhase('error')
        showUnavailable(message)
      })

    return () => {
      cancelled = true
    }
  }, [contentMode, postId, hasStoredBody, showUnavailable])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  useEffect(() => {
    const el = viewportRef.current
    if (!el || contentMode !== 'fetched' || fetchPhase !== 'ready') return

    const updateLayout = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      if (w <= 0 || h <= 0) return

      const scale = Math.max(0.35, Math.min(w / FRAME_BASE_W, 1))
      const frameH = h / scale

      setLayout({ scale, frameH, w, h })
    }

    updateLayout()
    const ro = new ResizeObserver(updateLayout)
    ro.observe(el)
    return () => ro.disconnect()
  }, [contentMode, fetchPhase, url])

  const headLabel =
    contentMode === 'checking' || contentMode === 'direct'
      ? '원문 · 미리보기'
      : contentMode === 'stored-body'
        ? '수집 본문'
        : contentMode === 'fetched'
          ? '원문 · 본문 가져오기'
          : '원문'

  const frameNote =
    contentMode === 'direct' && directPhase === 'ready' ? (
      <>
        원문 사이트를 iframe으로 표시합니다.{' '}
        <button type="button" className="post-split-inline-link" onClick={openOriginal}>
          새 탭에서 열기
        </button>
      </>
    ) : contentMode === 'stored-body' ? (
      <>
        iframe 삽입이 막혀 저장해 둔 수집 본문을 표시합니다.{' '}
        {hasUrl && (
          <button type="button" className="post-split-inline-link" onClick={openOriginal}>
            원문 사이트 열기
          </button>
        )}
      </>
    ) : contentMode === 'fetched' && fetchPhase === 'ready' ? (
      <>
        서버에서 원문 HTML을 받아 표시합니다.{' '}
        <button type="button" className="post-split-inline-link" onClick={openOriginal}>
          새 탭에서 열기
        </button>
      </>
    ) : contentMode === 'unavailable' ? (
      <>
        원문을 이 화면에서 표시할 수 없습니다.{' '}
        {hasUrl && (
          <button type="button" className="post-split-inline-link" onClick={openOriginal}>
            새 탭에서 원문 열기
          </button>
        )}
      </>
    ) : null

  return (
    <div className="post-original-pane">
      <div className="post-split-head">
        <span>{headLabel}</span>
        {hasUrl && (
          <button type="button" className="post-split-head-link" onClick={openOriginal}>
            새 탭에서 열기 <Icon name="ext" />
          </button>
        )}
      </div>

      {contentMode === 'stored-body' && (
        <div className="post-split-raw post-split-raw-stored">{storedBody}</div>
      )}

      {(contentMode === 'checking' || contentMode === 'direct') && hasUrl && (
        <div className="post-split-frame-viewport post-split-frame-viewport-direct" ref={viewportRef}>
          {(contentMode === 'checking' || directPhase === 'loading') && (
            <div className="post-split-frame-status post-split-frame-status-overlay">
              {contentMode === 'checking' ? '원문 표시 방식 확인 중…' : '원문을 불러오는 중…'}
            </div>
          )}
          {contentMode === 'direct' && (
            <iframe
              ref={directIframeRef}
              className="post-split-frame post-split-frame-direct"
              src={url!}
              title={`${title} 원문`}
              loading="lazy"
              onLoad={scheduleEmbedCheck}
              style={{ opacity: directPhase === 'loading' ? 0 : 1 }}
            />
          )}
        </div>
      )}

      {contentMode === 'fetched' && hasUrl && (
        <div className="post-split-frame-viewport" ref={viewportRef}>
          {fetchPhase === 'loading' && (
            <div className="post-split-frame-status">본문을 가져오는 중…</div>
          )}
          {fetchPhase === 'ready' && previewUrl && (
            <div className="post-split-frame-scaler" style={{ width: layout.w, height: layout.h }}>
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
      )}

      {contentMode === 'unavailable' && (
        <div className="post-split-empty post-split-unavailable">
          <p className="post-split-unavailable-title">원문을 표시할 수 없습니다</p>
          <p>
            {unavailableReason ||
              (hasUrl
                ? 'iframe 삽입이 차단되었고, 저장본·서버 미리보기도 없습니다.'
                : '연결된 원문 URL과 수집 본문이 없습니다.')}
          </p>
          {hasUrl && (
            <button type="button" className="post-split-unavailable-btn" onClick={openOriginal}>
              새 탭에서 원문 열기
            </button>
          )}
        </div>
      )}

      {frameNote && <div className="post-split-frame-note">{frameNote}</div>}
    </div>
  )
}
