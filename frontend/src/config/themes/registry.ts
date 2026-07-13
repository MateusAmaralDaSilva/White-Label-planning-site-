import { TOKEN_KEYS, type Theme } from './tokens'
import { light } from './light'
import { dark } from './dark'

/**
 * Registro de temas — a fonte única. Cada tema é um arquivo em `./<id>.ts`;
 * adicionar um tema novo = criar o arquivo e incluí-lo neste array. Nada mais
 * muda: o ThemeSwitcher e o /admin listam a partir daqui.
 */
export const themeRegistry: Theme[] = [light, dark]

export const defaultTheme = themeRegistry[0]

const STORAGE_KEY = 'whitelabel-theme'

/** Resolve um tema por id, caindo no default quando não encontra. */
export function getTheme(id: string | undefined): Theme {
  return themeRegistry.find((t) => t.id === id) ?? defaultTheme
}

/** Escreve os tokens de um tema como variáveis CSS no elemento <html>. */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement
  for (const key of TOKEN_KEYS) {
    root.style.setProperty(`--color-${key}`, theme.tokens[key])
  }
  root.dataset.theme = theme.id
}

/**
 * Aplica o tema persistido de forma síncrona no boot (antes do React renderizar),
 * para não haver flash do tema errado. Lê a mesma chave do localStorage que o
 * themeStore persiste.
 */
export function initTheme(): void {
  let id: string | undefined
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    id = raw ? JSON.parse(raw)?.state?.themeId : undefined
  } catch {
    id = undefined
  }
  applyTheme(getTheme(id))
}

export { STORAGE_KEY as THEME_STORAGE_KEY }
