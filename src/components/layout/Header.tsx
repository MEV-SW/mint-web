import { Icon } from '../common/Icon'

interface HeaderProps {
  title: string
  crumb?: string
  actions?: React.ReactNode
}

export function Header({ title, crumb, actions }: HeaderProps) {
  return (
    <header className="header">
      <div className="title-blk">
        {crumb && <div className="crumb">{crumb}</div>}
        <h1>{title}</h1>
      </div>
      <div className="header-search">
        <Icon name="search" />
        <input placeholder="게시글·소스 검색 (준비 중)" disabled />
      </div>
      {actions}
    </header>
  )
}
