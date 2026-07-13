import { z } from 'zod'
import { withTenant, type TenantQuery } from '../tenant-context.js'
import type { Expense } from '../../types/index.js'

/** Lê os gastos DENTRO da transação/contexto corrente (usado também pelos reports). */
export function readExpenses(query: TenantQuery, tenantId: string): Promise<Expense[]> {
  return query<Expense>(
    `select id::int as id, to_char(ref_month, 'YYYY-MM') as "refMonth", label, amount::float8 as amount
       from app.expenses
      where tenant_id = $1
      order by ref_month desc, id desc`,
    [tenantId],
  )
}

/** Lista os gastos do tenant. */
export async function getExpenses(tenantId: string): Promise<Expense[]> {
  return withTenant(tenantId, (query) => readExpenses(query, tenantId))
}

/**
 * Corpo de POST /api/expenses. `refMonth` no formato 'YYYY-MM' (o mês de
 * competência); no banco vira o 1º dia desse mês.
 */
export const expenseCreateSchema = z.object({
  refMonth: z.string().regex(/^\d{4}-\d{2}$/, 'Mês deve ser YYYY-MM'),
  label: z.string().trim().min(1).max(120),
  amount: z.number().nonnegative(),
})

export type ExpenseCreate = z.infer<typeof expenseCreateSchema>

/** Registra um gasto mensal (refMonth 'YYYY-MM' → 1º dia do mês). */
export async function createExpense(tenantId: string, input: ExpenseCreate): Promise<Expense> {
  return withTenant(tenantId, async (query) => {
    const rows = await query<Expense>(
      `insert into app.expenses (tenant_id, ref_month, label, amount)
            values ($1, to_date($2, 'YYYY-MM'), $3, $4)
         returning id::int as id, to_char(ref_month, 'YYYY-MM') as "refMonth", label, amount::float8 as amount`,
      [tenantId, input.refMonth, input.label, input.amount],
    )
    return rows[0]
  })
}

/** Remove um gasto. false se não existir no tenant do contexto. */
export async function deleteExpense(tenantId: string, id: number): Promise<boolean> {
  return withTenant(tenantId, async (query) => {
    const rows = await query<{ id: number }>(
      'delete from app.expenses where tenant_id = $1 and id = $2 returning id',
      [tenantId, id],
    )
    return rows.length > 0
  })
}
