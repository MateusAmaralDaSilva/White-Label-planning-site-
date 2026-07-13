import { Sparkles } from 'lucide-react'
import { FEATURES } from './data'

/** Seção "Sobre" da landing: pitch + grade de recursos (os módulos). */
export function AboutSection() {
  return (
    <section id="sobre" className="border-t border-border px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-accent">
            <Sparkles size={12} /> Plataforma whitelabel
          </span>
          <h2 className="mt-5 text-balance text-3xl font-bold leading-tight text-ink sm:text-4xl">
            Uma plataforma, moldada para o seu negócio
          </h2>
          <p className="mt-4 text-pretty text-sm leading-relaxed text-ink-muted sm:text-base">
            Produtos, serviços, vendas, agendamentos, clientes, relatórios e suporte — tudo em um só
            lugar, com a sua marca e o seu tema. Ative apenas os módulos que você precisa e
            reorganize quando quiser.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((mod) => (
            <div key={mod.id} className="flex flex-col rounded-xl border border-border bg-surface p-5">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <mod.icon size={20} />
              </div>
              <div className="text-sm font-semibold text-ink">{mod.name}</div>
              <p className="mt-1 text-xs leading-relaxed text-ink-muted">{mod.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
