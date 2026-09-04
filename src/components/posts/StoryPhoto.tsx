import { useEffect, useState } from 'react'
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

  useEffect(() => {
    setUrl(mediaUrl(src))
  }, [src])

  useEffect(() => {
    if (url || loading || !postId) return
    let cancelled = false
    setLoading(true)
    void ensureStoryPhoto(postId)
      .then((next) => {
        if (!cancelled) setUrl(mediaUrl(next))
      })
      .catch(() => {
        if (!cancelled) setUrl(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [loading, postId, url])

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
