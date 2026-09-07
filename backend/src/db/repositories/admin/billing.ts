import { withTransaction, type TenantQuery } from '../../tenant-context.js'
import type { CreditInput } from './schemas.js'

export const PLAN_MONTHS: Record<string, number> = { mensal: 1, semestral: 6, anual: 12 }
export const PLAN_PRICE: Record<string, number> = { mensal: 149, semestral: 799, anual: 1490 }

async function recordBillingEvent(
  query: TenantQuery, actorId: string, tenantId: string, plan: string,
  months: number, amountOverride?: number,
): Promise<void> {
  const amount = amountOverride ?? PLAN_PRICE[plan] ?? 0
  await query(
    'select app.admin_record_billing_event($1, $2, $3, $4, $5, $6)',
    [actorId, tenantId, plan, months, amount, null],
  )
}

export async function creditMonths(
  actorId: string, tenantId: string, input: CreditInput,
): Promise<{ paidUntil: string }> {
  return withTransaction(async (query) => {
    const rows = await query<{ admin_credit_months: Date }>(
      'select app.admin_credit_months($1, $2, $3, $4) as admin_credit_months',
      [actorId, tenantId, input.months, input.plan ?? null],
    )
    await recordBillingEvent(query, actorId, tenantId, input.plan ?? 'mensal', input.months, input.amount)
    return { paidUntil: rows[0].admin_credit_months.toISOString() }
  })
}

export { recordBillingEvent }
