import { z } from 'zod'

const tenantIdSchema = z.string().trim().min(2, 'id do tenant muito curto').max(40)
  .regex(/^[a-z0-9-]+$/, 'use apenas letras minúsculas, números e hífen')
const planSchema = z.enum(['mensal', 'semestral', 'anual'])
const industrySchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
  z.string().trim().min(1).max(60).nullable().optional(),
)
const phoneSchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
  z.string().trim().min(3).max(30).nullable().optional(),
)
const cnpjSchema = z.preprocess(
  (value) => {
    if (typeof value !== 'string') return value
    const digits = value.replace(/\D/g, '')
    return digits === '' ? null : digits
  },
  z.string().regex(/^\d{14}$/, 'CNPJ deve ter 14 digitos').nullable().optional(),
)
const logoSchema = z.string()
  .max(700_000, 'logo muito grande (use uma imagem de até ~500KB)')
  .regex(/^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=\s]+$/, 'a logo deve ser uma imagem')
  .nullable().optional()

const brandFields = {
  brandName: z.string().trim().min(1).max(80),
  brandMark: z.string().trim().min(1).max(4),
  themeId: z.string().trim().min(1).max(40).default('light'),
  logo: logoSchema,
  maxUsers: z.number().int().positive().max(100000).nullable().optional(),
  industry: industrySchema,
  phone: phoneSchema,
  cnpj: cnpjSchema,
}

export const createAccountSchema = z.object({
  tenantId: tenantIdSchema, ...brandFields,
  userEmail: z.string().trim().email('e-mail inválido').max(120),
  userName: z.string().trim().min(1).max(80),
  password: z.string().min(8, 'a senha deve ter ao menos 8 caracteres').max(200),
  plan: planSchema, amount: z.number().nonnegative().optional(),
})
export const updateAccountSchema = z.object({ ...brandFields })
export const addUserSchema = z.object({
  userEmail: z.string().trim().email('e-mail inválido').max(120),
  userName: z.string().trim().min(1).max(80),
  password: z.string().min(8, 'a senha deve ter ao menos 8 caracteres').max(200),
})
export const creditSchema = z.object({
  months: z.number().int().positive().max(120),
  plan: planSchema.optional(), amount: z.number().nonnegative().optional(),
})

export type CreateAccountInput = z.infer<typeof createAccountSchema>
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>
export type AddUserInput = z.infer<typeof addUserSchema>
export type CreditInput = z.infer<typeof creditSchema>
