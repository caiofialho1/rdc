import { useEffect, useRef } from 'react'

/**
 * Comportamento mínimo de diálogo/gaveta: Esc fecha, foco entra no
 * contêiner ao abrir e volta para o elemento de origem ao fechar.
 */
export function useDialogo<T extends HTMLElement>(aberto: boolean, fechar: () => void) {
  const ref = useRef<T>(null)
  const fecharRef = useRef(fechar)

  useEffect(() => {
    fecharRef.current = fechar
  }, [fechar])

  useEffect(() => {
    if (!aberto) return
    const origem = document.activeElement as HTMLElement | null
    const alvo = ref.current?.querySelector<HTMLElement>('[data-autofoco]') ?? ref.current
    alvo?.focus()
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'Escape') fecharRef.current()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      origem?.focus?.()
    }
  }, [aberto])

  return ref
}
