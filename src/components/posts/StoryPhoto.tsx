import { useEffect, useRef, useState } from 'react'
import { ensureStoryPhoto } from '../../api/postApi'
import { mediaUrl } from '../../utils/mediaUrl'

type Props = {
  postId: string
  src?: string | null
  className?: string
}

export function StoryPhoto({ postId, src, className }: Props) {
  const [url, setUrl] = useState(() => mediaUrl(src))
  const [loading, setLoading] = useState(false)
  // One generation attempt per post. `loading` is not a dependency: the effect used to cancel itself
  // when it set loading, so a photo without image_url stayed on "생성 중" whatever the request returned.
  const triedFor = useRef<string | null>(null)

  useEffect(() => {
    setUrl(mediaUrl(src))
  }, [src])

  useEffect(() => {
    if (url || !postId || triedFor.current === postId) return
    let cancelled = false
    let settled = false
    triedFor.current = postId
    setLoading(true)
    void ensureStoryPhoto(postId)
      .then((next) => {
        if (!cancelled) setUrl(mediaUrl(next))
      })
      .catch(() => {
        if (!cancelled) setUrl(null)
      })
      .finally(() => {
        settled = true
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
      // Unmounted (or StrictMode re-run) mid-request: allow the next mount to pick it up again;
      // ensureStoryPhoto shares the in-flight request, so this does not send a second one.
      if (!settled) {
        triedFor.current = null
        setLoading(false)
      }
    }
  }, [postId, url])

  const slotClass = className ? `np-photo-slot ${className}` : 'np-photo-slot'
  if (loading) {
    return (
      <div className={`${slotClass} np-photo-slot-loading`}>
        <span>이 기사 스케치 생성 중…</span>
      </div>
    )
  }
  if (!url) return null
  return (
    <div className={`${slotClass} np-photo-slot-wrap`}>
      <img src={url} alt="" />
    </div>
  )
}
