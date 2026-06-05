import { cx } from '../../utils/cx'
import { Icon } from './Icon'

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'soft' | 'ghost' | 'danger'
  size?: 'sm'
  icon?: string
  iconRight?: string
}

export function Btn({
  variant = 'outline',
  size,
  icon,
  iconRight,
  children,
  className,
  ...rest
}: BtnProps) {
  return (
    <button
      className={cx(
        'btn',
        `btn-${variant}`,
        size === 'sm' && 'btn-sm',
        !children && 'btn-icon',
        className,
      )}
      {...rest}
    >
      {icon && <Icon name={icon} />}
      {children}
      {iconRight && <Icon name={iconRight} />}
    </button>
  )
}
