import express from 'express'
import cors from 'cors'
import { env } from './config/env.js'
import { authRouter } from './routes/auth.js'
import { dataRouter } from './routes/data/index.js'
import { adminRouter } from './routes/admin/index.js'
import { errorHandler, notFoundHandler } from './middleware/error.js'

const app = express()

// Atrás de um proxy reverso, faz o Express derivar o IP do cliente do
// X-Forwarded-For — essencial para o rate-limit do login não colocar todo mundo
// no mesmo balde. Vazio (padrão) = conexão direta, sem confiar no header.
if (env.trustProxy) {
  const n = Number(env.trustProxy)
  app.set('trust proxy', Number.isNaN(n) ? env.trustProxy : n)
}

app.use(
  cors({
    origin: (origin, cb) => {
      // Permite ferramentas sem Origin (curl, health checks) e as origens da allowlist.
      if (!origin || env.corsOrigins.includes(origin)) return cb(null, true)
      cb(new Error(`Origem não permitida pelo CORS: ${origin}`))
    },
    credentials: true,
  }),
)
// Corpo grande (~2MB) é permitido SÓ em /api/admin, onde a logo da conta viaja
// como data URI (base64). O parser fica montado no caminho: uma requisição de
// admin é parseada aqui e o parser geral abaixo a ignora (body-parser marca
// req._body e não reparseia).
app.use('/api/admin', express.json({ limit: '2mb' }))
// Demais rotas — login (não autenticado), config e CRUD de dados — têm corpos
// pequenos; um teto enxuto reduz a superfície de DoS por payload gigante.
app.use(express.json({ limit: '256kb' }))

// Health check simples.
app.get('/health', (_req, res) => res.json({ status: 'ok' }))

// API.
app.use('/api/auth', authRouter)
app.use('/api/admin', adminRouter)
app.use('/api', dataRouter)

// 404 + tratamento de erro (sempre por último).
app.use(notFoundHandler)
app.use(errorHandler)

app.listen(env.port, () => {
  console.log(`API whitelabel ouvindo em http://localhost:${env.port}`)
  console.log(`CORS liberado para: ${env.corsOrigins.join(', ')}`)
})
