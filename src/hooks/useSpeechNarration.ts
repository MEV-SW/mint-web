import { useCallback, useEffect, useRef, useState } from 'react'
import { narrateSpeech } from '../api/ttsApi'

export type SpeechStatus = 'idle' | 'loading' | 'speaking' | 'paused' | 'unsupported'

function pickKoreanVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null
  const voices = window.speechSynthesis.getVoices()
  const ko = voices.filter((v) => v.lang.toLowerCase().startsWith('ko'))
  return (
    ko.find((v) => /enhanced|premium|neural|google/i.test(v.name)) ??
    ko[0] ??
    voices.find((v) => v.lang.toLowerCase().includes('kr')) ??
    null
  )
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined'
}

function canPlayAudio(): boolean {
  return typeof window !== 'undefined' && typeof Audio !== 'undefined'
}

function isAudioBlob(blob: Blob): boolean {
  // Some browsers leave type empty for application/octet-stream WAV responses.
  if (!blob.type || blob.type === 'application/octet-stream') return blob.size > 44
  return blob.type.startsWith('audio/')
}

export function useSpeechNarration() {
  const [status, setStatus] = useState<SpeechStatus>(() =>
    isSpeechSupported() || canPlayAudio() ? 'idle' : 'unsupported',
  )
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const requestIdRef = useRef(0)
  /** Prevents releaseAudio() (src='') from triggering onerror → browser TTS fallback. */
  const suppressAudioErrorRef = useRef(false)

  const releaseAudio = useCallback(() => {
    const audio = audioRef.current
    if (audio) {
      suppressAudioErrorRef.current = true
      audio.onended = null
      audio.onerror = null
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
      audioRef.current = null
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    suppressAudioErrorRef.current = false
  }, [])

  const stopBrowser = useCallback(() => {
    if (!isSpeechSupported()) return
    window.speechSynthesis.cancel()
    utteranceRef.current = null
  }, [])

  useEffect(() => {
    if (!isSpeechSupported()) return
    const synth = window.speechSynthesis
    const refresh = () => {
      pickKoreanVoice()
    }
    refresh()
    synth.addEventListener('voiceschanged', refresh)
    return () => {
      synth.removeEventListener('voiceschanged', refresh)
      synth.cancel()
      releaseAudio()
    }
  }, [releaseAudio])

  const stop = useCallback(() => {
    requestIdRef.current += 1
    stopBrowser()
    releaseAudio()
    setStatus('idle')
  }, [releaseAudio, stopBrowser])

  const pause = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause()
      setStatus('paused')
      return
    }
    if (!isSpeechSupported()) return
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause()
      setStatus('paused')
    }
  }, [])

  const resume = useCallback(() => {
    if (audioRef.current && audioRef.current.paused) {
      void audioRef.current.play().then(() => setStatus('speaking'))
      return
    }
    if (!isSpeechSupported()) return
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume()
      setStatus('speaking')
    }
  }, [])

  const speakBrowser = useCallback(
    (cleaned: string) => {
      if (!isSpeechSupported()) {
        setStatus('unsupported')
        return
      }
      stopBrowser()
      releaseAudio()
      const utterance = new SpeechSynthesisUtterance(cleaned)
      utterance.lang = 'ko-KR'
      utterance.rate = 0.95
      utterance.pitch = 1
      const voice = pickKoreanVoice()
      if (voice) utterance.voice = voice
      utterance.onend = () => {
        utteranceRef.current = null
        setStatus('idle')
      }
      utterance.onerror = () => {
        utteranceRef.current = null
        setStatus('idle')
      }
      utteranceRef.current = utterance
      setStatus('speaking')
      window.speechSynthesis.speak(utterance)
    },
    [releaseAudio, stopBrowser],
  )

  const speak = useCallback(
    async (text: string) => {
      const cleaned = text.replace(/\s+/g, ' ').trim()
      if (!cleaned) return

      const requestId = ++requestIdRef.current
      stopBrowser()
      releaseAudio()

      if (!canPlayAudio()) {
        speakBrowser(cleaned)
        return
      }

      setStatus('loading')
      try {
        const blob = await narrateSpeech(cleaned)
        if (requestId !== requestIdRef.current) return

        if (!isAudioBlob(blob)) {
          speakBrowser(cleaned)
          return
        }

        const url = URL.createObjectURL(blob)
        objectUrlRef.current = url
        const audio = new Audio(url)
        audioRef.current = audio

        let started = false
        audio.onended = () => {
          releaseAudio()
          setStatus('idle')
        }
        audio.onerror = () => {
          if (suppressAudioErrorRef.current || requestId !== requestIdRef.current) return
          releaseAudio()
          // Only fall back if playback never started (bad/corrupt audio).
          if (!started) speakBrowser(cleaned)
          else setStatus('idle')
        }

        await audio.play()
        if (requestId !== requestIdRef.current) return
        started = true
        setStatus('speaking')
      } catch {
        if (requestId !== requestIdRef.current) return
        speakBrowser(cleaned)
      }
    },
    [releaseAudio, speakBrowser, stopBrowser],
  )

  return {
    status,
    speak,
    pause,
    resume,
    stop,
    supported: status !== 'unsupported',
  }
}
