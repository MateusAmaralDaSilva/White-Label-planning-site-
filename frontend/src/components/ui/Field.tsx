import type { ReactNode } from 'react'

interface FieldProps {
  label: string
  htmlFor?: string
  /** Optional trailing control, e.g. a "forgot password" link. */
  action?: ReactNode
  children: ReactNode
}

export function Field({ label, htmlFor, action, children }: FieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label
          htmlFor={htmlFor}
          className="text-xs font-semibold uppercase tracking-wider text-ink-muted"
        >
          {label}
        </label>
        {action}
      </div>
      {children}
    </div>
  )
}
