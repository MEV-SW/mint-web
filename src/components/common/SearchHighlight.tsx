/** Renders ES highlight snippets — only <em> tags are preserved. */
export function SearchHighlight({
  html,
  fallback,
  className,
}: {
  html?: string | null
  fallback?: string | null
  className?: string
}) {
  const source = (html || fallback || '').trim()
  if (!source) return null

  if (html) {
    const safe = source.replace(/<(?!\/?em\b)[^>]+>/gi, '')
    return (
      <span
        className={className ? `search-highlight ${className}` : 'search-highlight'}
        dangerouslySetInnerHTML={{ __html: safe }}
      />
    )
  }

  return <span className={className}>{source}</span>
}
