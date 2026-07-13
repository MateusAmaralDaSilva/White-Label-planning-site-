import { cn } from '@/lib/cn'

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        // rounded-[50%] (não rounded-full): o token global de raio é 0, mas o
        // anel do loader precisa ser circular para o giro fazer sentido.
        'inline-block h-4 w-4 animate-spin rounded-[50%] border-2 border-white/30 border-t-white',
        className,
      )}
    />
  )
}
