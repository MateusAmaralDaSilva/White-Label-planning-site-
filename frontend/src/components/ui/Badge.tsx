import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { toneTint, type Tone } from './tones'

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: Tone
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
        toneTint[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
