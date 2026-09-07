import bcrypt from 'bcryptjs'
import { pool } from '../../pool.js'
import type { AdminUser } from '../../../types/index.js'
import type { AddUserInput } from './schemas.js'

const BCRYPT_COST = 12

export async function listUsers(actorId: string, tenantId: string): Promise<AdminUser[]> {
  const { rows } = await pool.query<{
    id: string; email: string; name: string; is_tenant_admin: boolean; created_at: Date
  }>('select * from app.admin_list_users($1, $2)', [actorId, tenantId])
  return rows.map((row) => ({
    id: row.id, email: row.email, name: row.name,
    isTenantAdmin: row.is_tenant_admin, createdAt: row.created_at.toISOString(),
  }))
}

export async function setTenantAdmin(
  actorId: string, tenantId: string, userId: string, isAdmin: boolean,
): Promise<void> {
  await pool.query('select app.admin_set_tenant_admin($1, $2, $3, $4)', [
    actorId, tenantId, userId, isAdmin,
  ])
}

export async function addUser(
  actorId: string, tenantId: string, input: AddUserInput,
): Promise<{ userId: string }> {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST)
  const { rows } = await pool.query<{ admin_add_user: string }>(
    'select app.admin_add_user($1, $2, $3, $4, $5) as admin_add_user',
    [actorId, tenantId, input.userEmail, input.userName, passwordHash],
  )
  return { userId: rows[0].admin_add_user }
}
