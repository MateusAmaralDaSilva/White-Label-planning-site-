import { Router } from 'express'
import { asyncHandler } from '../../lib/async-handler.js'
import { notFound } from '../../lib/http.js'
import {
  createExpense,
  deleteExpense,
  expenseCreateSchema,
} from '../../db/repositories/expenses.repo.js'
import { tenant, intId } from './helpers.js'

/** Gastos mensais. A LISTAGEM vem junto de GET /api/reports (não há GET aqui). */
export const expensesRouter = Router()

expensesRouter.post(
  '/expenses',
  asyncHandler(async (req, res) => {
    const input = expenseCreateSchema.parse(req.body)
    const expense = await createExpense(tenant(req), input)
    res.status(201).json(expense)
  }),
)
expensesRouter.delete(
  '/expenses/:id',
  asyncHandler(async (req, res) => {
    if (!(await deleteExpense(tenant(req), intId(req.params.id))))
      throw notFound('Gasto não encontrado')
    res.status(204).end()
  }),
)
