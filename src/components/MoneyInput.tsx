import { groupLakh } from '../lib/money'
import { Input } from './ui'

/** Integer rupee input that shows Pakistani grouping while typing. */
export const MoneyInput = ({
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  value: number | null
  onChange: (v: number | null) => void
  placeholder?: string
  autoFocus?: boolean
}) => (
  <div className="relative">
    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">Rs</span>
    <Input
      inputMode="numeric"
      dir="ltr"
      autoFocus={autoFocus}
      placeholder={placeholder}
      className="pl-10 text-lg"
      value={value === null ? '' : groupLakh(value)}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, '')
        onChange(digits ? Number(digits) : null)
      }}
    />
  </div>
)
