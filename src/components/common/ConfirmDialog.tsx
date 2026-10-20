import { useCallback, useRef, useState, type ReactNode } from 'react'
import { Btn } from './Btn'
import { Modal } from './Modal'
import { ConfirmCtx, type ConfirmFn, type ConfirmOptions } from './useConfirm'

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const resolverRef = useRef<((ok: boolean) => void) | null>(null)

  const confirm = useCallback<ConfirmFn>((next) => {
    // A newer request cancels one that is still open.
    resolverRef.current?.(false)
    setOptions(next)
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
    })
  }, [])

  const settle = useCallback((ok: boolean) => {
    resolverRef.current?.(ok)
    resolverRef.current = null
    setOptions(null)
  }, [])

  const cancel = useCallback(() => settle(false), [settle])

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {options && (
        <Modal
          title={options.title}
          onClose={cancel}
          footer={
            <>
              <Btn variant="outline" onClick={cancel}>
                {options.cancelLabel ?? '취소'}
              </Btn>
              <Btn
                variant={options.danger ? 'danger' : 'primary'}
                onClick={() => settle(true)}
                autoFocus
              >
                {options.confirmLabel ?? '확인'}
              </Btn>
            </>
          }
        >
          {options.body && <div className="confirm-body">{options.body}</div>}
        </Modal>
      )}
    </ConfirmCtx.Provider>
  )
}
