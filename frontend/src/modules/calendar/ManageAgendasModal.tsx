import { useState } from 'react'
import { Plus, Lock, Pencil, Trash2 } from 'lucide-react'
import { Button, Modal } from '@/components/ui'
import { api } from '@/lib/api'
import type { Calendar as Agenda } from '@contracts'
import { AgendaForm } from './AgendaForm'

/** Modal de gerenciar agendas: lista + criar/editar/excluir. */
export function ManageAgendasModal({
  agendas,
  onClose,
  onChanged,
}: {
  agendas: Agenda[]
  onClose: () => void
  onChanged: () => void
}) {
  // null = nenhum form aberto · 'new' = criando · Agenda = editando aquela.
  const [form, setForm] = useState<Agenda | 'new' | null>(null)

  async function remove(a: Agenda) {
    if (!window.confirm(`Excluir a agenda "${a.name}"? Os agendamentos dela também serão removidos.`))
      return
    try {
      await api.del(`/api/calendar/calendars/${a.id}`)
      onChanged()
    } catch {
      /* mantém se falhar */
    }
  }

  return (
    <Modal title="Agendas" subtitle="Crie agendas compartilhadas ou privadas" onClose={onClose}>
      <div className="space-y-3">
        <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
          {agendas.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-ink-faint">Nenhuma agenda ainda.</p>
          ) : (
            agendas.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: a.color }} />
                <span className="flex-1 truncate text-sm font-medium text-ink">{a.name}</span>
                {a.isPrivate && (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-ink-faint">
                    <Lock size={11} /> Privada
                  </span>
                )}
                <button
                  onClick={() => setForm(a)}
                  aria-label="Editar agenda"
                  className="rounded-md p-1.5 text-ink-faint transition-colors hover:bg-surface-hover hover:text-ink"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => remove(a)}
                  aria-label="Excluir agenda"
                  className="rounded-md p-1.5 text-ink-faint transition-colors hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {form === null ? (
          <Button variant="secondary" onClick={() => setForm('new')} className="w-full">
            <Plus size={14} /> Nova agenda
          </Button>
        ) : (
          <AgendaForm
            initial={form === 'new' ? undefined : form}
            onCancel={() => setForm(null)}
            onSaved={() => {
              setForm(null)
              onChanged()
            }}
          />
        )}
      </div>
    </Modal>
  )
}
