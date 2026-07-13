import { z } from 'zod'
import { withTenant } from '../tenant-context.js'
import type { Sale } from '../../types/index.js'

/** SELECT compartilhado: já devolve receita e lucro derivados (por linha). */
const SALE_COLUMNS = `
  id::int as id, product_id as "productId", description, category, quantity,
  unit_price::float8 as "unitPrice", unit_cost::float8 as "unitCost",
  to_char(sold_at, 'YYYY-MM-DD') as "soldAt",
  buyer_email as email,
  (unit_price * quantity)::float8 as revenue,
  ((unit_price - unit_cost) * quantity)::float8 as profit`

/** Lista as vendas do tenant, mais recentes primeiro. */
export async function getSales(tenantId: string): Promise<Sale[]> {
  return withTenant(tenantId, (query) =>
    query<Sale>(
      `select ${SALE_COLUMNS}
         from app.sales
        where tenant_id = $1
        order by sold_at desc, id desc`,
      [tenantId],
    ),
  )
}

/**
 * Corpo de POST /api/sales. O cliente escolhe o produto, a quantidade e a data;
 * preço e custo NÃO vêm do cliente — são copiados do produto no servidor
 * (snapshot), evitando adulteração e preservando o histórico.
 */
export const saleCreateSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive(),
  soldAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve ser YYYY-MM-DD'),
  // E-mail opcional para análise: string vazia é tratada como ausente.
  email: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.string().trim().email().max(160).optional(),
  ),
})

export type SaleCreate = z.infer<typeof saleCreateSchema>

/**
 * Registra uma venda copiando nome/categoria/preço/custo do produto (snapshot).
 * Retorna undefined se o produto não existe no tenant — a rota responde 404.
 */
export async function createSale(tenantId: string, input: SaleCreate): Promise<Sale | undefined> {
  return withTenant(tenantId, async (query) => {
    const products = await query<{ name: string; category: string; price: number; cost: number }>(
      `select name, category, price::float8 as price, cost::float8 as cost
         from app.products where tenant_id = $1 and id = $2`,
      [tenantId, input.productId],
    )
    const p = products[0]
    if (!p) return undefined

    const rows = await query<Sale>(
      `insert into app.sales
         (tenant_id, product_id, description, category, quantity, unit_price, unit_cost, sold_at, buyer_email)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       returning ${SALE_COLUMNS}`,
      [tenantId, input.productId, p.name, p.category, input.quantity, p.price, p.cost, input.soldAt, input.email ?? null],
    )
    return rows[0]
  })
}

/** Remove uma venda. false se não existir no tenant do contexto. */
export async function deleteSale(tenantId: string, id: number): Promise<boolean> {
  return withTenant(tenantId, async (query) => {
    const rows = await query<{ id: number }>(
      'delete from app.sales where tenant_id = $1 and id = $2 returning id',
      [tenantId, id],
    )
    return rows.length > 0
  })
}
