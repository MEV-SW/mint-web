import { createContext, useContext, type ReactNode } from 'react'

export interface ConfirmOptions {
  title: string
  body?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** Destructive action: the confirm button turns red. */
  danger?: boolean
}

export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

export const ConfirmCtx = createContext<ConfirmFn | null>(null)

/** MINT replacement for window.confirm — resolves true only when the user confirms. */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmCtx)
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider')
  return ctx
}
