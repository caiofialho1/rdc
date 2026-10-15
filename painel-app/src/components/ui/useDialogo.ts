import { useEffect, useRef } from 'react'

/** Diálogos abertos, do mais antigo ao mais recente: Esc fecha só o do topo. */
const pilha: object[] = []

/**
 * Comportamento mínimo de diálogo/gaveta: Esc fecha, foco entra no
 * contêiner ao abrir e volta para o elemento de origem ao fechar. Com
 * diálogos empilhados (ex.: foto ampliada dentro do detalhe do RDC), Esc
 * fecha só o de cima.
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
    const entrada = {}
    pilha.push(entrada)
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'Escape' && pilha[pilha.length - 1] === entrada) fecharRef.current()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      pilha.splice(pilha.indexOf(entrada), 1)
      origem?.focus?.()
    }
  }, [aberto])

  return ref
}
