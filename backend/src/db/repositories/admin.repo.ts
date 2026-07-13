import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { pool } from '../pool.js'
import { withTransaction, type TenantQuery } from '../tenant-context.js'
import { billingFromPaidUntil } from '../../lib/billing.js'
import type { AdminAccount, AdminUser } from '../../types/index.js'

/**
 * Operações do administrador de plataforma. Elas atravessam tenants (criar um
 * tenant novo acontece FORA de qualquer contexto de tenant), então vão pelas
 * funções `SECURITY DEFINER` `app.admin_*` — o único caminho autorizado a
 * escrever fora do RLS. Cada chamada passa o `actorId` (id do usuário do JWT) e
 * a função no banco revalida `is_platform_admin(actorId)` antes de qualquer
 * escrita (defesa em profundidade além do `requireAdmin` no backend).
 *
 * Toda entrada é parametrizada ($1, $2, …) — sem concatenação em SQL. O hash da
 * senha é calculado AQUI (bcrypt custo 12); o banco nunca vê a senha em claro.
 */

const BCRYPT_COST = 12

/** Duração de cada plano em meses (usada para creditar a assinatura na criação). */
export const PLAN_MONTHS: Record<string, number> = {
  mensal: 1,
  semestral: 6,
  anual: 12,
}

/**
 * Preço COBRADO por plano, em BRL. Fonte viva dos valores usados no ledger de
 * cobranças (app.billing_events). São placeholders — espelham
 * frontend/src/config/plans.ts; troque pelos valores reais aqui.
 *
 * Importante: o valor é gravado como SNAPSHOT no momento da cobrança, então
 * reajustar estes números NÃO reescreve o histórico já registrado — só afeta as
 * cobranças futuras (mesma garantia do snapshot de preço/custo das vendas).
 */
export const PLAN_PRICE: Record<string, number> = {
  mensal: 149,
  semestral: 799,
  anual: 1490,
}

/**
 * Registra uma cobrança no ledger da plataforma (app.billing_events) com o valor
 * do plano no momento (snapshot). Roda DENTRO da transação da criação/renovação
 * (recebe a `query` da transação), então conta e cobrança são atômicas: se o
 * registro falhar, a operação inteira é desfeita — sem conta sem cobrança nem
 * vice-versa. `charged_at` permite datar o evento no passado (default = agora).
 */
async function recordBillingEvent(
  query: TenantQuery,
  actorId: string,
  tenantId: string,
  plan: string,
  months: number,
  chargedAt?: Date,
): Promise<void> {
  const amount = PLAN_PRICE[plan] ?? 0
  await query(
    'select app.admin_record_billing_event($1, $2, $3, $4, $5, $6)',
    [actorId, tenantId, plan, months, amount, chargedAt ?? null],
  )
}

/** id de tenant: minúsculas, números e hífen — vira parte de chaves e URLs. */
const tenantIdSchema = z
  .string()
  .trim()
  .min(2, 'id do tenant muito curto')
  .max(40)
  .regex(/^[a-z0-9-]+$/, 'use apenas letras minúsculas, números e hífen')

const planSchema = z.enum(['mensal', 'semestral', 'anual'])

/**
 * Ramo (setor) da conta: TEXTO LIVRE, sem lista fixa a manter em sincronia. As
 * opções que aparecem no /admin vêm dos ramos JÁ USADOS por outras contas
 * (derivadas dos dados), então digitar um ramo novo passa a sugeri-lo nas
 * próximas. O valor guardado é o próprio rótulo exibido. Trade-off assumido:
 * permite grafias duplicadas ("Varejo" vs "varejo"). String vazia/só espaços → null.
 */
const industrySchema = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
  z.string().trim().min(1).max(60).nullable().optional(),
)

/**
 * Logo como DATA URI de imagem (base64), opcional. Limite ~500KB de string para
 * evitar payloads gigantes no banco/JSON. `null`/ausente = sem logo (usa a sigla).
 * Renderizada via <img>, então SVG também é seguro (não executa script).
 */
const logoSchema = z
  .string()
  .max(700_000, 'logo muito grande (use uma imagem de até ~500KB)')
  .regex(/^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=\s]+$/, 'a logo deve ser uma imagem')
  .nullable()
  .optional()

/** Campos de marca + limite de usuários, comuns a criar e editar. */
const brandFields = {
  brandName: z.string().trim().min(1).max(80),
  brandMark: z.string().trim().min(1).max(4),
  brandTagline: z.string().trim().min(1).max(120),
  themeId: z.string().trim().min(1).max(40).default('light'),
  logo: logoSchema,
  // Limite de logins da conta; null/ausente = ilimitado.
  maxUsers: z.number().int().positive().max(100000).nullable().optional(),
  // Ramo de atividade (setor) da conta; null/ausente = não informado.
  industry: industrySchema,
}

export const createAccountSchema = z.object({
  tenantId: tenantIdSchema,
  ...brandFields,
  userEmail: z.string().trim().email('e-mail inválido').max(120),
  userName: z.string().trim().min(1).max(80),
  // Senha forte: mínimo 8 caracteres. O hash é gerado no servidor.
  password: z.string().min(8, 'a senha deve ter ao menos 8 caracteres').max(200),
  plan: planSchema,
})

/** Editar a marca de uma conta existente (nome/sigla/slogan/tema/logo). */
export const updateAccountSchema = z.object({ ...brandFields })

export const addUserSchema = z.object({
  userEmail: z.string().trim().email('e-mail inválido').max(120),
  userName: z.string().trim().min(1).max(80),
  password: z.string().min(8, 'a senha deve ter ao menos 8 caracteres').max(200),
})

export const creditSchema = z.object({
  months: z.number().int().positive().max(120),
  plan: planSchema.optional(),
})

export type CreateAccountInput = z.infer<typeof createAccountSchema>
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>
export type AddUserInput = z.infer<typeof addUserSchema>
export type CreditInput = z.infer<typeof creditSchema>

/** Lista todas as contas (exceto o tenant técnico 'platform') para o painel. */
export async function listAccounts(actorId: string): Promise<AdminAccount[]> {
  const { rows } = await pool.query<{
    tenant_id: string
    brand_name: string
    brand_mark: string
    brand_tagline: string
    theme_id: string
    brand_logo: string | null
    plan: string | null
    paid_until: Date | null
    max_users: number | null
    industry: string | null
    user_count: string
    created_at: Date
  }>('select * from app.admin_list_accounts($1)', [actorId])

  return rows.map((r) => {
    const paidUntil = r.paid_until ? r.paid_until.toISOString() : null
    const b = billingFromPaidUntil(paidUntil, r.plan)
    return {
      tenantId: r.tenant_id,
      brandName: r.brand_name,
      brandMark: r.brand_mark,
      brandTagline: r.brand_tagline,
      themeId: r.theme_id,
      logo: r.brand_logo,
      plan: r.plan,
      paidUntil,
      active: b.active,
      daysLeft: b.daysLeft,
      maxUsers: r.max_users,
      industry: r.industry,
      // count(*) volta como bigint → string no driver; converte para número.
      userCount: Number(r.user_count),
      createdAt: r.created_at.toISOString(),
    }
  })
}

/**
 * Cria uma conta nova (tenant + módulos padrão + primeiro login), já creditando
 * os meses do plano escolhido a partir de agora.
 */
export async function createAccount(
  actorId: string,
  input: CreateAccountInput,
): Promise<{ tenantId: string; userId: string }> {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST)
  const months = PLAN_MONTHS[input.plan]
  const paidUntil = new Date()
  paidUntil.setMonth(paidUntil.getMonth() + months)

  // Conta + 1ª cobrança na MESMA transação: as duas valem juntas ou nenhuma vale.
  return withTransaction(async (query) => {
    const rows = await query<{ tenant_id: string; user_id: string }>(
      `select * from app.admin_create_account($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        actorId,
        input.tenantId,
        input.brandName,
        input.brandMark,
        input.brandTagline,
        input.themeId,
        input.logo ?? null,
        input.userEmail,
        input.userName,
        passwordHash,
        input.plan,
        paidUntil.toISOString(),
        input.maxUsers ?? null,
        input.industry ?? null,
      ],
    )
    const row = rows[0]
    await recordBillingEvent(query, actorId, input.tenantId, input.plan, months)
    return { tenantId: row.tenant_id, userId: row.user_id }
  })
}

/** Atualiza a marca (nome/sigla/slogan/tema/logo) e o limite de usuários. */
export async function updateAccount(
  actorId: string,
  tenantId: string,
  input: UpdateAccountInput,
): Promise<void> {
  await pool.query('select app.admin_update_account($1, $2, $3, $4, $5, $6, $7, $8, $9)', [
    actorId,
    tenantId,
    input.brandName,
    input.brandMark,
    input.brandTagline,
    input.themeId,
    input.logo ?? null,
    input.maxUsers ?? null,
    input.industry ?? null,
  ])
}

/** Lista os logins (usuários) de um tenant, sem o hash de senha. */
export async function listUsers(actorId: string, tenantId: string): Promise<AdminUser[]> {
  const { rows } = await pool.query<{
    id: string
    email: string
    name: string
    is_tenant_admin: boolean
    created_at: Date
  }>('select * from app.admin_list_users($1, $2)', [actorId, tenantId])

  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    name: r.name,
    isTenantAdmin: r.is_tenant_admin,
    createdAt: r.created_at.toISOString(),
  }))
}

/** Promove/rebaixa um login a administrador do tenant. */
export async function setTenantAdmin(
  actorId: string,
  tenantId: string,
  userId: string,
  isAdmin: boolean,
): Promise<void> {
  await pool.query('select app.admin_set_tenant_admin($1, $2, $3, $4)', [
    actorId,
    tenantId,
    userId,
    isAdmin,
  ])
}

/** Adiciona um login a um tenant existente. */
export async function addUser(
  actorId: string,
  tenantId: string,
  input: AddUserInput,
): Promise<{ userId: string }> {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST)
  const { rows } = await pool.query<{ admin_add_user: string }>(
    'select app.admin_add_user($1, $2, $3, $4, $5) as admin_add_user',
    [actorId, tenantId, input.userEmail, input.userName, passwordHash],
  )
  return { userId: rows[0].admin_add_user }
}

/** Credita N meses de assinatura a um tenant e devolve a nova validade. */
export async function creditMonths(
  actorId: string,
  tenantId: string,
  input: CreditInput,
): Promise<{ paidUntil: string }> {
  // Renovação + registro no ledger na MESMA transação (atômico).
  return withTransaction(async (query) => {
    const rows = await query<{ admin_credit_months: Date }>(
      'select app.admin_credit_months($1, $2, $3, $4) as admin_credit_months',
      [actorId, tenantId, input.months, input.plan ?? null],
    )
    // Usa o plano informado; se ausente, cai no 'mensal' só para precificar o
    // evento (o acesso já foi estendido pela função).
    await recordBillingEvent(query, actorId, tenantId, input.plan ?? 'mensal', input.months)
    return { paidUntil: rows[0].admin_credit_months.toISOString() }
  })
}
