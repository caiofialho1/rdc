import { useEffect, useState } from 'react'

export interface EscopoIndependente {
  modo: 'periodo' | 'todas'
  ini: string
  fim: string
}

// Faixa prática de "todas as datas" (dentro do limite de 20000 dias das RPCs de produção).
const TODAS: Pick<EscopoIndependente, 'ini' | 'fim'> = { ini: '2018-01-01', fim: '2068-01-01' }

/**
 * Seções de Produção (× RDC / por responsável) têm escopo de data
 * independente do filtro global, lembrado por navegador — ver
 * docs/INFORMATION_ARCHITECTURE.md.
 */
export function useEscopoIndependente(chaveStorage: string, iniPadrao: string, fimPadrao: string): [EscopoIndependente, (e: EscopoIndependente) => void] {
  const [escopo, setEscopo] = useState<EscopoIndependente>(() => {
    try {
      const salvo = localStorage.getItem(chaveStorage)
      if (salvo) return JSON.parse(salvo)
    } catch {
      /* ignora */
    }
    return { modo: 'periodo', ini: iniPadrao, fim: fimPadrao }
  })

  useEffect(() => {
    try {
      localStorage.setItem(chaveStorage, JSON.stringify(escopo))
    } catch {
      /* ignora */
    }
  }, [chaveStorage, escopo])

  // "Período do painel" acompanha o período global atual — não as datas
  // gravadas no localStorage na 1ª vez (o rótulo dizia "período do painel"
  // enquanto a consulta usava um período antigo).
  const efetivo: EscopoIndependente = escopo.modo === 'todas' ? { ...escopo, ...TODAS } : { ...escopo, ini: iniPadrao, fim: fimPadrao }
  return [efetivo, setEscopo]
}
