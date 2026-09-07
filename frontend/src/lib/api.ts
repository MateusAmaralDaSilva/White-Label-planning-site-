import { useAuthStore } from '@/store/authStore'

/**
 * Cliente HTTP da API (ver ../../backend). Ponto único onde o token é anexado
 * e onde 401 derruba a sessão. A URL base vem de VITE_API_URL.
 */
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public issues: Array<{ path: Array<string | number>; message: string }> = [],
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

interface RequestOptions {
  method?: string
  body?: unknown
  /** Anexa o Bearer token (padrão: true). O login usa false. */
  auth?: boolean
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = opts

  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth) {
    const token = useAuthStore.getState().token
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    // Falha de rede (backend fora do ar, CORS, etc.).
    throw new ApiError(0, 'Não foi possível conectar à API. Verifique se o backend está no ar.')
  }

  // Token inválido/expirado → encerra a sessão (RequireAuth manda para /login).
  if (res.status === 401 && auth) {
    useAuthStore.getState().logout()
  }

  if (!res.ok) {
    const body = await res
      .json()
      .then((d) => d as {
        error?: string
        issues?: Array<{ path?: Array<string | number>; message?: string }>
      })
      .catch(() => undefined)
    const issues = (body?.issues ?? [])
      .filter((issue): issue is { path: Array<string | number>; message: string } =>
        Array.isArray(issue.path) && typeof issue.message === 'string',
      )
      .map((issue) => ({ path: issue.path, message: issue.message }))
    throw new ApiError(res.status, body?.error ?? `Erro ${res.status}`, issues)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'POST', body }),
  put: <T>(path: string, body: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'PUT', body }),
  del: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'DELETE' }),
}
