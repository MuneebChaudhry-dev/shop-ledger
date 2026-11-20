import { ChevronLeft, Eye, EyeOff, type LucideIcon } from 'lucide-react'
import { useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { useNavigate } from 'react-router'
import { cn } from '../lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

export const Button = ({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'md' | 'lg' | 'sm' }) => (
  <button
    {...props}
    className={cn(
      'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition active:scale-[0.98] disabled:opacity-50',
      size === 'lg' && 'h-14 px-5 text-lg',
      size === 'md' && 'h-12 px-4',
      size === 'sm' && 'h-9 px-3 text-sm',
      variant === 'primary' && 'bg-teal-700 text-white shadow-sm shadow-teal-900/20 hover:bg-teal-800',
      variant === 'secondary' && 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
      variant === 'ghost' && 'text-teal-700 hover:bg-teal-50',
      variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700',
      className,
    )}
  />
)

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20'

export const Input = ({ className, icon: Icon, ...props }: InputHTMLAttributes<HTMLInputElement> & { icon?: LucideIcon }) =>
  Icon ? (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
      <input dir="auto" {...props} className={cn(inputClass, 'h-12 pl-10', className)} />
    </div>
  ) : (
    <input dir="auto" {...props} className={cn(inputClass, 'h-12', className)} />
  )

/** Password field with a show / hide eye button. */
export const PasswordInput = ({ className, icon: Icon, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { icon?: LucideIcon }) => {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      {Icon && <Icon className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" />}
      <input dir="ltr" {...props} type={show ? 'text' : 'password'} className={cn(inputClass, 'h-12 pr-12', Icon && 'pl-10', className)} />
      <button
        type="button"
        aria-label={show ? 'Hide password' : 'Show password'}
        aria-pressed={show}
        onClick={() => setShow((v) => !v)}
        className="absolute right-1 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
      >
        {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
      </button>
    </div>
  )
}

export const Textarea = ({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea dir="auto" rows={3} {...props} className={cn(inputClass, 'py-2', className)} />
)

export const Select = ({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...props} className={cn(inputClass, 'h-12', className)} />
)

/**
 * Label + control. Use `group` when the children hold several controls (tag chips, +/- buttons,
 * nested fields): a <label> around them would send taps on the label text to the first control.
 */
export const Field = ({
  label,
  hint,
  error,
  group,
  children,
}: {
  label: string
  hint?: ReactNode
  error?: string
  group?: boolean
  children: ReactNode
}) => {
  const body = (
    <>
      <span className="block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {error ? <span className="block text-sm font-medium text-red-600">{error}</span> : hint ? <span className="block text-sm text-slate-500">{hint}</span> : null}
    </>
  )
  return group ? (
    <div role="group" aria-label={label} className="block space-y-1">{body}</div>
  ) : (
    <label className="block space-y-1">{body}</label>
  )
}

export const Card = ({ className, children, onClick }: { className?: string; children: ReactNode; onClick?: () => void }) => (
  <div
    onClick={onClick}
    role={onClick ? 'button' : undefined}
    className={cn('rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/50', onClick && 'cursor-pointer transition hover:border-teal-300 active:bg-slate-50', className)}
  >
    {children}
  </div>
)

export const Segmented = <T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) => (
  <div className="flex rounded-xl bg-slate-200 p-1">
    {options.map((o) => (
      <button
        key={o.value}
        type="button"
        onClick={() => onChange(o.value)}
        className={cn('h-10 flex-1 rounded-lg text-sm font-medium', value === o.value ? 'bg-white shadow-sm' : 'text-slate-600')}
      >
        {o.label}
      </button>
    ))}
  </div>
)

export const Badge = ({ tone = 'slate', children }: { tone?: 'slate' | 'red' | 'yellow' | 'green' | 'teal'; children: ReactNode }) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
      tone === 'slate' && 'bg-slate-100 text-slate-700',
      tone === 'red' && 'bg-red-100 text-red-700',
      tone === 'yellow' && 'bg-amber-100 text-amber-800',
      tone === 'green' && 'bg-green-100 text-green-700',
      tone === 'teal' && 'bg-teal-100 text-teal-800',
    )}
  >
    {children}
  </span>
)

export const PageHeader = ({ title, back, action }: { title: string; back?: boolean; action?: ReactNode }) => {
  const navigate = useNavigate()
  return (
    <header className="mb-4 flex items-center gap-2">
      {back && (
        <button type="button" aria-label="Back" onClick={() => navigate(-1)} className="-ml-2 rounded-full p-2 active:bg-slate-200">
          <ChevronLeft className="size-6" />
        </button>
      )}
      <h1 className="flex-1 text-xl font-semibold" dir="auto">{title}</h1>
      {action}
    </header>
  )
}

export const EmptyState = ({ title, children }: { title: string; children?: ReactNode }) => (
  <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
    <p className="font-medium text-slate-700">{title}</p>
    {children && <div className="mt-2 text-sm text-slate-500">{children}</div>}
  </div>
)

export const StatTile = ({ label, value, tone }: { label: string; value: ReactNode; tone?: 'good' | 'bad' }) => (
  <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
    <p className="text-xs text-slate-500">{label}</p>
    <p className={cn('mt-1 text-lg font-semibold', tone === 'good' && 'text-green-700', tone === 'bad' && 'text-red-600')}>{value}</p>
  </div>
)

export const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex justify-between gap-4 py-1.5 text-sm">
    <span className="text-slate-500">{label}</span>
    <span className="text-right font-medium" dir="auto">{children}</span>
  </div>
)

export const Spinner = () => <div className="mx-auto size-6 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />
