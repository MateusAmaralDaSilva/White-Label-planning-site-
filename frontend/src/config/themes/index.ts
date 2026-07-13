/**
 * Sistema de temas — barril (API pública). O contrato de um tema mora em
 * `tokens.ts`, cada tema num arquivo próprio (`light.ts`, `dark.ts`, …) e o
 * motor (registro + aplicação) em `registry.ts`.
 */
export type { Theme, TokenKey, ThemeTokens } from './tokens'
export {
  themeRegistry,
  defaultTheme,
  getTheme,
  applyTheme,
  initTheme,
  THEME_STORAGE_KEY,
} from './registry'
