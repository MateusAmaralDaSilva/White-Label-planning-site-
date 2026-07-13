import { Router } from 'express'
import { asyncHandler } from '../../lib/async-handler.js'
import { requireAuth, loadCurrentUser } from '../../middleware/auth.js'
import { requireActiveSubscription } from '../../middleware/subscription.js'
import { notFound } from '../../lib/http.js'
import {
  getTenantConfig,
  updateTenantConfig,
  configPatchSchema,
} from '../../db/repositories/tenants.repo.js'
import { tenant } from './helpers.js'
import { feedsRouter } from './feeds.routes.js'
import { productsRouter } from './products.routes.js'
import { customersRouter } from './customers.routes.js'
import { calendarRouter } from './calendar.routes.js'
import { supportRouter } from './support.routes.js'
import { reportsRouter } from './reports.routes.js'
import { salesRouter } from './sales.routes.js'
import { expensesRouter } from './expenses.routes.js'
import { dashboardRouter } from './dashboard.routes.js'
import { teamRouter } from './team.routes.js'

/**
 * Rotas de dados por tenant — raiz de composição. Todas exigem autenticação; o
 * `tenantId` vem do JWT (req.auth), então o cliente nunca escolhe de qual tenant
 * lê — o token decide. Cada repositório abre uma transação, seta o contexto de
 * tenant e o RLS do banco isola os dados (ver db/tenant-context.ts).
 *
 * A ORDEM abaixo é significativa: os middlewares aplicados aqui valem para os
 * sub-routers montados depois. `GET /config` fica de propósito ANTES do bloqueio
 * de assinatura (o front precisa ler `billing` mesmo com a conta expirada).
 */
export const dataRouter = Router()

// requireAuth valida o token; loadCurrentUser revalida o usuário no banco a cada
// requisição (existência + papel atual + assinatura) — dá revogação imediata.
dataRouter.use(requireAuth, loadCurrentUser)

// Bootstrap do tenant: marca + tema + módulos + assinatura. ANTES do gate de
// propósito — o front renderiza a tela de renovação a partir do `billing`.
dataRouter.get(
  '/config',
  asyncHandler(async (req, res) => {
    const config = await getTenantConfig(tenant(req))
    if (!config) throw notFound('Tenant não encontrado')
    res.json(config)
  }),
)

// A partir daqui, todo acesso a dados exige assinatura ativa (402 se expirada).
// O administrador de plataforma é isento (ver middleware).
dataRouter.use(requireActiveSubscription)

// Persistência da config do usuário: tema e/ou módulos (enabled/order). Já sob
// o gate. O schema de validação mora na camada de dados (tenants.repo.ts).
dataRouter.put(
  '/config',
  asyncHandler(async (req, res) => {
    const patch = configPatchSchema.parse(req.body)
    const updated = await updateTenantConfig(tenant(req), patch)
    if (!updated) throw notFound('Tenant não encontrado')
    res.json(updated)
  }),
)

// Telas de negócio, um sub-router por domínio (ver ./*.routes.ts). Cada um
// declara os próprios caminhos completos (ex.: '/products', '/calendar/events').
dataRouter.use(feedsRouter)
dataRouter.use(productsRouter)
dataRouter.use(customersRouter)
dataRouter.use(calendarRouter)
dataRouter.use(supportRouter)
dataRouter.use(reportsRouter)
dataRouter.use(salesRouter)
dataRouter.use(expensesRouter)
dataRouter.use(dashboardRouter)
dataRouter.use(teamRouter)
