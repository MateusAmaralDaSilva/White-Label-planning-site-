import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  applyTheme,
  defaultTheme,
  getTheme,
  THEME_STORAGE_KEY,
} from '@/config/themes'

interface ThemeState {
  themeId: string
  /** true quando o usuário escolheu um tema manualmente (vence o do tenant). */
  pinned: boolean
  /** Troca manual pelo ThemeSwitcher — passa a valer sobre o tema do tenant. */
  setTheme: (id: string) => void
  /** Tema padrão do tenant (GET /api/config); só aplica se o usuário não fixou. */
  applyTenantTheme: (id: string) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      themeId: defaultTheme.id,
      pinned: false,
      setTheme: (id) => {
        applyTheme(getTheme(id))
        set({ themeId: id, pinned: true })
      },
      applyTenantTheme: (id) => {
        if (get().pinned) return
        applyTheme(getTheme(id))
        set({ themeId: id })
      },
    }),
    {
      name: THEME_STORAGE_KEY,
      // Re-apply on load in case initTheme() ran before hydration finished.
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(getTheme(state.themeId))
      },
    },
  ),
)
