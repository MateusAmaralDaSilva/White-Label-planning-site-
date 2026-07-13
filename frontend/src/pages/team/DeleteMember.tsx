import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import type { TeamMember } from '@contracts'

/** Botão de excluir um login da equipe (com confirmação). */
export function DeleteMember({ member, onDeleted }: { member: TeamMember; onDeleted: () => void }) {
  const [busy, setBusy] = useState(false)

  async function handleDelete() {
    if (!window.confirm(`Excluir o login de "${member.name}" (${member.email})?`)) return
    setBusy(true)
    try {
      await api.del(`/api/team/users/${member.id}`)
      onDeleted()
    } catch {
      setBusy(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={busy}
      aria-label={`Excluir ${member.name}`}
      className="rounded-md p-1.5 text-ink-faint transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50"
    >
      <Trash2 size={15} />
    </button>
  )
}
