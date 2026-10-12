import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { isoDia } from '../domain/ciclo'
import type { FiltrosSecundarios } from '../domain/filtros'

export interface PeriodoPreset {
  rotulo: string
  calcular: () => { ini: string; fim: string }
}

function hoje(): Date {
  return new Date()
}

export const PRESETS: PeriodoPreset[] = [
  { rotulo: 'Hoje', calcular: () => ({ ini: isoDia(hoje()), fim: isoDia(hoje()) }) },
  {
    rotulo: '7 dias',
    calcular: () => {
      const f = hoje()
      const i = new Date(f)
      i.setDate(i.getDate() - 6)
      return { ini: isoDia(i), fim: isoDia(f) }
    },
  },
  {
    rotulo: '30 dias',
    calcular: () => {
      const f = hoje()
      const i = new Date(f)
      i.setDate(i.getDate() - 29)
      return { ini: isoDia(i), fim: isoDia(f) }
    },
  },
  {
    rotulo: 'Este mês',
    calcular: () => {
      const f = hoje()
      return { ini: isoDia(new Date(f.getFullYear(), f.getMonth(), 1)), fim: isoDia(f) }
    },
  },
  {
    rotulo: 'Mês anterior',
    calcular: () => {
      const f = hoje()
      return {
        ini: isoDia(new Date(f.getFullYear(), f.getMonth() - 1, 1)),
        fim: isoDia(new Date(f.getFullYear(), f.getMonth(), 0)),
      }
    },
  },
]

interface FilterContextValue {
  ini: string
  fim: string
  definirPeriodo: (ini: string, fim: string) => void
  secundarios: FiltrosSecundarios
  definirSecundario: <K extends keyof FiltrosSecundarios>(chave: K, valor: FiltrosSecundarios[K]) => void
  limpar: () => void
}

const FilterContext = createContext<FilterContextValue | null>(null)

export function FilterProvider({ children }: { children: ReactNode }) {
  const padrao = PRESETS[2].calcular() // 30 dias
  const [ini, setIni] = useState(padrao.ini)
  const [fim, setFim] = useState(padrao.fim)
  const [secundarios, setSecundarios] = useState<FiltrosSecundarios>({})

  const valor = useMemo<FilterContextValue>(
    () => ({
      ini,
      fim,
      definirPeriodo: (novoIni, novoFim) => {
        setIni(novoIni)
        setFim(novoFim)
      },
      secundarios,
      definirSecundario: (chave, valor) => setSecundarios((s) => ({ ...s, [chave]: valor || undefined })),
      limpar: () => setSecundarios({}),
    }),
    [ini, fim, secundarios],
  )

  return <FilterContext.Provider value={valor}>{children}</FilterContext.Provider>
}

export function useFilters(): FilterContextValue {
  const ctx = useContext(FilterContext)
  if (!ctx) throw new Error('useFilters() precisa estar dentro de <FilterProvider>.')
  return ctx
}
