/** Readable paragraphs from a stored article body, including already-flattened crawl text. */

const KO_SENTENCE = /((?:습니다|습니까|니다|니까|다|요|죠)\.|[?？]|다["”」])\s+(?=\S)/g
const EN_SENTENCE = /([.!?])\s+(?=[A-Z“"「『])/g

export function formatStoredArticleBody(text: string): string[] {
  const normalized = text.replace(/\u00a0/g, ' ').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  if (!normalized) return []

  const withBreaks = normalized.includes('\n')
    ? normalized
    : normalized.replace(KO_SENTENCE, '$1\n\n').replace(EN_SENTENCE, '$1\n\n')

  return withBreaks
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/[ \t]+\n/g, '\n').trim())
    .filter(Boolean)
}
