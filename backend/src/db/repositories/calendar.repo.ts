import { z } from 'zod'
import { withTenant, type TenantQuery } from '../tenant-context.js'
import type { Calendar, CalendarEvent } from '../../types/index.js'

/**
 * Agendas e agendamentos.
 *
 * Além do isolamento por tenant (RLS), há uma segunda camada DENTRO do tenant: a
 * visibilidade por usuário. Uma agenda é visível/gerenciável pelo usuário quando
 * é COMPARTILHADA (is_private = false) ou quando ele é o DONO (owner_user_id).
 * Essa regra — a mesma para ver e para gerenciar — vive no predicado abaixo e é
 * aplicada em toda consulta, com o id do usuário vindo do JWT (nunca do corpo).
 */

/** Predicado SQL de visibilidade/gerência de uma agenda `c` para o usuário $2. */
const VISIBLE = '(c.is_private = false or c.owner_user_id = $2)'

const COLOR = /^#[0-9A-Fa-f]{3,8}$/

// ── Agendas ───────────────────────────────────────────────────────────────────

export const calendarCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  color: z.string().regex(COLOR, 'Cor deve ser um hex válido').default('#4F78FF'),
  isPrivate: z.boolean().default(false),
})

export type CalendarCreate = z.infer<typeof calendarCreateSchema>

/** Mapeia a linha do banco para o contrato da API (isOwner derivado). */
function toCalendar(row: {
  id: string
  name: string
  color: string
  is_private: boolean
  owner_user_id: string | null
  user_id: string
}): Calendar {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    isPrivate: row.is_private,
    isOwner: row.owner_user_id === row.user_id,
  }
}

/** Agendas visíveis ao usuário: compartilhadas + as privadas dele. */
export async function getCalendars(tenantId: string, userId: string): Promise<Calendar[]> {
  return withTenant(tenantId, async (query) => {
    const rows = await query<{
      id: string
      name: string
      color: string
      is_private: boolean
      owner_user_id: string | null
      user_id: string
    }>(
      `select c.id, c.name, c.color, c.is_private, c.owner_user_id, $2::text as user_id
         from app.calendars c
        where c.tenant_id = $1 and ${VISIBLE}
        order by c.is_private, c.name`,
      [tenantId, userId],
    )
    return rows.map(toCalendar)
  })
}

export async function createCalendar(
  tenantId: string,
  userId: string,
  input: CalendarCreate,
): Promise<Calendar> {
  return withTenant(tenantId, async (query) => {
    const rows = await query<{
      id: string
      name: string
      color: string
      is_private: boolean
      owner_user_id: string | null
      user_id: string
    }>(
      `insert into app.calendars (tenant_id, name, color, is_private, owner_user_id)
            values ($1, $3, $4, $5, $2)
         returning id, name, color, is_private, owner_user_id, $2::text as user_id`,
      [tenantId, userId, input.name, input.color, input.isPrivate],
    )
    return toCalendar(rows[0])
  })
}

/**
 * Edita uma agenda que o usuário pode gerenciar. Ao torná-la privada, a posse
 * passa para quem editou; ao mantê-la/torná-la compartilhada, preserva o dono.
 * undefined se a agenda não existe ou o usuário não pode gerenciá-la.
 */
export async function updateCalendar(
  tenantId: string,
  userId: string,
  id: string,
  input: CalendarCreate,
): Promise<Calendar | undefined> {
  return withTenant(tenantId, async (query) => {
    const rows = await query<{
      id: string
      name: string
      color: string
      is_private: boolean
      owner_user_id: string | null
      user_id: string
    }>(
      `update app.calendars c
          set name = $4, color = $5, is_private = $6,
              owner_user_id = case when $6 then $2 else owner_user_id end
        where c.tenant_id = $1 and c.id = $3 and ${VISIBLE}
        returning c.id, c.name, c.color, c.is_private, c.owner_user_id, $2::text as user_id`,
      [tenantId, userId, id, input.name, input.color, input.isPrivate],
    )
    return rows[0] ? toCalendar(rows[0]) : undefined
  })
}

/** Remove uma agenda (e seus eventos, por cascade). false se não gerenciável. */
export async function deleteCalendar(
  tenantId: string,
  userId: string,
  id: string,
): Promise<boolean> {
  return withTenant(tenantId, async (query) => {
    const rows = await query<{ id: string }>(
      `delete from app.calendars c
        where c.tenant_id = $1 and c.id = $3 and ${VISIBLE}
        returning c.id`,
      [tenantId, userId, id],
    )
    return rows.length > 0
  })
}

// ── Agendamentos ──────────────────────────────────────────────────────────────

/**
 * Schema de criação/edição de evento. `month` é 0-based (como o Date do JS e o
 * schema do banco). `calendarId` diz a qual agenda o evento pertence.
 */
export const eventCreateSchema = z.object({
  calendarId: z.string().min(1),
  label: z.string().trim().min(1).max(120),
  year: z.number().int().min(1970).max(9999),
  month: z.number().int().min(0).max(11),
  day: z.number().int().min(1).max(31),
  color: z.string().regex(COLOR, 'Cor deve ser um hex válido').optional(),
})

export type EventCreate = z.infer<typeof eventCreateSchema>

const EVENT_COLS = 'id, year, month, day, label, color, calendar_id as "calendarId"'

/** Eventos das agendas visíveis ao usuário. */
export async function getCalendarEvents(tenantId: string, userId: string): Promise<CalendarEvent[]> {
  return withTenant(tenantId, (query) =>
    query<CalendarEvent>(
      `select e.id, e.year, e.month, e.day, e.label, e.color, e.calendar_id as "calendarId"
         from app.calendar_events e
         join app.calendars c on c.id = e.calendar_id
        where e.tenant_id = $1 and ${VISIBLE}
        order by e.year, e.month, e.day`,
      [tenantId, userId],
    ),
  )
}

/**
 * Cria um evento numa agenda visível ao usuário. O INSERT só grava se a agenda
 * alvo existir no tenant e for visível/gerenciável — senão retorna undefined
 * (rota traduz para 404), sem confiar apenas na validação do corpo.
 */
export async function createCalendarEvent(
  tenantId: string,
  userId: string,
  input: EventCreate,
): Promise<CalendarEvent | undefined> {
  return withTenant(tenantId, async (query) => {
    const rows = await query<CalendarEvent>(
      `insert into app.calendar_events (tenant_id, calendar_id, year, month, day, label, color)
       select $1, $3, $4, $5, $6, $7, $8
        where exists (
          select 1 from app.calendars c
           where c.id = $3 and c.tenant_id = $1 and ${VISIBLE}
        )
       returning ${EVENT_COLS}`,
      [tenantId, userId, input.calendarId, input.year, input.month, input.day, input.label, input.color ?? '#4F78FF'],
    )
    return rows[0]
  })
}

/**
 * Edita um evento. Exige que o usuário possa gerenciar TANTO a agenda atual do
 * evento QUANTO a agenda de destino (permite mover entre agendas visíveis).
 */
export async function updateCalendarEvent(
  tenantId: string,
  userId: string,
  id: string,
  input: EventCreate,
): Promise<CalendarEvent | undefined> {
  return withTenant(tenantId, async (query) => {
    const rows = await query<CalendarEvent>(
      `update app.calendar_events e
          set year = $4, month = $5, day = $6, label = $7,
              color = coalesce($8, color), calendar_id = $9
        where e.tenant_id = $1 and e.id = $3
          and exists (
            select 1 from app.calendars c
             where c.id = e.calendar_id and ${VISIBLE}
          )
          and exists (
            select 1 from app.calendars c
             where c.id = $9 and c.tenant_id = $1 and ${VISIBLE}
          )
       returning ${EVENT_COLS}`,
      [tenantId, userId, id, input.year, input.month, input.day, input.label, input.color ?? null, input.calendarId],
    )
    return rows[0]
  })
}

/** Remove um evento de uma agenda visível ao usuário. false se não encontrado. */
export async function deleteCalendarEvent(
  tenantId: string,
  userId: string,
  id: string,
): Promise<boolean> {
  return withTenant(tenantId, async (query) => {
    const rows = await query<{ id: string }>(
      `delete from app.calendar_events e
        where e.tenant_id = $1 and e.id = $3
          and exists (
            select 1 from app.calendars c
             where c.id = e.calendar_id and ${VISIBLE}
          )
       returning e.id`,
      [tenantId, userId, id],
    )
    return rows.length > 0
  })
}
