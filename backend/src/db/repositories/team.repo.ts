import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { withTenant } from '../tenant-context.js'
import type { TeamData, TeamMember } from '../../types/index.js'

/**
 * Gestão de logins DENTRO de uma conta, feita pelo admin do tenant (dono da
 * empresa). Diferente das funções de plataforma (admin_*), aqui NÃO usamos
 * SECURITY DEFINER: tudo roda no contexto do tenant (RLS), então o app só
 * enxerga/mexe nos usuários da própria conta. O hash da senha é gerado aqui
 * (bcrypt); o banco nunca vê a senha em claro.
 */

const BCRYPT_COST = 12

export const teamMemberCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email('e-mail inválido').max(120),
  password: z.string().min(8, 'a senha deve ter ao menos 8 caracteres').max(200),
})

export type TeamMemberCreate = z.infer<typeof teamMemberCreateSchema>

interface MemberRow {
  id: string
  email: string
  name: string
  is_tenant_admin: boolean
  created_at: Date
}

const toMember = (r: MemberRow): TeamMember => ({
  id: r.id,
  email: r.email,
  name: r.name,
  isTenantAdmin: r.is_tenant_admin,
  createdAt: r.created_at.toISOString(),
})

/** Limite de assentos + membros da conta. */
export async function getTeam(tenantId: string): Promise<TeamData> {
  return withTenant(tenantId, async (query) => {
    const limitRows = await query<{ max_users: number | null }>(
      'select max_users from app.tenants where id = $1',
      [tenantId],
    )
    const members = await query<MemberRow>(
      `select id, email, name, is_tenant_admin, created_at
         from app.users
        where tenant_id = $1
        order by created_at, id`,
      [tenantId],
    )
    return {
      maxUsers: limitRows[0]?.max_users ?? null,
      members: members.map(toMember),
    }
  })
}

/**
 * Cria um login na conta, respeitando o limite de assentos. Retorna:
 *   • o membro criado, ou
 *   • 'limit' se a conta já atingiu o `max_users`.
 * (E-mail já existente estoura unique_violation, tratado na rota como 409.)
 * Insere só se o limite permitir — a checagem e o INSERT numa única instrução
 * evitam corrida entre duas criações simultâneas.
 */
export async function createTeamMember(
  tenantId: string,
  input: TeamMemberCreate,
): Promise<TeamMember | 'limit'> {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST)
  return withTenant(tenantId, async (query) => {
    const rows = await query<MemberRow>(
      `insert into app.users (tenant_id, email, name, password_hash)
       select $1, $2, $3, $4
        where (select max_users from app.tenants where id = $1) is null
           or (select count(*) from app.users where tenant_id = $1)
              < (select max_users from app.tenants where id = $1)
       returning id, email, name, is_tenant_admin, created_at`,
      [tenantId, input.email, input.name, passwordHash],
    )
    return rows[0] ? toMember(rows[0]) : 'limit'
  })
}

/**
 * Remove um login da conta. `requesterId` não pode excluir a si mesmo (evita o
 * dono se trancar para fora). false se não existir ou for o próprio usuário.
 */
export async function deleteTeamMember(
  tenantId: string,
  requesterId: string,
  targetId: string,
): Promise<boolean> {
  return withTenant(tenantId, async (query) => {
    const rows = await query<{ id: string }>(
      'delete from app.users where tenant_id = $1 and id = $2 and id <> $3 returning id',
      [tenantId, targetId, requesterId],
    )
    return rows.length > 0
  })
}
