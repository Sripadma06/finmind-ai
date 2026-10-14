import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { AlertIcon, CheckIcon, CloseIcon } from '../../components/icons'

type Kind = 'success' | 'error'
interface Toast {
  id: number
  kind: Kind
  message: string
}

interface ToastApi {
  success: (message: string) => void
  error: (message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const push = useCallback(
    (kind: Kind, message: string) => {
      const id = nextId.current++
      setToasts((t) => [...t.slice(-3), { id, kind, message }])
      // Errors stay a little longer: people need time to read what to fix.
      window.setTimeout(() => dismiss(id), kind === 'error' ? 8000 : 4000)
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(
    () => ({ success: (m) => push('success', m), error: (m) => push('error', m) }),
    [push],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-3 top-3 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-4 sm:top-4 sm:items-end"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className={`pop-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-card ${
              t.kind === 'error'
                ? 'border-danger/30 bg-danger-soft text-danger'
                : 'border-success/30 bg-success-soft text-success'
            }`}
          >
            <span className="mt-0.5 shrink-0">{t.kind === 'error' ? <AlertIcon width={18} height={18} /> : <CheckIcon width={18} height={18} />}</span>
            <p className="min-w-0 flex-1 break-words font-medium">{t.message}</p>
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="shrink-0 opacity-70 transition hover:opacity-100">
              <CloseIcon width={16} height={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
