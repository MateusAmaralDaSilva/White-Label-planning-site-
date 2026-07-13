import { pool } from '../pool.js'
import { withTenant } from '../tenant-context.js'
import { billingFromPaidUntil } from '../../lib/billing.js'
import type { BillingStatus, User } from '../../types/index.js'

/**
 * Acesso a usuários. Substitui data/users.ts (mapa em memória) mantendo as
 * mesmas assinaturas usadas por routes/auth.ts.
 */

/**
 * Verificação de LOGIN — anterior ao contexto de tenant. A senha é comparada
 * DENTRO do banco pela função SECURITY DEFINER `app.verify_credentials`, que
 * devolve o usuário público (SEM hash) só quando a senha confere — o hash nunca
 * sai do banco. E-mail/senha vão como parâmetros ($1/$2): sem interpolação, sem
 * injeção. `undefined` = e-mail inexistente OU senha errada (não distingue os dois).
 */
export async function verifyCredentials(
  email: string,
  password: string,
): Promise<User | undefined> {
  const { rows } = await pool.query<{
    id: string
    tenant_id: string
    email: string
    name: string
    is_platform_admin: boolean
    is_tenant_admin: boolean
  }>('select * from app.verify_credentials($1, $2)', [email, password])

  const row = rows[0]
  if (!row) return undefined
  return {
    id: row.id,
    tenantId: row.tenant_id,
    email: row.email,
    name: row.name,
    isPlatformAdmin: row.is_platform_admin,
    isTenantAdmin: row.is_tenant_admin,
  }
}

/**
 * Busca por id DENTRO do tenant (usada em GET /api/auth/me, quando o JWT já traz
 * o tenantId). O RLS garante que um id de outro tenant não seja encontrado. Não
 * lê o `password_hash` — a role da app nem tem SELECT nessa coluna (ver 0019).
 */
export async function findUserById(tenantId: string, id: string): Promise<User | undefined> {
  return withTenant(tenantId, async (query) => {
    const rows = await query<{
      id: string
      tenant_id: string
      email: string
      name: string
      is_platform_admin: boolean
      is_tenant_admin: boolean
    }>(
      `select id, tenant_id, email, name, is_platform_admin, is_tenant_admin
         from app.users
        where id = $1`,
      [id],
    )

    const row = rows[0]
    if (!row) return undefined
    return {
      id: row.id,
      tenantId: row.tenant_id,
      email: row.email,
      name: row.name,
      isPlatformAdmin: row.is_platform_admin,
      isTenantAdmin: row.is_tenant_admin,
    }
  })
}

/** Estado atual do usuário autenticado, relido do banco a cada requisição. */
export interface CurrentUser {
  isPlatformAdmin: boolean
  isTenantAdmin: boolean
  billing: BillingStatus
}

/**
 * Revalida o usuário do token contra o banco: confirma que ele AINDA existe e
 * relê o papel atual (`is_*_admin`) e a assinatura do tenant — numa única
 * consulta. É o que dá revogação imediata: excluir o login ou rebaixar o papel
 * passa a valer no próximo request (o token deixa de ser a fonte da verdade para
 * autorização). Sem hash de senha — só o necessário para autorizar.
 * `undefined` = usuário não existe mais (a rota responde 401).
 */
export async function getCurrentUser(
  tenantId: string,
  userId: string,
): Promise<CurrentUser | undefined> {
  return withTenant(tenantId, async (query) => {
    const rows = await query<{
      is_platform_admin: boolean
      is_tenant_admin: boolean
      paid_until: Date | null
      plan: string | null
    }>(
      `select u.is_platform_admin, u.is_tenant_admin, t.paid_until, t.plan
         from app.users u
         join app.tenants t on t.id = u.tenant_id
        where u.id = $1`,
      [userId],
    )
    const r = rows[0]
    if (!r) return undefined
    return {
      isPlatformAdmin: r.is_platform_admin,
      isTenantAdmin: r.is_tenant_admin,
      billing: billingFromPaidUntil(r.paid_until ? r.paid_until.toISOString() : null, r.plan),
    }
  })
}
