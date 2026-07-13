import 'dotenv/config'

/** Configuração do processo, lida do ambiente uma única vez. */
export const env = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-inseguro-troque-em-producao',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:4173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  // String de conexão da role da APLICAÇÃO (whitelabel_app) — nunca a do dono do
  // banco. Ex.: postgres://whitelabel_app:senha@localhost:5432/whitelabel
  databaseUrl: process.env.DATABASE_URL ?? '',
  // Confiança em proxy reverso, para o rate-limit ler o IP real do cliente
  // (X-Forwarded-For). Vazio = conexão direta (padrão seguro: sem spoofing).
  // Ex.: '1' (confia no 1º proxy), 'true', ou uma lista de sub-redes.
  trustProxy: (process.env.TRUST_PROXY ?? '').trim(),
  // Máximo de conexões do pool POR INSTÂNCIA. Ajustável para controlar a carga no
  // Postgres ao rodar N instâncias (N × max) — sobretudo atrás de um pooler
  // (PgBouncer). Padrão conservador de 10.
  dbPoolMax: Math.max(1, Number(process.env.DB_POOL_MAX ?? 10)),
}

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  // Rodar em produção com o segredo padrão significa que QUALQUER um pode forjar
  // um token (inclusive de admin). Isso é uma falha crítica: falha rápido, igual
  // ao DATABASE_URL, em vez de subir a API silenciosamente insegura.
  console.error('[env] ERRO: JWT_SECRET não definido em produção. Defina-o no ambiente.')
  process.exit(1)
}

if (!env.databaseUrl) {
  // A API agora depende do PostgreSQL — sem DATABASE_URL não há o que servir.
  // Falha rápida com mensagem clara, em vez de um erro obscuro na primeira query.
  console.error(
    '[env] ERRO: DATABASE_URL não definido. Configure a conexão do banco (ver db/README.md).',
  )
  process.exit(1)
}
