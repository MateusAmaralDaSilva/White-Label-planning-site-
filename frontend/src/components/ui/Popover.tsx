import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Casca visual de um painel flutuante (dropdown) ancorado à direita do gatilho.
 * Puramente presentacional — o fechar-ao-clicar-fora fica a cargo do container
 * do disclosure via useClickOutside. `className` controla largura/padding.
 */
export function Popover({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      role="menu"
      className={cn(
        'absolute right-0 top-[calc(100%+10px)] z-50 overflow-hidden rounded-xl border border-border bg-sidebar shadow-2xl',
        className,
      )}
    >
      {children}
    </div>
  )
}
