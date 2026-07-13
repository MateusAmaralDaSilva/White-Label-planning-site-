import { cn } from '@/lib/cn'
import { useBrandStore } from '@/store/brandStore'

interface BrandProps {
  size?: 'sm' | 'md'
  /** Hide the wordmark (used by the collapsed sidebar). */
  showName?: boolean
  className?: string
}

export function Brand({ size = 'md', showName = true, className }: BrandProps) {
  const brand = useBrandStore((s) => s.brand)
  const box = size === 'sm' ? 'h-7 w-7 rounded-lg text-[11px]' : 'h-9 w-9 rounded-xl text-xs'

  return (
    <div className={cn('flex items-center gap-3 overflow-hidden', className)}>
      {brand.logo ? (
        // Logo da conta: <img> não executa scripts, seguro até para SVG.
        <img
          src={brand.logo}
          alt={brand.name}
          className={cn('shrink-0 object-contain', box)}
        />
      ) : (
        <div
          className={cn(
            'flex shrink-0 items-center justify-center bg-accent font-black tracking-tighter text-white',
            box,
          )}
        >
          {brand.mark}
        </div>
      )}
      {showName && (
        <span className="truncate text-sm font-semibold text-ink">{brand.name}</span>
      )}
    </div>
  )
}
