import { z } from 'zod'
import { withTenant } from '../tenant-context.js'
import type { Product, ProductKind } from '../../types/index.js'

/**
 * Produtos. Substitui data/products.ts mantendo a assinatura
 * `getProducts(tenantId)` que routes/data.ts consome. É também o modelo que os
 * demais repositórios seguem.
 *
 * Pontos de segurança:
 *   • withTenant setou `app.current_tenant`; o RLS filtra por tenant no banco.
 *     O `WHERE tenant_id` explícito é redundante de propósito (defesa em camadas)
 *     e deixa o índice (tenant_id, id) ser usado.
 *   • Sem valores de entrada concatenados no SQL. Se houvesse filtro do usuário
 *     (busca por nome, paginação), entraria como $2, $3... — nunca em template.
 *   • `price::float8` converte o NUMERIC para número, honrando o contrato da API
 *     (o frontend formata com formatBRL).
 */
/**
 * Lista os itens do tenant. `kind` opcional filtra por tipo (produto/serviço) —
 * usado pelas abas separadas. Sem `kind`, retorna os dois (ex.: seletor de vendas).
 */
export async function getProducts(tenantId: string, kind?: ProductKind): Promise<Product[]> {
  return withTenant(tenantId, async (query) => {
    return query<Product>(
      `select id, name, category, price::float8 as price, cost::float8 as cost, kind, stock
         from app.products
        where tenant_id = $1 and ($2::text is null or kind::text = $2)
        order by id`,
      [tenantId, kind ?? null],
    )
  })
}

/**
 * Schema de criação (POST /api/products). Fonte única da forma do corpo: a rota
 * valida com ele e o tipo é derivado (`z.infer`). Os limites espelham as CHECKs
 * do banco (price >= 0, stock >= 0) — validação na borda + defesa em profundidade.
 */
export const productCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(60),
  price: z.number().nonnegative(),
  cost: z.number().nonnegative(),
  kind: z.enum(['produto', 'servico']),
  stock: z.number().int().nonnegative(),
})

export type ProductCreate = z.infer<typeof productCreateSchema>

/**
 * Cria um produto para o tenant do contexto. O `id` numérico é por tenant
 * (PK composta), então calculamos o próximo dentro da mesma transação. O RLS
 * (WITH CHECK) recusaria uma linha de outro tenant — passamos $1 do JWT.
 */
export async function createProduct(tenantId: string, input: ProductCreate): Promise<Product> {
  return withTenant(tenantId, async (query) => {
    const [next] = await query<{ id: number }>(
      'select coalesce(max(id), 0) + 1 as id from app.products where tenant_id = $1',
      [tenantId],
    )

    const rows = await query<Product>(
      `insert into app.products (tenant_id, id, name, category, price, cost, kind, stock)
            values ($1, $2, $3, $4, $5, $6, $7, $8)
         returning id, name, category, price::float8 as price, cost::float8 as cost, kind, stock`,
      [tenantId, next.id, input.name, input.category, input.price, input.cost, input.kind, input.stock],
    )
    return rows[0]
  })
}

/** Edita um produto (substituição total dos campos). undefined se não existir no tenant. */
export async function updateProduct(
  tenantId: string,
  id: number,
  input: ProductCreate,
): Promise<Product | undefined> {
  return withTenant(tenantId, async (query) => {
    const rows = await query<Product>(
      `update app.products
          set name = $3, category = $4, price = $5, cost = $6, kind = $7, stock = $8
        where tenant_id = $1 and id = $2
        returning id, name, category, price::float8 as price, cost::float8 as cost, kind, stock`,
      [tenantId, id, input.name, input.category, input.price, input.cost, input.kind, input.stock],
    )
    return rows[0]
  })
}

/** Remove um produto. false se não existir no tenant do contexto. */
export async function deleteProduct(tenantId: string, id: number): Promise<boolean> {
  return withTenant(tenantId, async (query) => {
    const rows = await query<{ id: number }>(
      'delete from app.products where tenant_id = $1 and id = $2 returning id',
      [tenantId, id],
    )
    return rows.length > 0
  })
}
