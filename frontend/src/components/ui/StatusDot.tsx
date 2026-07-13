import { cn } from '@/lib/cn'
import { toneSolid, type Tone } from './tones'

/** Bolinha de status colorida por Tone (ex.: feed de atividades, tickets). */
export function StatusDot({
  tone,
  size = 'sm',
  className,
}: {
  tone: Tone
  size?: 'xs' | 'sm'
  className?: string
}) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-full',
        size === 'xs' ? 'h-1.5 w-1.5' : 'h-2 w-2',
        toneSolid[tone],
        className,
      )}
    />
  )
}
