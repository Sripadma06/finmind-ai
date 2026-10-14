import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import Icon from './Icon'

export function Card({
  title,
  action,
  children,
  className = '',
}: {
  title?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`min-w-0 rounded-2xl border border-line bg-surface p-4 sm:p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="text-base font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

type Variant = 'primary' | 'ghost' | 'subtle'

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-brand-fg hover:brightness-110 active:brightness-95 shadow-sm shadow-brand/30',
  ghost: 'border border-line text-fg hover:bg-surface-2 hover:border-brand/50',
  subtle: 'bg-surface-2 text-fg hover:bg-brand-soft hover:text-brand-text',
}

export function Button({
  variant = 'primary',
  loading = false,
  className = '',
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${variants[variant]} ${className}`}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
}

const inputClass =
  'w-full rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-sm text-fg placeholder:text-muted outline-none transition hover:border-brand/50 focus:border-brand focus:ring-2 focus:ring-brand/30'

export function Field({
  label,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return (
    <label className="block min-w-0 text-sm">
      <span className="mb-1.5 block font-medium text-muted">{label}</span>
      <input {...props} className={inputClass} aria-invalid={error ? true : undefined} />
      {error && <span className="mt-1 block text-xs text-expense">{error}</span>}
    </label>
  )
}

export function Select({ label, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className="block min-w-0 text-sm">
      <span className="mb-1.5 block font-medium text-muted">{label}</span>
      <select {...props} className={inputClass}>
        {children}
      </select>
    </label>
  )
}

export function ErrorMessage({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-expense/30 bg-expense/10 px-3 py-2 text-sm text-expense"
    >
      <Icon name="alert" className="mt-0.5 h-4 w-4" />
      <span className="min-w-0 break-words">{message}</span>
    </p>
  )
}

export function SuccessMessage({ message }: { message: string }) {
  return (
    <p role="status" className="rounded-xl border border-income/30 bg-income/10 px-3 py-2 text-sm text-income">
      {message}
    </p>
  )
}

/** Full error block with a way forward. Use when a whole section failed to load. */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-expense/30 bg-expense/10 px-4 py-8 text-center">
      <Icon name="alert" className="h-8 w-8 text-expense" />
      <div>
        <p className="font-semibold">This section didn't load</p>
        <p className="mt-1 max-w-sm break-words text-sm text-muted">{message}</p>
      </div>
      {onRetry && (
        <Button variant="ghost" onClick={onRetry}>
          <Icon name="refresh" className="h-4 w-4" />
          Try again
        </Button>
      )}
    </div>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton rounded-lg ${className}`} />
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="py-10 text-center">
      <p className="font-semibold">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{children}</p>}
    </div>
  )
}
