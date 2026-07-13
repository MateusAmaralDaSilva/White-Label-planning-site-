import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Linha de lista padrão: slot `leading` (chip/dot/avatar), conteúdo central
 * (children, já dentro de um `min-w-0 flex-1`) e slot `trailing` (meta/valor).
 * Centraliza o container repetido (borda, padding, hover) das várias listas.
 */
export function ListRow({
  leading,
  trailing,
  align = 'center',
  className,
  onClick,
  children,
}: {
  leading?: ReactNode
  trailing?: ReactNode
  align?: 'center' | 'start'
  className?: string
  /** Quando presente, a linha vira clicável (usado para abrir a edição). */
  onClick?: () => void
  children: ReactNode
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex gap-3 border-b border-border/50 px-4 py-3 transition-colors last:border-0 hover:bg-surface-hover',
        align === 'start' ? 'items-start' : 'items-center',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      {leading}
      <div className="min-w-0 flex-1">{children}</div>
      {trailing}
    </div>
  )
}
