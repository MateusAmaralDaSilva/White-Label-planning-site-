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
  id: 'mensal' | 'semestral' | 'anual' | 'inloco'
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
    price: 50,
    priceNote: 'por mês, renovação mensal',
    features: [
      'Todos os módulos da plataforma',
      'Marca e tema personalizados',
      'Suporte por e-mail'
    ],
  },
  {
    id: 'anual',
    name: 'Anual',
    months: 12,
    price: 600,
    priceNote: '12 meses — equivale a R$ 124/mês',
    badge: 'Melhor custo - Mais popular',
    features: [
      'Tudo do plano memestral',
      'Suporte prioritário',
      'Até três usuários na conta'
    ],
  },
  {
    id: 'inloco',
    name: 'Local (sem hospedagem)',
    months: 6,
    price: 0,
    priceNote: 'Preço sob consulta — sem hospedagem',
    features: [
      'Pagamento apenas uma vez (sem mensalidade)',
      'Hospedagem e manutenção por conta do cliente',
      'Suporte via consultoria (sob demanda)',  
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
