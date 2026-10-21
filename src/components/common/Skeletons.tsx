export function FrontPageSkeleton() {
  return (
    <div className="np-skeleton" aria-busy="true" aria-label="지면을 불러오는 중">
      <div className="np-skeleton-bar" />
      <div className="np-skeleton-brief" />
      <div className="np-skeleton-trio">
        <div className="np-skeleton-hero">
          <div className="np-skeleton-line lg" />
          <div className="np-skeleton-line lg" />
          <div className="np-skeleton-line" />
          <div className="np-skeleton-line" />
        </div>
        <div className="np-skeleton-col">
          <div className="np-skeleton-line" />
          <div className="np-skeleton-line" />
          <div className="np-skeleton-line" />
        </div>
        <div className="np-skeleton-col">
          <div className="np-skeleton-block" />
        </div>
      </div>
    </div>
  )
}

export function NewsListSkeleton() {
  return (
    <div className="news-skeleton" aria-busy="true" aria-label="뉴스를 불러오는 중">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="news-skeleton-row">
          <div className="np-skeleton-line sm" />
          <div className="np-skeleton-line lg" />
          <div className="np-skeleton-line" />
        </div>
      ))}
    </div>
  )
}

/** Article / report detail placeholder (#128) — replaces the plain "로딩 중…" text. */
export function DetailSkeleton({ label = '불러오는 중' }: { label?: string }) {
  return (
    <div className="np-skeleton detail-skeleton" aria-busy="true" aria-label={label}>
      <div className="np-skeleton-line sm" />
      <div className="np-skeleton-line lg" />
      <div className="np-skeleton-line lg" />
      <div className="np-skeleton-brief" />
      <div className="np-skeleton-line" />
      <div className="np-skeleton-line" />
      <div className="np-skeleton-line" />
    </div>
  )
}
