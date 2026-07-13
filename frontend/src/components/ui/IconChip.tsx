import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { toneTint, type Tone } from './tones'

/**
 * Quadradinho com ícone/inicial centralizado. Se `tone` for informado, aplica
 * o tint semântico; caso contrário aceita `className`/`style` para cores ad-hoc
 * (ex.: avatar de cliente com cor própria).
 */
export function IconChip({
  tone,
  className,
  style,
  children,
}: {
  tone?: Tone
  className?: string
  style?: CSSProperties
  children: ReactNode
}) {
  return (
    <span
      style={style}
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
        tone && toneTint[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
