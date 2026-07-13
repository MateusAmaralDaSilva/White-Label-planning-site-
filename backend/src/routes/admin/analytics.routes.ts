import { Router } from 'express'
import { asyncHandler } from '../../lib/async-handler.js'
import { badRequest, notFound } from '../../lib/http.js'
import {
  getPlatformAnalytics,
  addPlatformExpense,
  deletePlatformExpense,
  platformExpenseSchema,
} from '../../db/repositories/platform-analytics.repo.js'
import { actor, guard } from './helpers.js'

/**
 * Financeiro da plataforma (o "Power BI" do dono): receita/lucro por mês,
 * inadimplência, top contas, distribuição de planos e custos da plataforma.
 * Tudo derivado do ledger de cobranças + platform_expenses.
 */
export const analyticsRouter = Router()

analyticsRouter.get(
  '/analytics',
  asyncHandler(async (req, res) => {
    res.json(await guard(() => getPlatformAnalytics(actor(req))))
  }),
)

// Custos mensais da plataforma (entram no cálculo de lucro).
analyticsRouter.post(
  '/platform-expenses',
  asyncHandler(async (req, res) => {
    const input = platformExpenseSchema.parse(req.body)
    const result = await guard(() => addPlatformExpense(actor(req), input))
    res.status(201).json(result)
  }),
)
analyticsRouter.delete(
  '/platform-expenses/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) throw badRequest('id inválido')
    if (!(await guard(() => deletePlatformExpense(actor(req), id))))
      throw notFound('Custo não encontrado')
    res.status(204).end()
  }),
)
