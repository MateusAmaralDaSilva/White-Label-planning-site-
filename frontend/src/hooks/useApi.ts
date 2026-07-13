import { useCallback, useEffect, useState } from 'react'
import { api, ApiError } from '@/lib/api'

export interface UseApiResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  reload: () => void
}

/**
 * Busca dados da API (GET) com estados de carregamento/erro. Substitui os
 * antigos `getX()` síncronos dos mocks. Passe `path = null` para não buscar.
 *
 * Uso típico com o componente <Async> (components/ui/Async.tsx):
 *   const state = useApi<Product[]>('/api/products')
 *   <Async state={state}>{(products) => ...}</Async>
 */
export function useApi<T>(path: string | null): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(path !== null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    if (path === null) return
    let cancelled = false
    setLoading(true)
    setError(null)
    api
      .get<T>(path)
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof ApiError ? e.message : 'Erro inesperado')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [path])

  useEffect(() => load(), [load])

  return { data, loading, error, reload: load }
}
