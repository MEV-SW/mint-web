interface NewspaperMastheadProps {
  brand?: string
  edition: string
  headline: string
  dek: string
  dateLabel: string
  volume: number
}

export function NewspaperMasthead({
  brand = 'MINT',
  edition,
  headline,
  dek,
  dateLabel,
  volume,
}: NewspaperMastheadProps) {
  return (
    <header className="np-masthead np-masthead-paper">
      <div className="np-masthead-rule" aria-hidden />
      <div className="np-masthead-top">
        <span className="np-edition">{edition}</span>
        <span className="np-date">{dateLabel}</span>
        <span className="np-date">Vol. {volume}</span>
      </div>
      <p className="np-masthead-brand">{brand}</p>
      <h1 className="np-masthead-title">{headline}</h1>
      <p className="np-masthead-tagline">{dek}</p>
      <div className="np-masthead-rule np-masthead-rule-heavy" aria-hidden />
    </header>
  )
}
