import { Router } from 'express'
import { asyncHandler } from '../../lib/async-handler.js'
import { notFound } from '../../lib/http.js'
import {
  getSales,
  createSale,
  deleteSale,
  saleCreateSchema,
} from '../../db/repositories/sales.repo.js'
import { tenant, intId } from './helpers.js'

/** Vendas registradas (alimentam os relatórios). */
export const salesRouter = Router()

salesRouter.get('/sales', asyncHandler(async (req, res) => res.json(await getSales(tenant(req)))))
salesRouter.post(
  '/sales',
  asyncHandler(async (req, res) => {
    const input = saleCreateSchema.parse(req.body)
    const sale = await createSale(tenant(req), input)
    if (!sale) throw notFound('Produto não encontrado')
    res.status(201).json(sale)
  }),
)
salesRouter.delete(
  '/sales/:id',
  asyncHandler(async (req, res) => {
    if (!(await deleteSale(tenant(req), intId(req.params.id))))
      throw notFound('Venda não encontrada')
    res.status(204).end()
  }),
)
