import { useCallback, useEffect, useState } from 'react'
import { ensureFrontPhoto } from '../../api/statsApi'
import { mediaUrl } from '../../utils/mediaUrl'

/** Deterministic newspaper-sketch fillers when Gemini generation is unavailable. */

function hashSeed(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function SketchCharging() {
  return (
    <>
      <rect x="28" y="78" width="94" height="52" rx="4" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <path d="M48 78 V58 H102 V78" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <path d="M62 98 L74 86 L70 98 L84 108 L72 108 L76 120 Z" fill="currentColor" />
      <circle cx="168" cy="108" r="28" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="168" cy="108" r="12" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M122 104 H140" stroke="currentColor" strokeWidth="2.2" />
      <path d="M40 148 H200" stroke="currentColor" strokeWidth="1.4" opacity="0.55" />
    </>
  )
}

function SketchBattery() {
  return (
    <>
      <rect x="42" y="58" width="140" height="72" rx="8" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <rect x="182" y="78" width="14" height="32" rx="3" fill="currentColor" />
      <rect x="54" y="70" width="28" height="48" fill="currentColor" opacity="0.9" />
      <rect x="90" y="70" width="28" height="48" fill="currentColor" opacity="0.55" />
      <rect x="126" y="70" width="28" height="48" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </>
  )
}

function SketchGrid() {
  return (
    <>
      <path d="M40 150 V70 H120 V150" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M70 70 V48 H160 V90 H120" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="160" cy="90" r="8" fill="currentColor" />
      <path d="M160 98 V150" stroke="currentColor" strokeWidth="2" />
      <path d="M28 150 H212" stroke="currentColor" strokeWidth="1.5" />
    </>
  )
}

function SketchCityPlug() {
  return (
    <>
      <path
        d="M36 150 V96 H64 V150 M64 110 H96 V150 M96 78 H132 V150 M132 58 H176 V150"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M28 150 H212" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M188 92 v28 h-10 v8 h10 v10 h12 v-10 h10 v-8 h-10 v-28 a6 6 0 0 0 -12 0 z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
    </>
  )
}

const SKETCHES = [SketchCharging, SketchBattery, SketchGrid, SketchCityPlug] as const

export interface EditorialPhotoRequest {
  reportId?: string | null
  title?: string | null
  summary?: string | null
  seed?: string
}

interface EditorialPhotoSlotProps {
  src?: string | null
  request?: EditorialPhotoRequest
  seed?: string
  className?: string
  /** Admin-only regenerate control */
  canRegenerate?: boolean
}

function withCacheBust(url: string): string {
  const join = url.includes('?') ? '&' : '?'
  return `${url}${join}t=${Date.now()}`
}

function SketchFallback({ seed, className }: { seed: string; className?: string }) {
  const Sketch = SKETCHES[hashSeed(seed) % SKETCHES.length]
  return (
    <div
      className={
        className
          ? `np-photo-slot np-photo-slot-sketch ${className}`
          : 'np-photo-slot np-photo-slot-sketch'
      }
      aria-hidden
    >
      <svg
        className="np-photo-sketch"
        viewBox="0 0 240 180"
        xmlns="http://www.w3.org/2000/svg"
        role="presentation"
      >
        <rect width="240" height="180" fill="#efeae0" />
        <g fill="none" strokeLinecap="round" strokeLinejoin="round" color="#1a1a1a">
          <Sketch />
        </g>
        <text
          x="120"
          y="168"
          textAnchor="middle"
          fill="#6b655c"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          fontSize="9"
          letterSpacing="1.2"
        >
          MINT SKETCH
        </text>
      </svg>
    </div>
  )
}

export function EditorialPhotoSlot({
  src,
  request,
  seed = 'mint',
  className,
  canRegenerate = false,
}: EditorialPhotoSlotProps) {
  const [resolved, setResolved] = useState<string | null>(() => mediaUrl(src))
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const next = mediaUrl(src)
    // Only adopt server-provided src. Do not wipe a locally generated URL when src is still empty.
    if (next) {
      setResolved(next)
      setFailed(false)
    }
  }, [src])

  const runGenerate = useCallback(
    async (force: boolean) => {
      const reportId = request?.reportId?.trim()
      const title = request?.title?.trim()
      if (!reportId && !title) return

      const dayKey = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
      const failKey = `mint-front-photo-fail:v3:${dayKey}`
      if (!force) {
        try {
          if (sessionStorage.getItem(failKey) === '1') {
            setFailed(true)
            return
          }
        } catch {
          // ignore
        }
      } else {
        try {
          sessionStorage.removeItem(failKey)
        } catch {
          // ignore
        }
      }

      setLoading(true)
      setFailed(false)
      try {
        const url = await ensureFrontPhoto({
          report_id: reportId || undefined,
          title: title || undefined,
          summary: request?.summary?.trim() || undefined,
          seed: request?.seed || seed,
          force,
        })
        const absolute = mediaUrl(url)
        if (!absolute) {
          setFailed(true)
          return
        }
        // Always bust cache so a freshly generated file is visible immediately.
        setResolved(withCacheBust(absolute))
      } catch {
        setFailed(true)
        if (!force) {
          try {
            sessionStorage.setItem(failKey, '1')
          } catch {
            // ignore
          }
        }
      } finally {
        setLoading(false)
      }
    },
    [request?.reportId, request?.title, request?.summary, request?.seed, seed],
  )

  useEffect(() => {
    if (resolved || failed || loading) return
    const reportId = request?.reportId?.trim()
    const title = request?.title?.trim()
    if (!reportId && !title) return
    void runGenerate(false)
  }, [resolved, failed, loading, request?.reportId, request?.title, runGenerate])

  const slotClass = className ? `np-photo-slot ${className}` : 'np-photo-slot'
  const regenerateBtn =
    canRegenerate && !loading ? (
      <button
        type="button"
        className="np-photo-regen"
        onClick={() => void runGenerate(true)}
      >
        다시 생성
      </button>
    ) : null

  if (loading) {
    return (
      <div className={`${slotClass} np-photo-slot-loading`}>
        <span>AI 스케치 생성 중…</span>
      </div>
    )
  }

  if (resolved) {
    return (
      <div className={`${slotClass} np-photo-slot-wrap`}>
        <img src={resolved} alt="" />
        {regenerateBtn}
      </div>
    )
  }

  return (
    <div className="np-photo-slot-wrap">
      <SketchFallback seed={seed} className={className} />
      {regenerateBtn}
    </div>
  )
}
