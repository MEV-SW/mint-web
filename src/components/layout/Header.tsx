import { Link } from 'react-router-dom'
import { GlobalSearch } from './GlobalSearch'
import { Icon } from '../common/Icon'

interface HeaderProps {
  title: string
  crumb?: string
  actions?: React.ReactNode
  onMenuToggle?: () => void
  navOpen?: boolean
}

export function Header({ title, crumb, actions, onMenuToggle, navOpen }: HeaderProps) {
  return (
    <header className="header">
      {onMenuToggle && (
        <button
          type="button"
          className="header-menu-btn"
          aria-label={navOpen ? '메뉴 닫기' : '메뉴 열기'}
          aria-expanded={navOpen}
          onClick={onMenuToggle}
        >
          <Icon name="menu" />
        </button>
      )}
      <div className="title-blk">
        {crumb && <div className="crumb">{crumb}</div>}
        <h1>{title}</h1>
      </div>
      <GlobalSearch />
      <Link to="/help" className="header-help-btn" title="도움말" aria-label="도움말">
        <Icon name="help" />
      </Link>
      {actions}
    </header>
  )
}
