import { Router } from 'express'
import { asyncHandler } from '../../lib/async-handler.js'
import { notFound } from '../../lib/http.js'
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  customerCreateSchema,
} from '../../db/repositories/customers.repo.js'
import { tenant, intId } from './helpers.js'

/** Clientes do tenant. */
export const customersRouter = Router()

customersRouter.get(
  '/customers',
  asyncHandler(async (req, res) => res.json(await getCustomers(tenant(req)))),
)
customersRouter.post(
  '/customers',
  asyncHandler(async (req, res) => {
    const input = customerCreateSchema.parse(req.body)
    const customer = await createCustomer(tenant(req), input)
    res.status(201).json(customer)
  }),
)
customersRouter.put(
  '/customers/:id',
  asyncHandler(async (req, res) => {
    const input = customerCreateSchema.parse(req.body)
    const customer = await updateCustomer(tenant(req), intId(req.params.id), input)
    if (!customer) throw notFound('Cliente não encontrado')
    res.json(customer)
  }),
)
customersRouter.delete(
  '/customers/:id',
  asyncHandler(async (req, res) => {
    if (!(await deleteCustomer(tenant(req), intId(req.params.id))))
      throw notFound('Cliente não encontrado')
    res.status(204).end()
  }),
)
