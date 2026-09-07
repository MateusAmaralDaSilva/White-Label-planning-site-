import bcrypt from 'bcryptjs'
import { pool } from '../../pool.js'
import { withTransaction } from '../../tenant-context.js'
import { billingFromPaidUntil } from '../../../lib/billing.js'
import type { AdminAccount } from '../../../types/index.js'
import { PLAN_MONTHS, recordBillingEvent } from './billing.js'
import type { CreateAccountInput, UpdateAccountInput } from './schemas.js'

const BCRYPT_COST = 12

export async function listAccounts(actorId: string): Promise<AdminAccount[]> {
  const { rows } = await pool.query<{
    tenant_id: string; brand_name: string; brand_mark: string; theme_id: string
    brand_logo: string | null; plan: string | null; paid_until: Date | null
    max_users: number | null; industry: string | null; phone: string | null
    cnpj: string | null; user_count: string; created_at: Date
  }>('select * from app.admin_list_accounts($1)', [actorId])

  return rows.map((row) => {
    const paidUntil = row.paid_until?.toISOString() ?? null
    const billing = billingFromPaidUntil(paidUntil, row.plan)
    return {
      tenantId: row.tenant_id, brandName: row.brand_name, brandMark: row.brand_mark,
      themeId: row.theme_id, logo: row.brand_logo, plan: row.plan, paidUntil,
      active: billing.active, daysLeft: billing.daysLeft, maxUsers: row.max_users,
      industry: row.industry, phone: row.phone, cnpj: row.cnpj,
      userCount: Number(row.user_count), createdAt: row.created_at.toISOString(),
    }
  })
}

export async function createAccount(
  actorId: string, input: CreateAccountInput,
): Promise<{ tenantId: string; userId: string }> {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST)
  const months = PLAN_MONTHS[input.plan]
  const paidUntil = new Date()
  paidUntil.setMonth(paidUntil.getMonth() + months)

  return withTransaction(async (query) => {
    const rows = await query<{ tenant_id: string; user_id: string }>(
      'select * from app.admin_create_account($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)',
      [actorId, input.tenantId, input.brandName, input.brandMark, input.themeId,
        input.logo ?? null, input.userEmail, input.userName, passwordHash, input.plan,
        paidUntil.toISOString(), input.maxUsers ?? null, input.industry ?? null,
        input.phone ?? null, input.cnpj ?? null],
    )
    await recordBillingEvent(query, actorId, input.tenantId, input.plan, months, input.amount)
    return { tenantId: rows[0].tenant_id, userId: rows[0].user_id }
  })
}

export async function updateAccount(
  actorId: string, tenantId: string, input: UpdateAccountInput,
): Promise<void> {
  await pool.query(
    'select app.admin_update_account($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
    [actorId, tenantId, input.brandName, input.brandMark, input.themeId, input.logo ?? null,
      input.maxUsers ?? null, input.industry ?? null, input.phone ?? null, input.cnpj ?? null],
  )
}
