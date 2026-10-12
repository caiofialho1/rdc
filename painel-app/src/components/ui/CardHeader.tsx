import type { ReactNode } from 'react'

interface CardHeaderProps {
  titulo: ReactNode
  /** Contexto curto: escopo de datas, unidade, critério do recorte. */
  subtitulo?: ReactNode
  /** Controles alinhados à direita; quebram para baixo em telas estreitas. */
  acoes?: ReactNode
  nivel?: 'h2' | 'h3'
  id?: string
}

/** Cabeçalho padrão de Card/ChartCard: título 15 px/600, subtítulo 12 px, ações à direita. */
export default function CardHeader({ titulo, subtitulo, acoes, nivel: Nivel = 'h2', id }: CardHeaderProps) {
  return (
    <div className="mb-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        <Nivel id={id} className="text-[15px] leading-snug font-semibold text-text-primary">
          {titulo}
        </Nivel>
        {subtitulo && <p className="mt-0.5 text-xs text-text-secondary">{subtitulo}</p>}
      </div>
      {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
    </div>
  )
}
