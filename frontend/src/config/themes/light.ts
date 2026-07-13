import { Sun } from 'lucide-react'
import type { Theme } from './tokens'

/** Tema claro (default do app). */
export const light: Theme = {
  id: 'light',
  name: 'Claro',
  icon: Sun,
  tokens: {
    bg: '245 247 251',
    sidebar: '255 255 255',
    surface: '255 255 255',
    'surface-hover': '241 244 250',
    border: '226 231 240',
    accent: '79 120 255',
    'accent-hover': '61 99 224',
    ink: '26 37 64',
    'ink-muted': '90 107 140',
    'ink-faint': '150 163 189',
    success: '16 185 129',
    danger: '239 68 68',
    warning: '217 119 6',
    info: '124 58 237',
    dots: '79 120 255',
  },
}
