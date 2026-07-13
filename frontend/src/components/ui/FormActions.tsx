import { Button } from './Button'

/**
 * Rodapé de ações compartilhado pelos formulários criar/editar (modais dos
 * módulos): botão "Excluir" à esquerda — só na edição — e "Cancelar"/"Salvar"
 * à direita. Centraliza o mesmo layout usado em produtos, clientes, chamados
 * e agendamentos.
 */
export function FormActions({
  editing,
  busy,
  onCancel,
  onDelete,
  submitLabel,
}: {
  editing: boolean
  busy: boolean
  onCancel: () => void
  onDelete: () => void
  /** Texto do botão primário no modo criação (edição usa sempre "Salvar"). */
  submitLabel: string
}) {
  return (
    <div className="flex items-center justify-between pt-1">
      {editing ? (
        <Button
          type="button"
          variant="ghost"
          className="text-danger hover:bg-danger/10"
          onClick={onDelete}
          disabled={busy}
        >
          Excluir
        </Button>
      ) : (
        <span />
      )}
      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button type="submit" loading={busy}>
          {editing ? 'Salvar' : submitLabel}
        </Button>
      </div>
    </div>
  )
}
