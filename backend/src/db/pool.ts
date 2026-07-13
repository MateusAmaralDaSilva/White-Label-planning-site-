import pg from 'pg'
import { env } from '../config/env.js'

/**
 * Pool de conexões PostgreSQL. A API conecta como a role `whitelabel_app`
 * (menor privilégio, sujeita ao RLS) — NUNCA como o dono do banco. Ver
 * db/migrations/0002_security.sql.
 *
 * O pool é único no processo e reaproveitado por todas as requisições.
 */
export const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  // Limita conexões simultâneas — um teto a mais contra exaustão de recursos.
  // Ajustável por ambiente (DB_POOL_MAX) para controlar N instâncias × max,
  // sobretudo atrás de um pooler (PgBouncer em modo transaction).
  max: env.dbPoolMax,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
})

// Um erro em um cliente ocioso não deve derrubar o processo silenciosamente.
pool.on('error', (err) => {
  console.error('[db] erro em cliente ocioso do pool', err)
})
