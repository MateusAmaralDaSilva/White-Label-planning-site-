import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

/**
 * Diálogo modal centralizado. Segue o mesmo padrão de overlay do ModuleManager
 * (fundo escurecido + clique-fora fecha), mas centrado e reutilizável para
 * formulários. Fecha com Esc. `onClose` é chamado pelo backdrop, pelo X e por Esc.
 */
interface ModalProps {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
}

export function Modal({ title, subtitle, onClose, children }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* flex-col + max-h: cabeçalho fixo e corpo rolável; formulários longos não
          estouram a tela (limita a 90% da altura da viewport). */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-sidebar shadow-2xl"
      >
        <div className="flex shrink-0 items-start justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-ink">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-ink-faint">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-surface hover:text-ink"
          >
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  )
}
