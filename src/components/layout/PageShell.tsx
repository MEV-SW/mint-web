import type { ReactNode } from 'react'

interface PageShellProps {
  section: string
  title: string
  lead?: string
  actions?: ReactNode
  children: ReactNode
}

export function PageShell({ section, title, lead, actions, children }: PageShellProps) {
  return (
    <div className="content-inner page-fade np-sheet">
      <header className="pg-masthead">
        <div className="pg-masthead-row">
          <div className="pg-masthead-main">
            <div className="np-section-label">{section}</div>
            <h1 className="pg-title">{title}</h1>
            {lead && <p className="pg-lead">{lead}</p>}
          </div>
          {actions && <div className="pg-actions">{actions}</div>}
        </div>
      </header>
      {children}
    </div>
  )
}
