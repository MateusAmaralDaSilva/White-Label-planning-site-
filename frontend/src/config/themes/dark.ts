import { Moon } from 'lucide-react'
import type { Theme } from './tokens'

/** Tema escuro. */
export const dark: Theme = {
  id: 'dark',
  name: 'Escuro',
  icon: Moon,
  tokens: {
    bg: '12 17 32',
    sidebar: '15 23 41',
    surface: '26 37 64',
    'surface-hover': '31 45 77',
    border: '36 48 88',
    accent: '79 120 255',
    'accent-hover': '107 140 255',
    ink: '224 232 255',
    'ink-muted': '127 149 190',
    'ink-faint': '74 90 122',
    success: '52 211 153',
    danger: '248 113 113',
    warning: '251 191 36',
    info: '167 139 250',
    dots: '79 120 255',
  },
}
