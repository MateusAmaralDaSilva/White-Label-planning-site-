import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../lib/async-handler.js'
import {
  listAccounts,
  createAccount,
  updateAccount,
  listUsers,
  addUser,
  setTenantAdmin,
  creditMonths,
  createAccountSchema,
  updateAccountSchema,
  addUserSchema,
  creditSchema,
} from '../../db/repositories/admin.repo.js'
import { actor, guard } from './helpers.js'

/**
 * Gestão de contas (tenants) e seus logins: provisionar conta, editar marca,
 * listar/adicionar logins, promover a admin do tenant e creditar meses de
 * assinatura. Não há pagamento automático — o crédito é manual pela equipe.
 */
export const accountsRouter = Router()

// Lista todas as contas com status de assinatura.
accountsRouter.get(
  '/accounts',
  asyncHandler(async (req, res) => {
    res.json(await guard(() => listAccounts(actor(req))))
  }),
)

// Cria uma conta nova (tenant + primeiro login), creditando o plano escolhido.
accountsRouter.post(
  '/accounts',
  asyncHandler(async (req, res) => {
    const input = createAccountSchema.parse(req.body)
    const result = await guard(() => createAccount(actor(req), input))
    res.status(201).json(result)
  }),
)

// Atualiza a marca (nome/sigla/slogan/tema/logo) de uma conta.
accountsRouter.put(
  '/accounts/:tenantId',
  asyncHandler(async (req, res) => {
    const input = updateAccountSchema.parse(req.body)
    await guard(() => updateAccount(actor(req), req.params.tenantId, input))
    res.status(204).end()
  }),
)

// Lista os logins de uma conta.
accountsRouter.get(
  '/accounts/:tenantId/users',
  asyncHandler(async (req, res) => {
    res.json(await guard(() => listUsers(actor(req), req.params.tenantId)))
  }),
)

// Promove/rebaixa um login a administrador do tenant.
const setAdminSchema = z.object({ isTenantAdmin: z.boolean() })
accountsRouter.put(
  '/accounts/:tenantId/users/:userId',
  asyncHandler(async (req, res) => {
    const { isTenantAdmin } = setAdminSchema.parse(req.body)
    await guard(() =>
      setTenantAdmin(actor(req), req.params.tenantId, req.params.userId, isTenantAdmin),
    )
    res.status(204).end()
  }),
)

// Adiciona um login a um tenant existente.
accountsRouter.post(
  '/accounts/:tenantId/users',
  asyncHandler(async (req, res) => {
    const input = addUserSchema.parse(req.body)
    const result = await guard(() => addUser(actor(req), req.params.tenantId, input))
    res.status(201).json(result)
  }),
)

// Credita N meses de assinatura a um tenant.
accountsRouter.post(
  '/accounts/:tenantId/credit',
  asyncHandler(async (req, res) => {
    const input = creditSchema.parse(req.body)
    const result = await guard(() => creditMonths(actor(req), req.params.tenantId, input))
    res.json(result)
  }),
)
