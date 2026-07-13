import { LockKeyhole, ArrowRight, LogOut } from 'lucide-react'
import { Brand, Button } from '@/components/ui'
import ThemeSwitcher from '@/components/ThemeSwitcher'
import { useAuthStore } from '@/store/authStore'
import { CONTACT_EMAIL } from '@/config/plans'
import type { BillingStatus } from '@/hooks/useBootstrap'

/**
 * Tela de assinatura expirada/inativa. Substitui o painel inteiro quando o tenant
 * não tem assinatura ativa (o backend também bloqueia os dados com 402). O acesso
 * volta assim que a equipe creditar meses no painel admin — basta o usuário
 * recarregar/entrar de novo.
 */
export default function Paywall({ billing }: { billing: BillingStatus }) {
  const logout = useAuthStore((s) => s.logout)
  const userEmail = useAuthStore((s) => s.userEmail)

  const expired = billing.paidUntil !== null
  const subject = encodeURIComponent('Renovação de assinatura')
  const body = encodeURIComponent(
    `Olá! Quero renovar a assinatura da conta (${userEmail}).\n\nPlano desejado: `,
  )

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-bg p-6">
      <div className="fixed right-5 top-4 z-10">
        <ThemeSwitcher />
      </div>

      <div className="w-full max-w-md text-center">
        <div className="mb-8 flex justify-center">
          <Brand />
        </div>

        <div className="rounded-2xl border border-border bg-surface p-8">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-warning/10 text-warning">
            <LockKeyhole size={26} />
          </div>

          <h1 className="text-xl font-bold text-ink">
            {expired ? 'Assinatura expirada' : 'Assinatura inativa'}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            {expired
              ? 'O período da sua assinatura terminou. Para voltar a acessar o painel, renove com a nossa equipe.'
              : 'Sua conta ainda não tem uma assinatura ativa. Fale com a nossa equipe para liberar o acesso.'}
          </p>

          <a
            href={`mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`}
            className="mt-6 block"
          >
            <Button className="w-full">
              Renovar assinatura
              <ArrowRight size={15} />
            </Button>
          </a>

          <p className="mt-4 text-xs text-ink-faint">
            Ou escreva para{' '}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-medium text-accent hover:text-accent-hover"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>

        <button
          onClick={logout}
          className="mx-auto mt-6 flex items-center gap-1.5 text-xs font-medium text-ink-faint transition-colors hover:text-ink"
        >
          <LogOut size={13} /> Sair
        </button>
      </div>
    </div>
  )
}
