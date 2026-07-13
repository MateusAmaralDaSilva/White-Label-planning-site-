import { useState } from 'react'
import { PageHeader } from '@/components/ui'
import { cn } from '@/lib/cn'
import { AccountsPanel } from './AccountsPanel'
import AdminAnalytics from './analytics'

/** Administração da plataforma (casca): abas Contas / Financeiro. */
export default function AdminPage() {
  const [tab, setTab] = useState<'contas' | 'financeiro'>('contas')

  const tabBtn = (id: 'contas' | 'financeiro', label: string) => (
    <button
      onClick={() => setTab(id)}
      className={cn(
        'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
        tab === id ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink',
      )}
    >
      {label}
    </button>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administração"
        subtitle="Contas, assinaturas e financeiro da plataforma"
        action={
          <div className="flex items-center gap-1 rounded-lg border border-border bg-surface-hover/50 p-1">
            {tabBtn('contas', 'Contas')}
            {tabBtn('financeiro', 'Financeiro')}
          </div>
        }
      />
      {tab === 'contas' ? <AccountsPanel /> : <AdminAnalytics />}
    </div>
  )
}
