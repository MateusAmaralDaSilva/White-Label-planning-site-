import { lazy } from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import MainLayout from '@/layouts/MainLayout'
import Login from '@/pages/login'
import { useAuthStore } from '@/store/authStore'
import { useEnabledModules } from '@/store/appStore'
import { moduleRegistry } from '@/modules/registry'

// Páginas administrativas também sob demanda (Admin puxa gráficos + AdminAnalytics).
// Renderizam dentro do <Outlet> do MainLayout, coberto pelo <Suspense> de lá.
const AdminPage = lazy(() => import('@/pages/admin'))
const TeamPage = lazy(() => import('@/pages/team'))

function RequireAuth() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}

/** Só o administrador de plataforma acessa /admin; os demais voltam para a home. */
function RequireAdmin() {
  const isPlatformAdmin = useAuthStore((s) => s.user?.isPlatformAdmin ?? false)
  return isPlatformAdmin ? <Outlet /> : <Navigate to="/" replace />
}

/** Só o admin do tenant (dono da conta) acessa /equipe. */
function RequireTenantAdmin() {
  const isTenantAdmin = useAuthStore((s) => s.user?.isTenantAdmin ?? false)
  return isTenantAdmin ? <Outlet /> : <Navigate to="/" replace />
}

function DisabledPage() {
  return (
    <div className="flex h-64 flex-col items-center justify-center text-center">
      <div className="mb-3 text-4xl opacity-20">⊡</div>
      <h2 className="text-base font-semibold text-ink-muted">Módulo desativado</h2>
      <p className="mt-1 text-sm text-ink-faint">
        Ative este módulo em "Configurar módulos" na barra lateral.
      </p>
    </div>
  )
}

export default function App() {
  const enabledModules = useEnabledModules()
  const enabledIds = new Set(enabledModules.map((m) => m.id))

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth />}>
        <Route element={<MainLayout />}>
          {moduleRegistry.map((mod) => (
            <Route
              key={mod.id}
              path={mod.path}
              element={enabledIds.has(mod.id) ? <mod.component /> : <DisabledPage />}
            />
          ))}
          <Route element={<RequireAdmin />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>
          <Route element={<RequireTenantAdmin />}>
            <Route path="/equipe" element={<TeamPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}
