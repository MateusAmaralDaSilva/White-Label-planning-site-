import { withTenant } from '../tenant-context.js'
import { dayLabel, timeOfDay } from '../../lib/relative-time.js'
import type { ActivityEvent, ActivityType } from '../../types/index.js'

/**
 * Log de atividades (tela Atividades + mini-feed do Dashboard). Ordena por tempo
 * real (`occurred_at`) e deriva `date`/`time` dele na leitura — os rótulos não
 * ficam mais congelados (ver 0015). `customer` e `amount` são opcionais: quando
 * nulos no banco, são omitidos da resposta para bater com o contrato da API.
 */
export async function getActivity(tenantId: string): Promise<ActivityEvent[]> {
  return withTenant(tenantId, async (query) => {
    const rows = await query<{
      id: string
      type: ActivityType
      title: string
      customer: string | null
      amount: number | null
      occurred_at: Date
    }>(
      `select id, type, title, customer, amount::float8 as amount, occurred_at
         from app.activity_events
        where tenant_id = $1
       union all
       select 'sale-' || s.id::text as id,
              'sale'::app.activity_type as type,
              'Venda: ' || s.description as title,
              s.buyer_email::text as customer,
              (s.unit_price * s.quantity)::float8 as amount,
              s.created_at as occurred_at
         from app.sales s
        where s.tenant_id = $1
        order by occurred_at desc`,
      [tenantId],
    )

    return rows.map((r) => {
      const ev: ActivityEvent = {
        id: r.id,
        type: r.type,
        title: r.title,
        date: dayLabel(r.occurred_at),
        time: timeOfDay(r.occurred_at),
      }
      if (r.customer !== null) ev.customer = r.customer
      if (r.amount !== null) ev.amount = r.amount
      return ev
    })
  })
}
