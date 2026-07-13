import type { LucideIcon } from 'lucide-react'

/**
 * Contrato de um tema: as chaves de token de cor + o formato de um tema.
 *
 * Os valores dos tokens são triplos de canais RGB ("R G B") para as utilidades
 * de opacidade do Tailwind (ex.: bg-success/12) continuarem funcionando via
 * `<alpha-value>`. Componentes leem tokens semânticos (bg-surface, text-ink…)
 * que resolvem para as variáveis CSS aplicadas por `applyTheme`.
 */
export const TOKEN_KEYS = [
  'bg',
  'sidebar',
  'surface',
  'surface-hover',
  'border',
  'accent',
  'accent-hover',
  'ink',
  'ink-muted',
  'ink-faint',
  'success',
  'danger',
  'warning',
  'info',
  'dots',
] as const

export type TokenKey = (typeof TOKEN_KEYS)[number]
export type ThemeTokens = Record<TokenKey, string>

export interface Theme {
  id: string
  name: string
  icon: LucideIcon
  tokens: ThemeTokens
}
