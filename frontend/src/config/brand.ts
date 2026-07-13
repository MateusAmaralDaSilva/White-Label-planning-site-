/**
 * Central branding config. Swapping these values (and the color tokens in
 * tailwind.config.js) is all it takes to re-skin the whole app for a tenant.
 */
export const brand = {
  name: 'Whitelabel',
  mark: 'WL',
  tagline: 'Uma plataforma. Infinitas possibilidades.',
  // Logo por tenant vem de GET /api/config após o login; na tela pré-login (esta
  // marca padrão) usamos a sigla.
  logo: null,
} as const
