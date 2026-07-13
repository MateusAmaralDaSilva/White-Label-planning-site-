import { useEffect } from 'react'
import { useApi } from '@/hooks/useApi'
import { useBrandStore } from '@/store/brandStore'
import { useThemeStore } from '@/store/themeStore'
import { useAppStore } from '@/store/appStore'
import type { BillingStatus, TenantConfig } from '@contracts'

// Re-export para os consumidores existentes (Paywall, MainLayout) que importam
// BillingStatus deste hook.
export type { BillingStatus }

/**
 * Bootstrap do tenant após o login: busca GET /api/config e aplica marca, tema
 * e módulos. Concentra num só lugar a estratégia 8.3.C da ARCHITECTURE. Retorna
 * o estado do fetch para o MainLayout segurar a renderização até carregar.
 */
export function useBootstrap() {
  const state = useApi<TenantConfig>('/api/config')
  const setBrand = useBrandStore((s) => s.setBrand)
  const applyTenantTheme = useThemeStore((s) => s.applyTenantTheme)
  const applyServerConfig = useAppStore((s) => s.applyServerConfig)

  const config = state.data
  useEffect(() => {
    if (!config) return
    setBrand(config.brand)
    applyTenantTheme(config.themeId)
    applyServerConfig(config.modules)
  }, [config, setBrand, applyTenantTheme, applyServerConfig])

  return state
}
