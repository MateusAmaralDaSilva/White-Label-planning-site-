// ── Billing / assinatura ──────────────────────────────────────────────────────

/**
 * Estado de assinatura de um tenant, derivado de `paid_until`. `active` já vem
 * computado (paid_until >= agora); o front usa `daysLeft` para o banner de aviso.
 */
export interface BillingStatus {
  /** ISO 8601 ou null (nunca pago). */
  paidUntil: string | null
  plan: string | null
  active: boolean
  /** Dias inteiros até expirar (negativo se já expirou; null se nunca pago). */
  daysLeft: number | null
}
