import type { NextFunction, Request, Response } from 'express'
import { paymentRequired } from '../lib/http.js'

/**
 * Bloqueia o acesso aos dados quando a assinatura do tenant expirou. Roda depois
 * de `requireAuth` + `loadCurrentUser` (que já releu a assinatura do banco e a
 * deixou em `req.billing`), então NÃO faz consulta própria. Regras:
 *
 *   • Administrador de plataforma é ISENTO (gerencia contas mesmo sem assinatura).
 *   • Para os demais, se a assinatura não estiver ativa (`paid_until` ausente ou
 *     no passado), responde 402 Payment Required — o front redireciona para a
 *     tela de renovação.
 *
 * Como o estado é derivado de `paid_until`, o bloqueio "acontece sozinho" quando
 * o prazo passa: nenhum job precisa virar um flag.
 */
export function requireActiveSubscription(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (req.auth?.isPlatformAdmin) {
    next()
    return
  }

  if (!req.billing || !req.billing.active) {
    throw paymentRequired('Assinatura expirada. Renove para continuar.')
  }
  next()
}
