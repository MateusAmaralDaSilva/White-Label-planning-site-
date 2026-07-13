import type { BillingStatus } from '../types/index.js'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Deriva o estado de assinatura a partir de `paidUntil`. Toda a regra de acesso
 * mora aqui, num só lugar:
 *
 *   • `active`   — a conta tem acesso (paid_until existe e ainda não passou).
 *   • `daysLeft` — dias inteiros até expirar; negativo se já expirou; null se a
 *                  conta nunca foi paga (paid_until nulo).
 *
 * Como o estado é DERIVADO da data (e não um flag persistido), a conta "expira
 * sozinha" quando o prazo passa — sem job/cron para virar o mês.
 */
export function billingFromPaidUntil(
  paidUntil: string | null,
  plan: string | null,
  now: Date = new Date(),
): BillingStatus {
  if (!paidUntil) {
    return { paidUntil: null, plan, active: false, daysLeft: null }
  }
  const end = new Date(paidUntil).getTime()
  const active = end >= now.getTime()
  const daysLeft = Math.ceil((end - now.getTime()) / DAY_MS)
  return { paidUntil, plan, active, daysLeft }
}
