import { create } from 'zustand'
import { brand as defaultBrand } from '@/config/brand'
import type { Brand } from '@contracts'

/**
 * Marca do tenant. Começa com o default estático (usado na tela de login, que é
 * pré-autenticação) e é sobrescrita após o login pelos dados de GET /api/config
 * (ver hooks/useBootstrap). Componentes leem daqui em vez do const estático.
 */
export type { Brand }

interface BrandState {
  brand: Brand
  setBrand: (brand: Brand) => void
}

export const useBrandStore = create<BrandState>((set) => ({
  brand: { ...defaultBrand },
  setBrand: (brand) => set({ brand }),
}))
