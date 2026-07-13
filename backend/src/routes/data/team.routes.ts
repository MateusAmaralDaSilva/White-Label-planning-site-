import { Router } from 'express'
import { asyncHandler } from '../../lib/async-handler.js'
import { requireTenantAdmin } from '../../middleware/auth.js'
import { badRequest, notFound, forbidden, conflict } from '../../lib/http.js'
import {
  getTeam,
  createTeamMember,
  deleteTeamMember,
  teamMemberCreateSchema,
} from '../../db/repositories/team.repo.js'
import { tenant, uid } from './helpers.js'

/**
 * Equipe: gestão de logins da conta pelo admin do tenant (dono). TODAS as rotas
 * exigem que o usuário seja admin do próprio tenant — daí o requireTenantAdmin
 * aplicado no router inteiro.
 */
export const teamRouter = Router()
teamRouter.use(requireTenantAdmin)

teamRouter.get('/team', asyncHandler(async (req, res) => res.json(await getTeam(tenant(req)))))
teamRouter.post(
  '/team/users',
  asyncHandler(async (req, res) => {
    const input = teamMemberCreateSchema.parse(req.body)
    try {
      const result = await createTeamMember(tenant(req), input)
      if (result === 'limit') {
        throw forbidden('Limite de usuários da conta atingido. Fale com o suporte para ampliar.')
      }
      res.status(201).json(result)
    } catch (err) {
      if ((err as { code?: string }).code === '23505') {
        throw conflict('Já existe um usuário com esse e-mail')
      }
      throw err
    }
  }),
)
teamRouter.delete(
  '/team/users/:id',
  asyncHandler(async (req, res) => {
    if (req.params.id === uid(req)) throw badRequest('Você não pode excluir o próprio login')
    if (!(await deleteTeamMember(tenant(req), uid(req), req.params.id)))
      throw notFound('Usuário não encontrado')
    res.status(204).end()
  }),
)
