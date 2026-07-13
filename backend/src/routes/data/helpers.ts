import { badRequest } from '../../lib/http.js'

/**
 * Helpers compartilhados pelos sub-routers de dados. O `tenantId`/`sub` vêm
 * SEMPRE do JWT (req.auth) — o cliente nunca escolhe de qual tenant lê.
 */

/** Resolve o tenantId do token em cada request. */
export function tenant(req: { auth?: { tenantId: string } }): string {
  return req.auth!.tenantId
}

/** id do usuário autenticado (para a visibilidade de agendas privadas). */
export function uid(req: { auth?: { sub: string } }): string {
  return req.auth!.sub
}

/** id numérico de rota (produtos/clientes usam id inteiro por tenant). */
export function intId(raw: string): number {
  const id = Number(raw)
  if (!Number.isInteger(id)) throw badRequest('id inválido')
  return id
}
