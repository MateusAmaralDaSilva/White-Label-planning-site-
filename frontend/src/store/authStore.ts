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
          // Credenciais inválidas ou API fora do ar → login falha.
          if (!(e instanceof ApiError)) console.error('Erro no login', e)
          return false
        }
      },

      logout: () => set({ isAuthenticated: false, token: null, user: null, userEmail: '' }),
    }),
    { name: 'whitelabel-auth' },
  ),
)
