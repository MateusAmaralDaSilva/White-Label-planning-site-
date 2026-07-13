import { Brand } from '@/components/ui'
import { useBrandStore } from '@/store/brandStore'
import { HIGHLIGHTS } from './data'

/** Painel lateral do hero (só em telas grandes): marca, slogan e destaques. */
export function BrandingPanel() {
  const brand = useBrandStore((s) => s.brand)

  return (
    <aside className="bg-dots hidden w-[420px] shrink-0 flex-col border-r border-border bg-sidebar p-10 lg:flex">
      <Brand />
      <div className="flex flex-1 flex-col justify-center py-12">
        <h2 className="mb-4 text-balance text-[2rem] font-bold leading-tight text-ink">
          {brand.tagline}
        </h2>
        <p className="mb-9 text-sm leading-relaxed text-ink-muted">
          Configure os módulos que fazem sentido para o seu negócio. Adicione, remova e reordene
          funcionalidades em segundos.
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          {HIGHLIGHTS.map(({ name, icon: Icon, iconClass }) => (
            <div
              key={name}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface p-2.5"
            >
              <Icon size={16} className={iconClass} />
              <span className="text-xs font-medium text-ink-muted">{name}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-ink-faint">© 2026 {brand.name} Platform</p>
    </aside>
  )
}
