import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api, ApiError } from '@/lib/api'

import type { User as AuthUser, AuthResponse as LoginResponse } from '@contracts'

interface AuthState {
  isAuthenticated: boolean
  token: string | null
  user: AuthUser | null
  /** Compat: e-mail do usuário (usado pelo UserMenu). */
  userEmail: string
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      token: null,
      user: null,
      userEmail: '',

      login: async (email, password) => {
        try {
          const { token, user } = await api.post<LoginResponse>(
            '/api/auth/login',
            { email, password },
            { auth: false },
          )
          set({ isAuthenticated: true, token, user, userEmail: user.email })
          return true
        } catch (e) {
          // 401 = credenciais realmente inválidas → retorno normal (false). Os
          // demais erros (API fora do ar = status 0, 5xx, etc.) SOBEM para a UI
          // poder distinguir "senha errada" de "backend inacessível" — antes tudo
          // virava "credenciais inválidas" e escondia a API fora do ar.
          if (e instanceof ApiError && e.status === 401) return false
          throw e
        }
      },

      logout: () => set({ isAuthenticated: false, token: null, user: null, userEmail: '' }),
    }),
    { name: 'whitelabel-auth' },
  ),
)
