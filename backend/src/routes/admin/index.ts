import { Router } from 'express'
import { requireAuth, requireAdmin, loadCurrentUser } from '../../middleware/auth.js'
import { accountsRouter } from './accounts.routes.js'
import { analyticsRouter } from './analytics.routes.js'

/**
 * Rotas do administrador de plataforma — raiz de composição. Provisionar contas
 * (não há pagamento automático), adicionar logins, creditar meses e ver o
 * financeiro da plataforma. Duplo gate:
 *   1. `requireAdmin` (flag do JWT assinado pelo servidor);
 *   2. as funções `app.admin_*` revalidam o papel do ator no banco.
 */
export const adminRouter = Router()

// loadCurrentUser relê o papel do ator no banco antes do requireAdmin — um admin
// de plataforma rebaixado/excluído perde o acesso já no próximo request (além da
// revalidação que as funções admin_* já fazem no banco).
adminRouter.use(requireAuth, loadCurrentUser, requireAdmin)

adminRouter.use(accountsRouter)
adminRouter.use(analyticsRouter)
