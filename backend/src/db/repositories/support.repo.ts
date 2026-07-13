import { z } from 'zod'
import { withTenant } from '../tenant-context.js'
import { relativeLabel } from '../../lib/relative-time.js'
import type { Ticket } from '../../types/index.js'

/** Linha crua do banco: o `time` de exibição é derivado de `occurred_at`. */
interface TicketRow {
  id: string
  subject: string
  customer: string
  status: string
  tone: Ticket['tone']
  occurred_at: Date
}

/** Mapeia a linha para o contrato da API, calculando o `time` relativo na leitura. */
const toTicket = (r: TicketRow): Ticket => ({
  id: r.id,
  subject: r.subject,
  customer: r.customer,
  status: r.status,
  tone: r.tone,
  time: relativeLabel(r.occurred_at),
})

/** Chamados de suporte, mais recentes primeiro (por `occurred_at`). */
export async function getTickets(tenantId: string): Promise<Ticket[]> {
  return withTenant(tenantId, async (query) => {
    const rows = await query<TicketRow>(
      `select id, subject, customer, status, tone, occurred_at
         from app.support_tickets
        where tenant_id = $1
        order by occurred_at desc`,
      [tenantId],
    )
    return rows.map(toTicket)
  })
}

/**
 * Schema de criação (POST /api/support/tickets). O status/tom/tempo de um chamado
 * novo são definidos pelo servidor (sempre "Aberto"), então o corpo só traz o
 * assunto e o cliente.
 */
export const ticketCreateSchema = z.object({
  subject: z.string().trim().min(1).max(160),
  customer: z.string().trim().min(1).max(120),
})

export type TicketCreate = z.infer<typeof ticketCreateSchema>

/**
 * Cria um chamado para o tenant do contexto. O `id` é textual e formatado
 * ("#001", "#002", ...): calculamos o próximo a partir do maior número existente.
 * Um chamado novo entra como "Aberto" (tom danger); `occurred_at` = agora (default
 * do banco), então ele já aparece no topo da lista (ordenada por tempo desc).
 */
export async function createTicket(tenantId: string, input: TicketCreate): Promise<Ticket> {
  return withTenant(tenantId, async (query) => {
    const [agg] = await query<{ next: number }>(
      `select coalesce(max(nullif(regexp_replace(id, '\\D', '', 'g'), '')::int), 0) + 1 as next
         from app.support_tickets
        where tenant_id = $1`,
      [tenantId],
    )
    const id = '#' + String(agg.next).padStart(3, '0')

    const rows = await query<TicketRow>(
      `insert into app.support_tickets
         (id, tenant_id, subject, customer, status, tone)
       values ($1, $2, $3, $4, 'Aberto', 'danger')
       returning id, subject, customer, status, tone, occurred_at`,
      [id, tenantId, input.subject, input.customer],
    )
    return toTicket(rows[0])
  })
}

/** Cada status tem um tom fixo — o servidor decide o tom a partir do status. */
const STATUS_TONE = {
  Aberto: 'danger',
  'Em andamento': 'warning',
  Resolvido: 'success',
} as const

/** Edição inclui o status (o create sempre nasce "Aberto"); o tom é derivado dele. */
export const ticketUpdateSchema = ticketCreateSchema.extend({
  status: z.enum(['Aberto', 'Em andamento', 'Resolvido']),
})

export type TicketUpdate = z.infer<typeof ticketUpdateSchema>

/** Edita um chamado. O tom acompanha o status. undefined se não existir no tenant. */
export async function updateTicket(
  tenantId: string,
  id: string,
  input: TicketUpdate,
): Promise<Ticket | undefined> {
  return withTenant(tenantId, async (query) => {
    const rows = await query<TicketRow>(
      `update app.support_tickets
          set subject = $3, customer = $4, status = $5, tone = $6
        where tenant_id = $1 and id = $2
        returning id, subject, customer, status, tone, occurred_at`,
      [tenantId, id, input.subject, input.customer, input.status, STATUS_TONE[input.status]],
    )
    return rows[0] ? toTicket(rows[0]) : undefined
  })
}

/** Remove um chamado. false se não existir no tenant do contexto. */
export async function deleteTicket(tenantId: string, id: string): Promise<boolean> {
  return withTenant(tenantId, async (query) => {
    const rows = await query<{ id: string }>(
      'delete from app.support_tickets where tenant_id = $1 and id = $2 returning id',
      [tenantId, id],
    )
    return rows.length > 0
  })
}
