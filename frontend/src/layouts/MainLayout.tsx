import { lazy, Suspense } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import ThemeSwitcher from '@/components/ThemeSwitcher'
import NotificationsMenu from '@/components/NotificationsMenu'
import UserMenu from '@/components/UserMenu'
import Paywall from '@/components/Paywall'
import { Async } from '@/components/ui'
import { useBootstrap, type BillingStatus } from '@/hooks/useBootstrap'
import { useAuthStore } from '@/store/authStore'
import { useAppStore } from '@/store/appStore'
import { CONTACT_EMAIL } from '@/config/plans'

// Carregado sob demanda: o painel (e o @dnd-kit que ele traz) só é baixado quando
// o usuário abre "Configurar módulos" — fica fora do bundle inicial.
const ModuleManager = lazy(() => import('@/components/ModuleManager'))

/** Faltando este nº de dias (ou menos), exibe o banner de aviso no topo. */
const WARN_WITHIN_DAYS = 7

/** Loader mostrado enquanto o chunk da rota (lazy) é baixado. */
function RouteFallback() {
  return (
    <div className="flex items-center justify-center py-16">
      <span className="inline-block h-6 w-6 animate-spin rounded-[50%] border-2 border-accent/25 border-t-accent" />
    </div>
  )
}

/** Banner discreto quando a assinatura está perto de vencer. */
function ExpiryBanner({ billing }: { billing: BillingStatus }) {
  if (!billing.active || billing.daysLeft === null || billing.daysLeft > WARN_WITHIN_DAYS) {
    return null
  }
  const msg =
    billing.daysLeft <= 0
      ? 'Sua assinatura vence hoje.'
      : `Sua assinatura vence em ${billing.daysLeft} ${billing.daysLeft === 1 ? 'dia' : 'dias'}.`

  return (
    <div className="flex items-center justify-center gap-2 border-b border-warning/20 bg-warning/10 px-4 py-2 text-xs font-medium text-warning">
      <AlertTriangle size={14} />
      <span>{msg}</span>
      <a href={`mailto:${CONTACT_EMAIL}?subject=Renovação de assinatura`} className="underline">
        Renovar
      </a>
    </div>
  )
}

export default function MainLayout() {
  // Carrega a config do tenant (marca/tema/módulos/assinatura) antes do painel.
  const bootstrap = useBootstrap()
  const isPlatformAdmin = useAuthStore((s) => s.user?.isPlatformAdmin ?? false)
  const moduleManagerOpen = useAppStore((s) => s.moduleManagerOpen)
  // Usado como `key` do ErrorBoundary: trocar de rota reinicia o boundary, então
  // um erro numa tela não "prende" as outras.
  const { pathname } = useLocation()

  return (
    <Async state={bootstrap}>
      {(config) => {
        // Assinatura inativa bloqueia o painel (o admin de plataforma é isento).
        if (!isPlatformAdmin && !config.billing.active) {
          return <Paywall billing={config.billing} />
        }

        return (
          <div className="flex h-screen overflow-hidden bg-bg">
            <Sidebar />

            <div className="flex flex-1 flex-col overflow-hidden">
              {/* relative z-30: o backdrop-blur cria um stacking context próprio;
                  sem z-index no header, o conteúdo do <main> (ex.: o SearchInput,
                  que é position:relative) pinta por cima dos dropdowns da topbar.
                  z-30 mantém a topbar (e seus popovers) acima da página e abaixo
                  dos modais (z-50). */}
              <header className="relative z-30 flex h-[52px] shrink-0 items-center justify-end gap-2 border-b border-border bg-bg/90 px-5 backdrop-blur">
                <ThemeSwitcher />
                <NotificationsMenu />
                <div className="mx-1 h-5 w-px bg-border" />
                <UserMenu />
              </header>

              <ExpiryBanner billing={config.billing} />

              <main className="flex-1 overflow-y-auto p-6">
                <div className="mx-auto max-w-5xl animate-fade-up">
                  <ErrorBoundary key={pathname}>
                    <Suspense fallback={<RouteFallback />}>
                      <Outlet />
                    </Suspense>
                  </ErrorBoundary>
                </div>
              </main>
            </div>

            {moduleManagerOpen && (
              <Suspense fallback={null}>
                <ModuleManager />
              </Suspense>
            )}
          </div>
        )
      }}
    </Async>
  )
}
