import { badRequest, conflict, forbidden, notFound, HttpError } from '../../lib/http.js'

/** id do usuário autenticado (o "ator" repassado às funções do banco). */
export function actor(req: { auth?: { sub: string } }): string {
  return req.auth!.sub
}

/**
 * Traduz erros do PostgreSQL (SQLSTATE) das funções admin_* em HttpError, para o
 * handler de erro central devolver um status coerente ao cliente.
 */
function translatePgError(err: unknown): never {
  const code = (err as { code?: string }).code
  switch (code) {
    case '23505': // unique_violation — tenant/e-mail já existe
      throw conflict('Já existe uma conta com esse id de tenant ou e-mail')
    case '42501': // insufficient_privilege — ator não é admin
      throw forbidden('Requer administrador de plataforma')
    case 'P0002': // no_data_found — tenant inexistente (raise dentro da função)
      throw notFound('Tenant não encontrado')
    case '23514': // check_violation — ex.: meses <= 0
      throw badRequest('Valores inválidos para a operação')
    default:
      throw err as Error
  }
}

/** Executa `fn` traduzindo erros de PG; um HttpError já formado passa direto. */
export async function guard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (err instanceof HttpError) throw err
    translatePgError(err)
  }
}
