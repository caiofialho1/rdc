import { useId, type ReactNode } from 'react'

interface KpiCardProps {
  rotulo: string
  valor: string
  unidade?: string
  contexto?: string
  /** Definição do indicador: exposta como descrição acessível e no `title` do card. */
  titulo?: string
  icone: ReactNode
}

/**
 * Cartão de indicador customizado (CSS + SVG, sem lib de ícones externa).
 * Hierarquia: rótulo (2 linhas reservadas) → valor + unidade (sem quebra) →
 * contexto. A cor do ícone é uniforme entre os indicadores — nenhum destes
 * KPIs é "bom/ruim" (ver docs/BUSINESS_MODEL.md), então nenhum usa cor de
 * semáforo; a forma do ícone diferencia cada um.
 */
export default function KpiCard({ rotulo, valor, unidade, contexto, titulo, icone }: KpiCardProps) {
  const idRotulo = useId()
  const idDescricao = useId()
  return (
    <div
      className="kpi-card"
      role="group"
      aria-labelledby={idRotulo}
      aria-describedby={titulo ? idDescricao : undefined}
      title={titulo}
    >
      <div className="kpi-card__topo">
        <p id={idRotulo} className="kpi-card__rotulo">
          {rotulo}
        </p>
        <div className="kpi-card__icone" aria-hidden="true">
          {icone}
        </div>
      </div>
      <p className="kpi-card__valor">
        <span className="se-kpi-value text-text-primary">{valor}</span>
        {unidade && <span className="kpi-card__unidade">{unidade}</span>}
      </p>
      {contexto && <p className="kpi-card__contexto">{contexto}</p>}
      {titulo && (
        <span id={idDescricao} className="sr-only">
          {titulo}
        </span>
      )}
    </div>
  )
}
