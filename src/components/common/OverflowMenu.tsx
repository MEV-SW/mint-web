import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'

export type OverflowMenuItem = {
  key: string
  label: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}

export function OverflowMenu({
  label = '더보기',
  items,
}: {
  label?: string
  items: OverflowMenuItem[]
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div className="row-overflow" ref={rootRef}>
      <button
        type="button"
        className="row-overflow-trigger"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="more" />
      </button>
      {open && (
        <div className="row-overflow-menu" role="menu">
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              className={`row-overflow-item${item.danger ? ' is-danger' : ''}`}
              disabled={item.disabled}
              onClick={() => {
                setOpen(false)
                item.onClick()
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
