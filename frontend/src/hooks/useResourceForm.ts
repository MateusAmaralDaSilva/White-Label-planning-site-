import { useState } from 'react'
import { ApiError } from '@/lib/api'

/**
 * Andaime comum dos formulários de criar/editar (modais dos módulos): estado de
 * `busy`/`error` + um `run` que executa a ação (submit ou delete), traduz erro de
 * API em mensagem e mantém `busy` no sucesso — o form desmonta via `onSaved`, então
 * não é preciso "desligar" o busy nesse caso.
 */
export function useResourceForm() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(action: () => Promise<void>, fallback: string) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      if (err instanceof ApiError) {
        const details = err.issues
          .map((issue) => {
            const field = issue.path.length > 0 ? ` (${issue.path.join('.')})` : ''
            return `${issue.message}${field}`
          })
          .join(' ')
        setError(details ? `${err.message}: ${details}` : err.message)
      } else {
        setError(fallback)
      }
      setBusy(false)
    }
  }

  return { busy, error, run }
}
