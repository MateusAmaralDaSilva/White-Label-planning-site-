import { useState, type ChangeEvent } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { Field } from '@/components/ui'
import { LOGO_MAX_BYTES } from './utils'

/** Campo de logo reutilizável (upload → data URI, com prévia e remover). */
export function LogoField({
  value,
  onChange,
}: {
  value: string | null
  onChange: (v: string | null) => void
}) {
  const [error, setError] = useState<string | null>(null)

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // permite re-selecionar o mesmo arquivo depois
    if (!file) return
    setError(null)
    if (!file.type.startsWith('image/')) {
      setError('Selecione um arquivo de imagem.')
      return
    }
    if (file.size > LOGO_MAX_BYTES) {
      setError('Imagem muito grande (máx. 500KB).')
      return
    }
    const reader = new FileReader()
    reader.onload = () => onChange(reader.result as string)
    reader.onerror = () => setError('Não foi possível ler o arquivo.')
    reader.readAsDataURL(file)
  }

  return (
    <Field label="Logo (opcional)" htmlFor="brand-logo">
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface">
          {value ? (
            <img src={value} alt="Prévia da logo" className="h-full w-full object-contain" />
          ) : (
            <ImagePlus size={18} className="text-ink-faint" />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor="brand-logo"
            className="cursor-pointer rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
          >
            {value ? 'Trocar imagem' : 'Escolher imagem'}
          </label>
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="flex items-center gap-1 rounded-lg px-2 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger/10"
            >
              <Trash2 size={14} /> Remover
            </button>
          )}
          <input id="brand-logo" type="file" accept="image/*" className="hidden" onChange={onFile} />
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      <p className="mt-1 text-[11px] text-ink-faint">
        PNG, JPG ou SVG até 500KB. Sem logo, usamos a sigla.
      </p>
    </Field>
  )
}
