import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../lib/async-handler.js'
import { rateLimit } from '../lib/rate-limit.js'
import { signToken } from '../lib/jwt.js'
import { unauthorized } from '../lib/http.js'
import { requireAuth } from '../middleware/auth.js'
import { verifyCredentials, findUserById } from '../db/repositories/users.repo.js'
import type { AuthResponse, User } from '../types/index.js'

export const authRouter = Router()

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
})

/**
 * Freio de brute force por IP: no máx. 10 tentativas a cada 15 min. Complementa o
 * bcrypt (custo 12) e a verificação de tempo constante — ambos agora no banco
 * (`app.verify_credentials`): o bcrypt encarece cada palpite, o rate-limit corta o
 * volume. Conta toda tentativa (não só as que falham); um usuário legítimo erra
 * pouco e cabe com folga.
 */
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Muitas tentativas de login. Tente novamente em alguns minutos.',
})

/** Remove o hash antes de devolver o usuário ao cliente. */
function toPublicUser(u: {
  id: string
  email: string
  name: string
  tenantId: string
  isPlatformAdmin: boolean
  isTenantAdmin: boolean
}): User {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    tenantId: u.tenantId,
    isPlatformAdmin: u.isPlatformAdmin,
    isTenantAdmin: u.isTenantAdmin,
  }
}

/**
 * POST /api/auth/login
 * Ponto de integração de `store/authStore.ts` (§8.3.C): o login vira um POST
 * que retorna { token, user }. O frontend guarda o token e o envia como Bearer.
 */
authRouter.post(
  '/login',
  loginRateLimit,
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body)

    // A senha é conferida DENTRO do banco (o hash nunca sai). undefined = e-mail
    // inexistente OU senha errada — a função não distingue os dois e é timing-safe.
    const user = await verifyCredentials(email, password)
    if (!user) throw unauthorized('E-mail ou senha incorretos')

    const token = signToken(toPublicUser(user))
    const body: AuthResponse = { token, user: toPublicUser(user) }
    res.json(body)
  }),
)

/**
 * GET /api/auth/me
 * Revalida o token e devolve o usuário — útil para reidratar a sessão no reload.
 */
authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const stored = await findUserById(req.auth!.tenantId, req.auth!.sub)
    if (!stored) throw unauthorized('Usuário não encontrado')
    res.json({ user: toPublicUser(stored) })
  }),
)