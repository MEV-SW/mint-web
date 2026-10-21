/** #129: AI confidence (0–1) as a Korean grade for readers; null → no label. */
export function confidenceGrade(confidence: number | null | undefined): string | null {
  if (confidence == null || Number.isNaN(confidence)) return null
  if (confidence >= 0.8) return '높음'
  if (confidence >= 0.5) return '보통'
  return '낮음'
}
