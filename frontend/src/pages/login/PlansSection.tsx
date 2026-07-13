import { ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui'
import { PLANS, CONTACT_EMAIL, planMailto, type Plan } from '@/config/plans'
import { formatBRL } from '@/lib/format'

/** Seção "Planos" da landing: os planos + contato. */
export function PlansSection() {
  return (
    <section id="planos" className="border-t border-border bg-sidebar px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold leading-tight text-ink sm:text-4xl">
            Planos simples e transparentes
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-ink-muted">
            Escolha o período que faz sentido para você. Quanto maior o plano, menor o valor por
            mês. A ativação é feita pela nossa equipe — fale com a gente e começamos na hora.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
          {PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-ink-faint">
          Dúvidas? Escreva para{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-accent hover:text-accent-hover">
            {CONTACT_EMAIL}
          </a>
        </p>
      </div>
    </section>
  )
}

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <div
      className={[
        'relative flex flex-col rounded-2xl border bg-surface p-6',
        plan.featured ? 'border-accent shadow-lg ring-1 ring-accent/20' : 'border-border',
      ].join(' ')}
    >
      {plan.badge && (
        <span
          className={[
            'absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider',
            plan.featured ? 'bg-accent text-white' : 'bg-surface-hover text-ink-muted',
          ].join(' ')}
        >
          {plan.badge}
        </span>
      )}

      <h3 className="text-lg font-bold text-ink">{plan.name}</h3>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-3xl font-bold text-ink">{formatBRL(plan.price)}</span>
      </div>
      <p className="mt-1 text-xs text-ink-muted">{plan.priceNote}</p>

      <ul className="mt-5 flex-1 space-y-2.5">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-ink-muted">
            <Check size={15} className="mt-0.5 shrink-0 text-success" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <a href={planMailto(plan)} className="mt-6 block">
        <Button variant={plan.featured ? 'primary' : 'secondary'} className="w-full">
          Assinar {plan.name}
          <ArrowRight size={15} />
        </Button>
      </a>
    </div>
  )
}
