import type { ComponentPropsWithoutRef } from 'react'

/** Área de gráfico: fundo --chart-background, nunca branco puro (regra 1 do AGENTS.md Slate Executive). */
export default function ChartCard({ children, className = '', ...rest }: ComponentPropsWithoutRef<'div'>) {
  return (
    <div className={`se-chart ${className}`} {...rest}>
      {children}
    </div>
  )
}
