import { useEffect, useRef } from 'react'

/**
 * Fecha um elemento flutuante ao clicar fora dele OU ao pressionar Escape.
 * Retorna um ref que deve envolver o disclosure inteiro (gatilho + painel),
 * para que clicar no próprio gatilho não conte como "clique fora".
 *
 * O callback é lido via ref, então mudar sua identidade a cada render não
 * re-registra os listeners.
 */
export function useClickOutside<T extends HTMLElement>(onClose: () => void) {
  const ref = useRef<T>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    function handlePointer(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onCloseRef.current()
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [])

  return ref
}
