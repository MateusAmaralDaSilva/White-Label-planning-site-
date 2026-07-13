import { z } from 'zod'
import { withTenant } from '../tenant-context.js'
import type { Customer } from '../../types/index.js'

/** Clientes. Substitui data/customers.ts (spent como número; o frontend formata). */
export async function getCustomers(tenantId: string): Promise<Customer[]> {
  return withTenant(tenantId, (query) =>
    query<Customer>(
      `select id, name, email, phone, orders, spent::float8 as spent, accent, responsible
         from app.customers
        where tenant_id = $1
        order by id`,
      [tenantId],
    ),
  )
}

/**
 * Paleta de cores de destaque (a mesma dos dados de seed). Quando o formulário
 * não envia um accent, escolhemos um de forma determinística pelo id do novo
 * cliente — assim avatares consecutivos não repetem a cor.
 */
const ACCENTS = ['#4F78FF', '#A78BFA', '#34D399', '#FBBF24', '#F87171', '#6366F1', '#EC4899']

/**
 * Schema de criação (POST /api/customers). `orders` e `spent` começam em zero
 * (cliente novo). `accent` é opcional; o regex espelha a CHECK do banco, que
 * impede que texto arbitrário chegue a um atributo de estilo no frontend.
 */
export const customerCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().min(1).max(40),
  accent: z
    .string()
    .regex(/^#[0-9A-Fa-f]{3,8}$/, 'Cor deve ser um hex válido (#RGB ou #RRGGBB)')
    .optional(),
  // Opcional e "limpável": string vazia vira undefined → NULL no banco.
  responsible: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => v || undefined),
})

export type CustomerCreate = z.infer<typeof customerCreateSchema>

/**
 * Cria um cliente para o tenant do contexto. Como em produtos, o `id` é por
 * tenant (PK composta) e calculado dentro da transação. O RLS (WITH CHECK)
 * garante que a linha pertence ao tenant do JWT.
 */
export async function createCustomer(tenantId: string, input: CustomerCreate): Promise<Customer> {
  return withTenant(tenantId, async (query) => {
    const [next] = await query<{ id: number }>(
      'select coalesce(max(id), 0) + 1 as id from app.customers where tenant_id = $1',
      [tenantId],
    )

    const accent = input.accent ?? ACCENTS[(next.id - 1) % ACCENTS.length]

    const rows = await query<Customer>(
      `insert into app.customers (tenant_id, id, name, email, phone, orders, spent, accent, responsible)
            values ($1, $2, $3, $4, $5, 0, 0, $6, $7)
         returning id, name, email, phone, orders, spent::float8 as spent, accent, responsible`,
      [tenantId, next.id, input.name, input.email, input.phone, accent, input.responsible ?? null],
    )
    return rows[0]
  })
}

/**
 * Edita um cliente. `accent` é opcional no corpo: quando omitido, mantém a cor
 * atual (coalesce) em vez de sobrescrever. `orders`/`spent` não são editáveis aqui.
 */
export async function updateCustomer(
  tenantId: string,
  id: number,
  input: CustomerCreate,
): Promise<Customer | undefined> {
  return withTenant(tenantId, async (query) => {
    const rows = await query<Customer>(
      `update app.customers
          set name = $3, email = $4, phone = $5, accent = coalesce($6, accent), responsible = $7
        where tenant_id = $1 and id = $2
        returning id, name, email, phone, orders, spent::float8 as spent, accent, responsible`,
      [tenantId, id, input.name, input.email, input.phone, input.accent ?? null, input.responsible ?? null],
    )
    return rows[0]
  })
}

/** Remove um cliente. false se não existir no tenant do contexto. */
export async function deleteCustomer(tenantId: string, id: number): Promise<boolean> {
  return withTenant(tenantId, async (query) => {
    const rows = await query<{ id: number }>(
      'delete from app.customers where tenant_id = $1 and id = $2 returning id',
      [tenantId, id],
    )
    return rows.length > 0
  })
}
