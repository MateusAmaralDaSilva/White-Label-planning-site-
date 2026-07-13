import type { PoolClient } from 'pg'
import { pool } from './pool.js'

/**
 * Ponte entre o JWT e o RLS do banco.
 *
 * `withTenant` abre UMA transação, declara o tenant do contexto com
 * `set_config('app.current_tenant', $1, true)` — o `true` faz o SET valer só
 * até o fim da transação (SET LOCAL) — e então executa as queries do domínio.
 * A partir daí, as políticas de RLS (0002_security.sql) filtram cada tabela por
 * esse tenant. Consequências de segurança:
 *
 *   • O tenant vem SEMPRE de `req.auth.tenantId` (JWT assinado), nunca de um
 *     campo do corpo/querystring — o cliente não escolhe de qual tenant lê.
 *   • Mesmo uma query que esqueça o `WHERE tenant_id` não vaza outro tenant:
 *     o banco recusa as linhas fora do contexto.
 *   • O tenant é passado como PARÂMETRO ($1), nunca interpolado em texto SQL —
 *     sem espaço para injeção via o próprio identificador do tenant.
 */

/** Uma função de query já parametrizada — a ÚNICA forma de tocar o banco aqui. */
export interface TenantQuery {
  <T = Record<string, unknown>>(text: string, params?: readonly unknown[]): Promise<T[]>
}

export async function withTenant<R>(
  tenantId: string,
  fn: (query: TenantQuery) => Promise<R>,
): Promise<R> {
  const client: PoolClient = await pool.connect()
  try {
    await client.query('begin')
    // Parametrizado: o tenantId nunca é concatenado no SQL.
    await client.query("select set_config('app.current_tenant', $1, true)", [tenantId])

    const query: TenantQuery = async (text, params) => {
      const result = await client.query(text, params ? Array.from(params) : undefined)
      return result.rows
    }

    const out = await fn(query)
    await client.query('commit')
    return out
  } catch (err) {
    await client.query('rollback')
    throw err
  } finally {
    client.release()
  }
}

/**
 * Transação SEM contexto de tenant, para operações do administrador de plataforma
 * que atravessam tenants (as funções `SECURITY DEFINER` `admin_*` rodam como o
 * dono e ignoram o RLS). Ao contrário de `withTenant`, não faz `set_config` — o
 * ganho é a ATOMICIDADE: várias chamadas numa só transação valem todas ou
 * nenhuma (ex.: criar a conta e registrar a cobrança no ledger, juntas).
 */
export async function withTransaction<R>(fn: (query: TenantQuery) => Promise<R>): Promise<R> {
  const client: PoolClient = await pool.connect()
  try {
    await client.query('begin')
    const query: TenantQuery = async (text, params) => {
      const result = await client.query(text, params ? Array.from(params) : undefined)
      return result.rows
    }
    const out = await fn(query)
    await client.query('commit')
    return out
  } catch (err) {
    await client.query('rollback')
    throw err
  } finally {
    client.release()
  }
}
