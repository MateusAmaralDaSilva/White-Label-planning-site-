import { NavLink } from 'react-router-dom'
import { Settings2, ChevronLeft, ChevronRight, ShieldCheck, Users } from 'lucide-react'
import { useAppStore, useEnabledModules } from '@/store/appStore'
import { useAuthStore } from '@/store/authStore'
import { Brand } from '@/components/ui'
import { cn } from '@/lib/cn'

const footBtn =
  'flex w-full items-center gap-3 overflow-hidden whitespace-nowrap rounded-lg px-2.5 py-2 ' +
  'text-xs font-medium text-ink-faint transition-colors hover:bg-surface hover:text-ink-muted'

const collapseBtn =
  'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink-faint ' +
  'transition-colors hover:bg-surface hover:text-ink-muted'

export default function Sidebar() {
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const openModuleManager = useAppStore((s) => s.openModuleManager)
  const enabledModules = useEnabledModules()
  const isPlatformAdmin = useAuthStore((s) => s.user?.isPlatformAdmin ?? false)
  const isTenantAdmin = useAuthStore((s) => s.user?.isTenantAdmin ?? false)

  return (
    <aside
      className={cn(
        'bg-dots flex h-full flex-col border-r border-border bg-sidebar transition-all duration-300',
        sidebarCollapsed ? 'w-[60px]' : 'w-56',
      )}
    >
      <div
        className={cn(
          'flex h-[52px] shrink-0 items-center border-b border-border',
          sidebarCollapsed ? 'justify-center px-2' : 'gap-2 px-4',
        )}
      >
        {!sidebarCollapsed && <Brand size="sm" />}
        <button
          onClick={toggleSidebar}
          className={cn(collapseBtn, !sidebarCollapsed && 'ml-auto')}
          title={sidebarCollapsed ? 'Expandir' : 'Recolher'}
          aria-label={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
        {enabledModules.map((mod) => (
          <NavLink
            key={mod.id}
            to={mod.path}
            end={mod.path === '/'}
            title={sidebarCollapsed ? mod.name : undefined}
            className={({ isActive }) =>
              cn(
                'relative flex items-center gap-3 overflow-hidden whitespace-nowrap rounded-lg border px-2.5 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'border-accent/20 bg-accent/10 text-ink before:absolute before:left-0 before:top-1/2 before:h-3/5 before:w-[2.5px] before:-translate-y-1/2 before:rounded-r before:bg-accent'
                  : 'border-transparent text-ink-muted hover:bg-surface hover:text-ink',
              )
            }
          >
            <mod.icon size={17} className="shrink-0" />
            {!sidebarCollapsed && <span className="truncate">{mod.name}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="flex shrink-0 flex-col gap-0.5 border-t border-border p-2">
        {isTenantAdmin && (
          <NavLink
            to="/equipe"
            title={sidebarCollapsed ? 'Equipe' : undefined}
            className={({ isActive }) => cn(footBtn, isActive && 'bg-surface text-ink-muted')}
          >
            <Users size={15} className="shrink-0" />
            {!sidebarCollapsed && <span>Equipe</span>}
          </NavLink>
        )}
        {isPlatformAdmin && (
          <NavLink
            to="/admin"
            title={sidebarCollapsed ? 'Administração' : undefined}
            className={({ isActive }) =>
              cn(footBtn, isActive && 'bg-surface text-ink-muted')
            }
          >
            <ShieldCheck size={15} className="shrink-0" />
            {!sidebarCollapsed && <span>Administração</span>}
          </NavLink>
        )}
        <button
          onClick={openModuleManager}
          className={footBtn}
          title={sidebarCollapsed ? 'Configurar módulos' : undefined}
        >
          <Settings2 size={15} className="shrink-0" />
          {!sidebarCollapsed && <span>Configurar módulos</span>}
        </button>
      </div>
    </aside>
  )
}
