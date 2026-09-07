import { z } from 'zod'
import { withTenant, type TenantQuery } from '../tenant-context.js'
import { billingFromPaidUntil } from '../../lib/billing.js'
import type { ModuleConfig, TenantConfig } from '../../types/index.js'

/**
 * Configuração por tenant (marca + tema + módulos). Substitui data/tenants.ts.
 * `brand` e `tenantId` NÃO são editáveis — só tema e módulos (ver schema).
 */

/**
 * Schema do patch de config aceito por PUT /api/config. Fonte única da forma do
 * patch: a rota valida com ele e o tipo é derivado (`z.infer`), então validação
 * e tipagem nunca divergem.
 */
export const configPatchSchema = z.object({
  themeId: z.string().min(1).optional(),
  modules: z
    .array(
      z.object({
        id: z.string().min(1),
        enabled: z.boolean(),
        order: z.number().int().nonnegative(),
      }),
    )
    .optional(),
})

export type TenantConfigPatch = z.infer<typeof configPatchSchema>

/** Relê a config atual DENTRO da transação/contexto corrente (evita conexão aninhada). */
async function readConfig(query: TenantQuery, tenantId: string): Promise<TenantConfig | undefined> {
  const tenants = await query<{
    brand_name: string
    brand_mark: string
    brand_logo: string | null
    theme_id: string
    paid_until: Date | null
    plan: string | null
    phone: string | null
    cnpj: string | null
  }>(
    'select brand_name, brand_mark, brand_logo, theme_id, paid_until, plan, phone, cnpj from app.tenants where id = $1',
    [tenantId],
  )

  const t = tenants[0]
  if (!t) return undefined

  const modules = await query<ModuleConfig>(
    'select module_id as id, enabled, sort_order as "order" from app.modules where tenant_id = $1 order by sort_order',
    [tenantId],
  )

  return {
    tenantId,
    brand: { name: t.brand_name, mark: t.brand_mark, logo: t.brand_logo, phone: t.phone, cnpj: t.cnpj },
    themeId: t.theme_id,
    modules,
    billing: billingFromPaidUntil(t.paid_until ? t.paid_until.toISOString() : null, t.plan),
  }
}

export async function getTenantConfig(tenantId: string): Promise<TenantConfig | undefined> {
  return withTenant(tenantId, (query) => readConfig(query, tenantId))
}

/**
 * Aplica o patch (tema e/ou módulos) numa única transação e devolve a config
 * atualizada. Módulos são substituídos por completo — mesmo comportamento do
 * mock (cfg.modules = patch.modules). Retorna undefined se o tenant não existe.
 */
export async function updateTenantConfig(
  tenantId: string,
  patch: TenantConfigPatch,
): Promise<TenantConfig | undefined> {
  return withTenant(tenantId, async (query) => {
    const current = await readConfig(query, tenantId)
    if (!current) return undefined

    if (patch.themeId !== undefined) {
      await query('update app.tenants set theme_id = $1 where id = $2', [patch.themeId, tenantId])
    }

    if (patch.modules !== undefined) {
      await query('delete from app.modules where tenant_id = $1', [tenantId])
      if (patch.modules.length > 0) {
        // Um único INSERT com arrays (unnest) em vez de N inserts sequenciais —
        // uma ida ao banco, texto SQL fixo e tudo parametrizado ($2/$3/$4 são
        // arrays posicionais, sem dado do usuário concatenado).
        await query(
          `insert into app.modules (tenant_id, module_id, enabled, sort_order)
           select $1, mod_id, mod_enabled, mod_order
             from unnest($2::text[], $3::boolean[], $4::int[])
               as m(mod_id, mod_enabled, mod_order)`,
          [
            tenantId,
            patch.modules.map((m) => m.id),
            patch.modules.map((m) => m.enabled),
            patch.modules.map((m) => m.order),
          ],
        )
      }
    }

    return readConfig(query, tenantId)
  })
}
