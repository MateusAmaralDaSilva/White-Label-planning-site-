import type { ReactNode } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import type { UseApiResult } from '@/hooks/useApi'

/** Loader circular temático (accent), para estados de carregamento em página. */
function Loading() {
  return (
    <div className="flex items-center justify-center py-16">
      <span className="inline-block h-6 w-6 animate-spin rounded-[50%] border-2 border-accent/25 border-t-accent" />
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <AlertCircle size={28} className="text-danger" />
      <p className="max-w-xs text-sm text-ink-muted">{message}</p>
      <button
        onClick={onRetry}
        className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
      >
        <RefreshCw size={13} /> Tentar novamente
      </button>
    </div>
  )
}

/**
 * Renderiza o resultado de `useApi`: mostra loader, erro (com retry) ou os
 * dados. Concentra o tratamento de loading/erro num só lugar — cada tela só
 * descreve o caso de sucesso.
 */
export function Async<T>({
  state,
  children,
}: {
  state: UseApiResult<T>
  children: (data: T) => ReactNode
}) {
  if (state.loading && state.data === null) return <Loading />
  if (state.error && state.data === null) return <ErrorState message={state.error} onRetry={state.reload} />
  if (state.data === null) return null
  return <>{children(state.data)}</>
}
