import type { NextFunction, Request, Response } from 'express'
import { verifyToken } from '../lib/jwt.js'
import { forbidden, unauthorized } from '../lib/http.js'
import { getCurrentUser } from '../db/repositories/users.repo.js'
import type { BillingStatus, JwtPayload } from '../types/index.js'

/** Aumenta o Request do Express com o usuário autenticado. */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: JwtPayload
      /** Assinatura do tenant, relida do banco por `loadCurrentUser`. */
      billing?: BillingStatus
    }
  }
}

/**
 * Exige um Bearer token válido. Popula `req.auth` com o payload do JWT
 * (inclui `tenantId`, usado pelas rotas para isolar dados por tenant).
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.header('authorization') ?? ''
  const [scheme, token] = header.split(' ')

  if (scheme !== 'Bearer' || !token) {
    throw unauthorized('Token ausente ou mal formatado')
  }

  try {
    req.auth = verifyToken(token)
    next()
  } catch {
    throw unauthorized('Token inválido ou expirado')
  }
}

/**
 * Revalida o usuário do token contra o banco a CADA requisição (roda depois de
 * `requireAuth`). É o que garante revogação imediata:
 *
 *   • Se o login foi EXCLUÍDO, a consulta não acha o usuário → 401 (o token
 *     deixa de dar acesso na hora, sem esperar expirar).
 *   • O papel (`isPlatformAdmin`/`isTenantAdmin`) é RELIDO do banco e sobrescreve
 *     o do token, então rebaixar/promover vale já no próximo request — as checagens
 *     `requireAdmin`/`requireTenantAdmin` passam a olhar o estado atual, não o do
 *     login. A assinatura vem na mesma consulta (reaproveitada por
 *     `requireActiveSubscription`, que não volta ao banco).
 *
 * Custo: uma consulta indexada por requisição. É o trade-off consciente da
 * revogação instantânea (ver "Revisão do backend" no README).
 */
export function loadCurrentUser(req: Request, _res: Response, next: NextFunction): void {
  const auth = req.auth!
  getCurrentUser(auth.tenantId, auth.sub)
    .then((current) => {
      if (!current) throw unauthorized('Usuário não encontrado')
      auth.isPlatformAdmin = current.isPlatformAdmin
      auth.isTenantAdmin = current.isTenantAdmin
      req.billing = current.billing
      next()
    })
    .catch(next)
}

/**
 * Exige que o usuário autenticado seja administrador de plataforma. Usa o flag
 * `isPlatformAdmin` do JWT (assinado pelo servidor a partir do banco, logo não
 * forjável). Deve rodar SEMPRE depois de `requireAuth`. Defesa em profundidade:
 * as funções `admin_*` do banco também revalidam o papel do ator.
 */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.auth?.isPlatformAdmin) {
    throw forbidden('Requer administrador de plataforma')
  }
  next()
}

/**
 * Exige que o usuário seja administrador do próprio tenant (dono da conta) — para
 * gerenciar os logins da empresa. Roda depois de `requireAuth`. O flag vem do JWT
 * assinado pelo servidor, logo não forjável.
 */
export function requireTenantAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.auth?.isTenantAdmin) {
    throw forbidden('Requer administrador da conta')
  }
  next()
}