import { Btn } from './Btn'
import { useSpeechNarration } from '../../hooks/useSpeechNarration'

interface ListenButtonProps {
  text: string
  label?: string
  className?: string
}

export function ListenButton({
  text,
  label = '듣기',
  className,
}: ListenButtonProps) {
  const { status, speak, pause, resume, stop, supported } = useSpeechNarration()

  if (!supported) return null

  if (status === 'loading') {
    return (
      <span className={className} style={{ display: 'inline-flex', gap: 6 }}>
        <Btn variant="outline" size="sm" type="button" disabled>
          생성 중…
        </Btn>
        <Btn variant="ghost" size="sm" onClick={stop} type="button">
          취소
        </Btn>
      </span>
    )
  }

  if (status === 'speaking') {
    return (
      <span className={className} style={{ display: 'inline-flex', gap: 6 }}>
        <Btn variant="outline" size="sm" onClick={pause} type="button">
          일시정지
        </Btn>
        <Btn variant="ghost" size="sm" onClick={stop} type="button">
          중지
        </Btn>
      </span>
    )
  }

  if (status === 'paused') {
    return (
      <span className={className} style={{ display: 'inline-flex', gap: 6 }}>
        <Btn variant="outline" size="sm" onClick={resume} type="button">
          이어듣기
        </Btn>
        <Btn variant="ghost" size="sm" onClick={stop} type="button">
          중지
        </Btn>
      </span>
    )
  }

  return (
    <Btn
      variant="outline"
      size="sm"
      type="button"
      className={className}
      disabled={!text.trim()}
      onClick={() => void speak(text)}
    >
      {label}
    </Btn>
  )
}

export function buildBriefingSpeech(parts: {
  title?: string | null
  summary?: string | null
  extras?: (string | null | undefined)[]
}): string {
  const chunks: string[] = []
  if (parts.title?.trim()) chunks.push(parts.title.trim())
  if (parts.summary?.trim()) chunks.push(parts.summary.trim())
  for (const extra of parts.extras ?? []) {
    if (extra?.trim()) chunks.push(extra.trim())
  }
  return chunks.join('. ')
}
