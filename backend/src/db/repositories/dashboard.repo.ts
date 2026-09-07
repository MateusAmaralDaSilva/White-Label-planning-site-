import { z } from 'zod'
import { withTenant } from '../tenant-context.js'
import type { DashboardData, DashboardStat, DashboardTask } from '../../types/index.js'

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/**
 * Dashboard (stats[] + tasks[]). Substitui data/dashboard.ts. O mini-feed
 * "Atividade Recente" NÃO vem daqui — o frontend deriva de GET /api/activity.
 * Retorna undefined quando o tenant não tem dashboard (a rota responde 404).
 */
export async function getDashboard(tenantId: string): Promise<DashboardData | undefined> {
  return withTenant(tenantId, async (query) => {
    const stats = await query<DashboardStat>(
      `select label, value, delta, tone, icon_key as "iconKey"
         from app.dashboard_stats where tenant_id = $1 order by sort_order`,
      [tenantId],
    )
    const tasks = await query<DashboardTask>(
      `select id::int as id, label, done
         from app.dashboard_tasks where tenant_id = $1 order by sort_order`,
      [tenantId],
    )

    // Os cards antigos foram criados como snapshots de onboarding. Receita,
    // pedidos e ticket precisam refletir as vendas reais, inclusive quando o
    // preÃ§o promocional foi salvo em `sales.unit_price`.
    const [salesSummary] = await query<{
      orders: number
      revenue: string
    }>(
      `select count(*)::int as orders,
              coalesce(sum(unit_price * quantity), 0) as revenue
         from app.sales
        where tenant_id = $1`,
      [tenantId],
    )
    const orders = Number(salesSummary?.orders ?? 0)
    const revenue = Number(salesSummary?.revenue ?? 0)
    const averageTicket = orders > 0 ? revenue / orders : 0

    const liveStats = stats.map((stat) => {
      if (stat.iconKey === 'revenue') return { ...stat, value: brl.format(revenue) }
      if (stat.iconKey === 'orders') return { ...stat, value: String(orders) }
      if (stat.iconKey === 'ticket') return { ...stat, value: brl.format(averageTicket) }
      return stat
    })

    if (stats.length === 0 && tasks.length === 0) return undefined
    return { stats: liveStats, tasks }
  })
}

/** Corpo de POST /api/dashboard/tasks — uma tarefa nova nasce sem estar concluída. */
export const taskCreateSchema = z.object({
  label: z.string().trim().min(1).max(160),
})
export type TaskCreate = z.infer<typeof taskCreateSchema>

/**
 * Corpo de PUT /api/dashboard/tasks/:id — patch parcial: `label` (edição do
 * texto) e/ou `done` (marcar/desmarcar). Exige ao menos um dos dois.
 */
export const taskUpdateSchema = z
  .object({
    label: z.string().trim().min(1).max(160).optional(),
    done: z.boolean().optional(),
  })
  .refine((v) => v.label !== undefined || v.done !== undefined, {
    message: 'Informe label e/ou done',
  })
export type TaskUpdate = z.infer<typeof taskUpdateSchema>

/** Cria uma tarefa no fim da lista (sort_order = próximo). */
export async function createTask(tenantId: string, input: TaskCreate): Promise<DashboardTask> {
  return withTenant(tenantId, async (query) => {
    const [next] = await query<{ n: number }>(
      'select coalesce(max(sort_order), -1) + 1 as n from app.dashboard_tasks where tenant_id = $1',
      [tenantId],
    )
    const rows = await query<DashboardTask>(
      `insert into app.dashboard_tasks (tenant_id, label, done, sort_order)
            values ($1, $2, false, $3)
         returning id::int as id, label, done`,
      [tenantId, input.label, next.n],
    )
    return rows[0]
  })
}

/**
 * Atualiza uma tarefa: só os campos enviados mudam (coalesce mantém o atual).
 * Serve tanto para editar o texto quanto para marcar/desmarcar (toggle).
 * undefined se a tarefa não existe no tenant — o RLS já restringe ao tenant e o
 * `and tenant_id` explícito é defesa em camadas.
 */
export async function updateTask(
  tenantId: string,
  taskId: number,
  patch: TaskUpdate,
): Promise<DashboardTask | undefined> {
  return withTenant(tenantId, async (query) => {
    const rows = await query<DashboardTask>(
      `update app.dashboard_tasks
          set label = coalesce($3, label), done = coalesce($4, done)
        where tenant_id = $1 and id = $2
        returning id::int as id, label, done`,
      [tenantId, taskId, patch.label ?? null, patch.done ?? null],
    )
    return rows[0]
  })
}

/** Remove uma tarefa. false se não existir no tenant do contexto. */
export async function deleteTask(tenantId: string, taskId: number): Promise<boolean> {
  return withTenant(tenantId, async (query) => {
    const rows = await query<{ id: number }>(
      'delete from app.dashboard_tasks where tenant_id = $1 and id = $2 returning id',
      [tenantId, taskId],
    )
    return rows.length > 0
  })
}
