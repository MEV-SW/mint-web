import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { cx } from '../../utils/cx'
import { Icon } from './Icon'

type ToastKind = 'ok' | 'info' | 'err'

interface ToastItem {
  id: string
  msg: string
  kind: ToastKind
}

const ToastCtx = createContext<((msg: string, kind?: ToastKind) => void) | null>(null)

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const push = useCallback((msg: string, kind: ToastKind = 'ok') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((t) => [...t, { id, msg, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
  }, [])

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-host">
        {toasts.map((t) => (
          <div key={t.id} className={cx('toast', t.kind)}>
            <span className="ti">
              <Icon name={t.kind === 'info' ? 'bell' : 'check'} />
            </span>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
