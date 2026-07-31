import type { ReactNode } from 'react'

interface PageShellProps {
  section: string
  title: string
  lead?: string
  leadSingleLine?: boolean
  actions?: ReactNode
  children: ReactNode
}

export function PageShell({ section, title, lead, leadSingleLine, actions, children }: PageShellProps) {
  return (
    <div className="content-inner page-fade np-sheet">
      <header className="pg-masthead">
        <div className="pg-masthead-row">
          <div className="pg-masthead-main">
            <div className="pg-kicker">{section}</div>
            <h1 className="pg-title">{title}</h1>
          </div>
          {actions && <div className="pg-actions">{actions}</div>}
        </div>
        {lead && (
          <p className={`pg-lead${leadSingleLine ? ' pg-lead-single' : ''}`}>{lead}</p>
        )}
        <div className="pg-rule" aria-hidden />
      </header>
      {children}
    </div>
  )
}
