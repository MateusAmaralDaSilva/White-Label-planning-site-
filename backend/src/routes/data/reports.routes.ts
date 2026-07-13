import { Router } from 'express'
import { asyncHandler } from '../../lib/async-handler.js'
import { getReports } from '../../db/repositories/reports.repo.js'
import { tenant } from './helpers.js'

/**
 * Relatórios calculados a partir de vendas + gastos. Sempre 200 (estrutura
 * vazia quando não há dados), para a aba renderizar e permitir cadastrar.
 * `from`/`to` (ambos 'YYYY-MM', opcionais) filtram o período dos agregados.
 */
export const reportsRouter = Router()

reportsRouter.get(
  '/reports',
  asyncHandler(async (req, res) => {
    const ym = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}$/.test(v) ? v : undefined)
    res.json(await getReports(tenant(req), ym(req.query.from), ym(req.query.to)))
  }),
)
