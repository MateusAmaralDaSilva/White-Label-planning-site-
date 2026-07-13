import { withTenant } from '../tenant-context.js'
import { billingFromPaidUntil } from '../../lib/billing.js'
import { relativeLabel } from '../../lib/relative-time.js'
import type { AppNotification } from '../../types/index.js'

/** Faltando este nº de dias (ou menos), o sino avisa sobre a renovação. */
const WARN_WITHIN_DAYS = 7

/**
 * Notificações do sino da topbar. Além das persistidas, injeta — quando faz
 * sentido — um aviso de assinatura DERIVADO de `paid_until`: ele aparece sozinho
 * conforme a data de vencimento se aproxima, sem nenhum job. (Se a assinatura já
 * expirou, o usuário nem chega aqui: o front mostra a tela de renovação.)
 */
export async function getNotifications(tenantId: string): Promise<AppNotification[]> {
  return withTenant(tenantId, async (query) => {
    const rows = await query<{
      id: string
      title: string
      description: string
      occurred_at: Date
      tone: AppNotification['tone']
      iconKey: AppNotification['iconKey']
    }>(
      `select id, title, description, occurred_at, tone, icon_key as "iconKey"
         from app.notifications
        where tenant_id = $1
        order by occurred_at desc`,
      [tenantId],
    )
    // Rótulo de tempo calculado na leitura (não congela). O aviso de assinatura
    // injetado abaixo tem `time` próprio ("Assinatura"), sem instante real.
    const stored: AppNotification[] = rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      time: relativeLabel(r.occurred_at),
      tone: r.tone,
      iconKey: r.iconKey,
    }))

    const billingRows = await query<{ paid_until: Date | null; plan: string | null }>(
      'select paid_until, plan from app.tenants where id = $1',
      [tenantId],
    )
    const b = billingRows[0]
    const billing = b
      ? billingFromPaidUntil(b.paid_until ? b.paid_until.toISOString() : null, b.plan)
      : undefined

    if (billing?.active && billing.daysLeft !== null && billing.daysLeft <= WARN_WITHIN_DAYS) {
      const notice: AppNotification = {
        id: 'billing-expiry',
        title: 'Assinatura perto de vencer',
        description:
          billing.daysLeft <= 0
            ? 'Sua assinatura vence hoje. Renove para não perder o acesso.'
            : `Sua assinatura vence em ${billing.daysLeft} ${
                billing.daysLeft === 1 ? 'dia' : 'dias'
              }. Fale com nossa equipe para renovar.`,
        time: 'Assinatura',
        tone: 'warning',
        iconKey: 'payment',
      }
      return [notice, ...stored]
    }

    return stored
  })
}
