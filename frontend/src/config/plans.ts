/**
 * Planos exibidos na landing (pré-login). Conteúdo 100% editável: ajuste preços,
 * benefícios e destaque à vontade — nada aqui é regra de negócio. A cobrança é
 * feita manualmente pela equipe (não há pagamento automático ainda), então o CTA
 * de cada plano abre um e-mail para o time comercial.
 *
 * Os `id` (mensal/semestral/anual) espelham os planos aceitos pelo backend
 * (admin.repo → createAccountSchema); mantenha-os em sincronia se renomear.
 */

/** E-mail que recebe os pedidos de assinatura (CTA dos planos). */
export const CONTACT_EMAIL = 'silvaamaralmateus@gmail.com'

export interface Plan {
  id: 'mensal' | 'semestral' | 'anual'
  name: string
  /** Meses de assinatura creditados neste plano. */
  months: number
  /** Preço total do período (placeholder — ajuste). Em BRL. */
  price: number
  /** Texto curto sob o preço (ex.: cobrança, economia). */
  priceNote: string
  /** Selo opcional (ex.: "Mais popular"). */
  badge?: string
  /** Destaca visualmente o card. */
  featured?: boolean
  features: string[]
}

/**
 * PLACEHOLDER de preços — troque pelos valores reais. A ideia: quanto maior o
 * período, menor o preço por mês (incentivo ao plano anual).
 */
export const PLANS: Plan[] = [
  {
    id: 'mensal',
    name: 'Mensal',
    months: 1,
    price: 149,
    priceNote: 'por mês, renovação mensal',
    features: [
      'Todos os módulos da plataforma',
      'Marca e tema personalizados',
      'Usuários ilimitados na conta',
      'Suporte por e-mail',
    ],
  },
  {
    id: 'semestral',
    name: 'Semestral',
    months: 6,
    price: 799,
    priceNote: '6 meses — equivale a R$ 133/mês',
    badge: 'Mais popular',
    featured: true,
    features: [
      'Tudo do plano Mensal',
      'Economia de ~11% frente ao mensal',
      'Prioridade no suporte',
      'Onboarding assistido',
    ],
  },
  {
    id: 'anual',
    name: 'Anual',
    months: 12,
    price: 1490,
    priceNote: '12 meses — equivale a R$ 124/mês',
    badge: 'Melhor custo',
    features: [
      'Tudo do plano Semestral',
      'Economia de ~17% frente ao mensal',
      'Suporte prioritário',
      '2 meses de bônus na prática',
    ],
  },
]

/** Monta o link mailto do CTA de um plano. */
export function planMailto(plan: Plan): string {
  const subject = encodeURIComponent(`Assinatura — plano ${plan.name}`)
  const body = encodeURIComponent(
    `Olá! Tenho interesse no plano ${plan.name} (${plan.months} ${
      plan.months === 1 ? 'mês' : 'meses'
    }).\n\nMinha empresa: \nMeu nome: \nTelefone: `,
  )
  return `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`
}
