import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'
import { moduleRegistry } from '@/modules/registry'
import { api } from '@/lib/api'
import type { AppModule } from '@/types/module'
import type { ModuleConfig as ServerModuleConfig } from '@contracts'

/** Config de módulo vinda do backend (GET /api/config) — alias do contrato ModuleConfig. */
export type { ServerModuleConfig }

/**
 * Persiste a config de módulos no backend (PUT /api/config). Fire-and-forget:
 * a UI já refletiu a mudança de forma otimista; uma falha de rede não desfaz a
 * ação local (na próxima carga o servidor reconcilia). Chamado só em ações do
 * usuário (toggle/reorder), nunca no bootstrap.
 */
function persistModules(modules: AppModule[]): void {
  const payload = [...modules]
    .sort(byOrder)
    .map(({ id, enabled, order }) => ({ id, enabled, order }))
  api.put('/api/config', { modules: payload }).catch((e) => {
    console.error('Falha ao salvar a config de módulos', e)
  })
}

interface AppState {
  modules: AppModule[]
  sidebarCollapsed: boolean
  moduleManagerOpen: boolean

  /** Aplica a config de módulos do tenant (vinda da API) sobre o registry. */
  applyServerConfig: (configs: ServerModuleConfig[]) => void
  toggleModule: (id: string) => void
  reorderModules: (orderedIds: string[]) => void
  toggleSidebar: () => void
  openModuleManager: () => void
  closeModuleManager: () => void
}

/** Critério de ordenação dos módulos — fonte única usada pelos seletores. */
const byOrder = (a: AppModule, b: AppModule) => a.order - b.order

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      modules: moduleRegistry,
      sidebarCollapsed: false,
      moduleManagerOpen: false,

      // O backend é a fonte de verdade da disponibilidade/ordem dos módulos por
      // tenant. Fazemos merge sobre o registry (que tem os componentes/ícones):
      // cada módulo recebe enabled/order do servidor; módulos `required` seguem
      // sempre ligados; módulos novos no código, ainda sem config no servidor,
      // mantêm o default do registry.
      applyServerConfig: (configs) =>
        set(() => ({
          modules: moduleRegistry.map((mod) => {
            const cfg = configs.find((c) => c.id === mod.id)
            if (!cfg) return mod
            return {
              ...mod,
              enabled: mod.required ? true : cfg.enabled,
              order: cfg.order,
            }
          }),
        })),

      toggleModule: (id) => {
        set((state) => ({
          modules: state.modules.map((m) =>
            m.id === id && !m.required ? { ...m, enabled: !m.enabled } : m,
          ),
        }))
        persistModules(get().modules)
      },

      reorderModules: (orderedIds) => {
        set((state) => ({
          modules: orderedIds
            .map((id, index) => {
              const mod = state.modules.find((m) => m.id === id)
              return mod ? { ...mod, order: index } : null
            })
            .filter((m): m is AppModule => m !== null),
        }))
        persistModules(get().modules)
      },

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      openModuleManager: () => set({ moduleManagerOpen: true }),
      closeModuleManager: () => set({ moduleManagerOpen: false }),
    }),
    {
      // A config de módulos  vem do backend por tenant; só a preferência de
      // UI (sidebar recolhida) é persistida localmente. Alterações de módulos
      // feitas na sessão valem até o próximo carregamento, quando a config do
      // tenant é reaplicada.
      name: 'whitelabel-ui-v3',
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
    },
  ),
)

/** Todos os módulos ordenados por `order` (usado pelo gerenciador). */
export const useOrderedModules = () =>
  useAppStore(useShallow((s) => [...s.modules].sort(byOrder)))

/** Módulos habilitados, ordenados (sidebar, roteamento, Home). */
export const useEnabledModules = () =>
  useAppStore(useShallow((s) => s.modules.filter((m) => m.enabled).sort(byOrder)))
