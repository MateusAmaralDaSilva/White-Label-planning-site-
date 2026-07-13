import { X, GripVertical, Lock } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAppStore, useOrderedModules } from '@/store/appStore'
import type { AppModule } from '@/types/module'
import { cn } from '@/lib/cn'

function SortableModule({ mod }: { mod: AppModule }) {
  const toggleModule = useAppStore((s) => s.toggleModule)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: mod.id,
    disabled: mod.required,
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-3 rounded-xl border bg-surface p-3',
        mod.enabled ? 'border-accent/30' : 'border-border',
        isDragging && 'opacity-50',
      )}
    >
      <button
        {...attributes}
        {...listeners}
        disabled={mod.required}
        className={cn(
          'text-ink-faint',
          mod.required ? 'cursor-not-allowed' : 'cursor-grab hover:text-ink-muted active:cursor-grabbing',
        )}
      >
        <GripVertical size={14} />
      </button>

      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-hover">
        <mod.icon size={15} className="text-accent" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          {mod.name}
          {mod.required && <Lock size={11} className="text-ink-faint" />}
        </div>
        <div className="truncate text-xs text-ink-faint">{mod.description}</div>
      </div>

      <button
        onClick={() => !mod.required && toggleModule(mod.id)}
        disabled={mod.required}
        role="switch"
        aria-checked={mod.enabled}
        aria-label={mod.enabled ? `Desativar ${mod.name}` : `Ativar ${mod.name}`}
        title={mod.required ? 'Módulo obrigatório' : undefined}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
          mod.required ? 'cursor-not-allowed bg-accent/30' : 'cursor-pointer',
          !mod.required && (mod.enabled ? 'bg-accent' : 'bg-border'),
        )}
      >
        <span
          className={cn(
            'inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform',
            mod.enabled ? 'translate-x-[18px]' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  )
}

/** Painel "Configurar módulos". Montado sob demanda — só quando aberto (ver MainLayout). */
export default function ModuleManager() {
  const closeModuleManager = useAppStore((s) => s.closeModuleManager)
  const reorderModules = useAppStore((s) => s.reorderModules)
  const sorted = useOrderedModules()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    const oldIndex = sorted.findIndex((m) => m.id === active.id)
    const newIndex = sorted.findIndex((m) => m.id === over.id)
    reorderModules(arrayMove(sorted, oldIndex, newIndex).map((m) => m.id))
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModuleManager} />

      <div className="relative ml-auto flex h-full w-full max-w-sm flex-col border-l border-border bg-sidebar shadow-2xl">
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-ink">Configurar Módulos</h2>
            <p className="mt-0.5 text-xs text-ink-faint">
              Ative, desative e reordene as funcionalidades
            </p>
          </div>
          <button
            onClick={closeModuleManager}
            className="rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-surface hover:text-ink"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-3">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sorted.map((m) => m.id)} strategy={verticalListSortingStrategy}>
              {sorted.map((mod) => (
                <SortableModule key={mod.id} mod={mod} />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        <p className="border-t border-border px-5 py-3 text-center text-xs text-ink-faint">
          Arraste para reordenar · Alterações salvas automaticamente
        </p>
      </div>
    </div>
  )
}
