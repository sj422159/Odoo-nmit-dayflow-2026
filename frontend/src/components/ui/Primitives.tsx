import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { forwardRef } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'

const cx = (...parts: (string | false | undefined | null)[]) => parts.filter(Boolean).join(' ')

/* ----------------------------------------------------------------- Button */
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
type Size = 'sm' | 'md'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-flow-500 text-white hover:bg-flow-600 active:bg-flow-700 disabled:bg-flow-300',
  secondary: 'bg-white text-ink border border-slate-150 hover:bg-slate-50 hover:border-slate-300 disabled:text-away',
  ghost: 'bg-transparent text-ink-600 hover:bg-slate-150/70 disabled:text-away',
  danger: 'bg-absent text-white hover:brightness-95 active:brightness-90 disabled:opacity-60',
  success: 'bg-present text-white hover:brightness-95 active:brightness-90 disabled:opacity-60',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors',
        'disabled:cursor-not-allowed',
        size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2.5 text-sm',
        VARIANTS[variant],
        className,
      )}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------ Field */
interface FieldProps {
  label: string
  htmlFor?: string
  error?: string
  hint?: string
  required?: boolean
  children: ReactNode
  className?: string
}

export function Field({ label, htmlFor, error, hint, required, children, className }: FieldProps) {
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-sm font-semibold text-ink-700">
        {label}
        {required && <span className="ml-1 text-absent">*</span>}
      </label>
      {children}
      {error ? (
        <p role="alert" className="flex items-start gap-1.5 text-sm text-absent">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : (
        hint && <p className="text-sm text-away">{hint}</p>
      )}
    </div>
  )
}

const CONTROL =
  'w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-away/70 transition-colors disabled:bg-slate-50 disabled:text-away'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  ({ className, invalid, ...rest }, ref) => (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cx(CONTROL, invalid ? 'border-absent' : 'border-slate-150 hover:border-slate-300', className)}
      {...rest}
    />
  ),
)
Input.displayName = 'Input'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(
  ({ className, invalid, children, ...rest }, ref) => (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cx(CONTROL, 'appearance-none pr-9', invalid ? 'border-absent' : 'border-slate-150 hover:border-slate-300', className)}
      {...rest}
    >
      {children}
    </select>
  ),
)
Select.displayName = 'Select'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  ({ className, invalid, ...rest }, ref) => (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cx(CONTROL, 'min-h-[88px] resize-y', invalid ? 'border-absent' : 'border-slate-150 hover:border-slate-300', className)}
      {...rest}
    />
  ),
)
Textarea.displayName = 'Textarea'

/* ------------------------------------------------------------------- Card */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cx('rounded-2xl border border-slate-150 bg-white shadow-card', className)}>
      {children}
    </section>
  )
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-150 px-5 py-4">
      <div>
        <h2 className="text-base font-bold tracking-tight text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-away">{subtitle}</p>}
      </div>
      {action}
    </header>
  )
}

/* ------------------------------------------------------------------ Chips */
export function Pill({ tone, children }: { tone: string; children: ReactNode }) {
  return (
    <span className={cx('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', tone)}>
      {children}
    </span>
  )
}

/* ------------------------------------------------------------------ State */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-xl bg-slate-150', className)} aria-hidden />
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-2xl border border-absent/25 bg-absent-soft/60 p-5">
      <div className="flex items-start gap-2.5">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-absent" aria-hidden />
        <div>
          <p className="font-semibold text-ink">That did not load</p>
          <p className="text-sm text-ink-600">{message}</p>
        </div>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string
  description: string
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      {icon && <div className="mb-1 text-away">{icon}</div>}
      <p className="font-semibold text-ink">{title}</p>
      <p className="max-w-sm text-sm text-away">{description}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

export function FormBanner({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-absent/25 bg-absent-soft px-3.5 py-3 text-sm text-ink">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-absent" aria-hidden />
      <span>{message}</span>
    </div>
  )
}

export { cx }
