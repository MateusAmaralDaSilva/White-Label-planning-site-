import { ChevronDown } from 'lucide-react'
import ThemeSwitcher from '@/components/ThemeSwitcher'
import { useBrandStore } from '@/store/brandStore'
import { BrandingPanel } from './BrandingPanel'
import { LoginForm } from './LoginForm'
import { AboutSection } from './AboutSection'
import { PlansSection } from './PlansSection'

/** Landing + login (casca): hero (marca + form) + apresentação + planos + rodapé. */
export default function Login() {
  const brand = useBrandStore((s) => s.brand)

  return (
    <div className="min-h-screen bg-bg">
      <div className="fixed right-5 top-4 z-20">
        <ThemeSwitcher />
      </div>

      {/* ── Hero: login (primeira dobra) ─────────────────────────────────── */}
      <section className="relative flex min-h-screen">
        <BrandingPanel />
        <LoginForm />

        {/* Indicador de rolagem — texto + seta saltando. */}
        <a
          href="#sobre"
          className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1.5 text-accent transition-colors hover:text-accent-hover"
          aria-label="Conheça a plataforma e nossos planos"
        >
          <span className="text-sm font-semibold uppercase tracking-wider">
            Conheça a plataforma e nossos planos
          </span>
          <ChevronDown size={28} strokeWidth={2.5} className="animate-bounce" />
        </a>
      </section>

      <AboutSection />
      <PlansSection />

      <footer className="border-t border-border px-6 py-8 text-center text-xs text-ink-faint">
        © 2026 {brand.name} Platform
      </footer>
    </div>
  )
}
