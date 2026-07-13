import { Plus, Lock, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui'
import type { Calendar as Agenda } from '@contracts'
import { FilterChip } from './FilterChip'

/** Barra acima do calendário: filtro por agenda + ações (gerenciar / novo evento). */
export function AgendaBar({
  agendas,
  selected,
  onSelect,
  onManage,
  onNew,
}: {
  agendas: Agenda[]
  selected: string
  onSelect: (id: string) => void
  onManage: () => void
  onNew: () => void
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-1.5">
        <FilterChip active={selected === 'all'} onClick={() => onSelect('all')}>
          Todas
        </FilterChip>
        {agendas.map((a) => (
          <FilterChip
            key={a.id}
            active={selected === a.id}
            onClick={() => onSelect(a.id)}
            color={a.color}
          >
            {a.name}
            {a.isPrivate && <Lock size={11} className="opacity-70" />}
          </FilterChip>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={onManage}>
          <SlidersHorizontal size={15} /> Agendas
        </Button>
        <Button onClick={onNew}>
          <Plus size={16} /> Novo Agendamento
        </Button>
      </div>
    </div>
  )
}
