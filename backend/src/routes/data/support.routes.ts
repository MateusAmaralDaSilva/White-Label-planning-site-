import { Router } from 'express'
import { asyncHandler } from '../../lib/async-handler.js'
import { notFound } from '../../lib/http.js'
import {
  getTickets,
  createTicket,
  updateTicket,
  deleteTicket,
  ticketCreateSchema,
  ticketUpdateSchema,
} from '../../db/repositories/support.repo.js'
import { tenant } from './helpers.js'

/** Chamados de suporte do tenant. */
export const supportRouter = Router()

supportRouter.get(
  '/support/tickets',
  asyncHandler(async (req, res) => res.json(await getTickets(tenant(req)))),
)
supportRouter.post(
  '/support/tickets',
  asyncHandler(async (req, res) => {
    const input = ticketCreateSchema.parse(req.body)
    const ticket = await createTicket(tenant(req), input)
    res.status(201).json(ticket)
  }),
)
supportRouter.put(
  '/support/tickets/:id',
  asyncHandler(async (req, res) => {
    const input = ticketUpdateSchema.parse(req.body)
    const ticket = await updateTicket(tenant(req), req.params.id, input)
    if (!ticket) throw notFound('Chamado não encontrado')
    res.json(ticket)
  }),
)
supportRouter.delete(
  '/support/tickets/:id',
  asyncHandler(async (req, res) => {
    if (!(await deleteTicket(tenant(req), req.params.id))) throw notFound('Chamado não encontrado')
    res.status(204).end()
  }),
)
