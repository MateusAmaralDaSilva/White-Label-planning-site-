/**
 * Central branding config. Swapping these values (and the color tokens in
 * tailwind.config.js) is all it takes to re-skin the whole app for a tenant.
 */
export const brand = {
  name: 'Wout',
  mark: 'Wout',
  // Logo por tenant vem de GET /api/config após o login; na tela pré-login (esta
  // marca padrão) usamos a sigla.
  logo: null,
  phone: null,
  cnpj: null,
} as const
