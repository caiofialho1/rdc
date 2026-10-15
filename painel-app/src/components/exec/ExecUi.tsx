import type { ReactNode } from 'react'

/* Blocos visuais do Painel executivo (protótipo Stitch, classes exec-*), compartilhados entre telas. */

export function Secao({ id, titulo, sub, extra, children }: { id: string; titulo: string; sub?: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id={id} className="exec-secao__titulo">
            {titulo}
          </h2>
          {sub && <p className="exec-secao__sub">{sub}</p>}
        </div>
        {extra}
      </div>
      {children}
    </section>
  )
}

export function Card({ titulo, sub, extra, rodape, children }: { titulo: string; sub?: string; extra?: ReactNode; rodape?: ReactNode; children: ReactNode }) {
  return (
    <div className="exec-card">
      <div className="exec-card__topo">
        <div className="min-w-0">
          <h3 className="exec-card__titulo">{titulo}</h3>
          {sub && <p className="exec-card__sub">{sub}</p>}
        </div>
        {extra}
      </div>
      <div className="mt-3 mb-3 min-w-0">{children}</div>
      {rodape && <div className="exec-card__rodape">{rodape}</div>}
    </div>
  )
}

export function Kpi({ rotulo, icone, valor, unidade, linha, rodape, className = '' }: { rotulo: string; icone: ReactNode; valor: string; unidade?: string; linha?: ReactNode; rodape?: ReactNode; className?: string }) {
  return (
    <div className={`exec-card justify-between ${className}`} role="group" aria-label={rotulo}>
      <div className="flex items-center justify-between gap-2 border-b border-[var(--exec-border)] pb-2">
        <span className="exec-kpi__rotulo">{rotulo}</span>
        <span className="exec-kpi__icone" aria-hidden="true">
          {icone}
        </span>
      </div>
      <div className="my-3">
        <p className="exec-kpi__valor">
          {valor}
          {unidade && <span className="exec-kpi__unidade">{unidade}</span>}
        </p>
        {linha && <div className="mt-1.5 text-xs text-[var(--exec-text-2)]">{linha}</div>}
      </div>
      {rodape && <div className="exec-card__rodape">{rodape}</div>}
    </div>
  )
}
