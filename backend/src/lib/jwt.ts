import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { env } from '../config/env.js'
import type { JwtPayload, User } from '../types/index.js'

/** Forma esperada do payload — valida o que foi decodificado do token. */
const jwtPayloadSchema = z.object({
  sub: z.string().min(1),
  email: z.string().email(),
  tenantId: z.string().min(1),
  // Opcional + default false: tokens antigos (sem o campo) seguem válidos como
  // usuário comum, nunca como admin. O flag só é confiável porque é ASSINADO
  // pelo servidor a partir do banco — o cliente não consegue forjá-lo.
  isPlatformAdmin: z.boolean().optional().default(false),
  isTenantAdmin: z.boolean().optional().default(false),
})

/** Assina um JWT a partir de um usuário. */
export function signToken(user: User): string {
  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    tenantId: user.tenantId,
    isPlatformAdmin: user.isPlatformAdmin,
    isTenantAdmin: user.isTenantAdmin,
  }
  const options: jwt.SignOptions = {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  }
  return jwt.sign(payload, env.jwtSecret, options)
}

/**
 * Verifica e decodifica um JWT. Lança se inválido/expirado (jwt.verify) ou se o
 * payload não tiver o shape esperado (zod) — em vez de um `as` cego que deixaria
 * passar um `tenantId` ausente e quebrar o isolamento por tenant lá na frente.
 */
export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.jwtSecret)
  return jwtPayloadSchema.parse(decoded)
}