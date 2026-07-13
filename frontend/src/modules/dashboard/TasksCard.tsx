import { useEffect, useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui'
import { api } from '@/lib/api'
import type { DashboardTask } from '@contracts'
import { TaskForm } from './TaskForm'

/**
 * Card de tarefas com CRUD:
 *  - o checkbox marca/desmarca com atualização otimista (não recarrega tudo);
 *  - clicar no texto abre a edição; o "+" no cabeçalho cria;
 *  - criar/editar/excluir recarregam o dashboard (via onChanged).
 * `tasks` (do servidor) é a fonte da verdade — ressincroniza quando muda.
 */
export function TasksCard({ tasks, onChanged }: { tasks: DashboardTask[]; onChanged: () => void }) {
  const [items, setItems] = useState(tasks)
  // null = fechado · 'new' = criando · DashboardTask = editando aquela tarefa.
  const [editing, setEditing] = useState<DashboardTask | 'new' | null>(null)
  useEffect(() => setItems(tasks), [tasks])

  async function toggle(task: DashboardTask) {
    const done = !task.done
    setItems((prev) => prev.map((t) => (t.id === task.id ? { ...t, done } : t)))
    try {
      await api.put(`/api/dashboard/tasks/${task.id}`, { done })
    } catch {
      // Reverte em caso de erro (rede/permissão) — o servidor não mudou.
      setItems((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: task.done } : t)))
    }
  }

  return (
    <Card>
      <CardHeader
        action={
          <button
            onClick={() => setEditing('new')}
            aria-label="Nova tarefa"
            className="rounded-md p-1 text-ink-faint transition-colors hover:bg-surface-hover hover:text-ink"
          >
            <Plus size={14} />
          </button>
        }
      >
        Tarefas
      </CardHeader>

      {/* Altura máxima + rolagem interna: muitas tarefas não esticam o card. */}
      <div className="max-h-72 overflow-y-auto">
        {items.map((task) => (
          <div
            key={task.id}
            className="flex items-center gap-3 border-b border-border/50 px-4 py-2.5 last:border-0"
          >
            <button
              onClick={() => toggle(task)}
              role="checkbox"
              aria-checked={task.done}
              aria-label={task.done ? 'Desmarcar tarefa' : 'Concluir tarefa'}
              className={`flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded border ${
                task.done ? 'border-accent bg-accent/10' : 'border-border'
              }`}
            >
              {task.done && <Check size={9} className="text-accent" strokeWidth={3} />}
            </button>
            <button
              onClick={() => setEditing(task)}
              title="Clique para editar"
              className={`flex-1 truncate text-left text-xs ${
                task.done ? 'text-ink-faint line-through' : 'text-ink-muted'
              }`}
            >
              {task.label}
            </button>
          </div>
        ))}

        {items.length === 0 && (
          <p className="px-4 py-6 text-center text-xs text-ink-faint">Nenhuma tarefa ainda.</p>
        )}
      </div>

      {editing !== null && (
        <TaskForm
          initial={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            onChanged()
          }}
        />
      )}
    </Card>
  )
}
