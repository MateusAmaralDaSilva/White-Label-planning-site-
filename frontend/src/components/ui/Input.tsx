import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export const inputClasses =
  'w-full rounded-lg bg-surface border border-border px-3.5 py-2.5 text-sm text-ink ' +
  'placeholder:text-ink-faint outline-none transition ' +
  'focus:border-accent focus:ring-2 focus:ring-accent/20'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(inputClasses, className)} {...props} />
  },
)
