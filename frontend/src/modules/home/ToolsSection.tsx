import { Link } from 'react-router-dom'
import { ArrowRight, Plus } from 'lucide-react'
import { Card } from '@/components/ui'
import { useAppStore, useEnabledModules } from '@/store/appStore'

/** Seção "Ferramentas" da Home: grade dos módulos ativos (menos a própria Home). */
export function ToolsSection() {
  const openModuleManager = useAppStore((s) => s.openModuleManager)
  const tools = useEnabledModules().filter((m) => m.id !== 'home')

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          Ferramentas
        </h2>
        <button
          onClick={openModuleManager}
          className="flex items-center gap-1 text-xs font-medium text-accent transition-colors hover:text-accent-hover"
        >
          <Plus size={13} /> Adicionar
        </button>
      </div>

      {tools.length === 0 ? (
        <Card>
          <div className="px-4 py-10 text-center text-sm text-ink-muted">
            Nenhuma ferramenta ativa.{' '}
            <button
              onClick={openModuleManager}
              className="font-medium text-accent hover:text-accent-hover"
            >
              Ativar módulos
            </button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tools.map((mod) => (
            <Link
              key={mod.id}
              to={mod.path}
              className="group flex flex-col rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent/40 hover:bg-surface-hover"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <mod.icon size={18} />
              </div>
              <div className="text-sm font-semibold text-ink">{mod.name}</div>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-muted">
                {mod.description}
              </p>
              <span className="mt-3 flex items-center gap-1 text-xs font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100">
                Abrir <ArrowRight size={12} />
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
