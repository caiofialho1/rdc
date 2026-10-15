import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { medicaoAtual } from '../domain/ciclo'
import type { FiltrosSecundarios } from '../domain/filtros'

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
  // Abre na medição em curso (ex.: em 14/10, a de outubro: 21/09 a 20/10).
  const [padrao] = useState(medicaoAtual)
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
