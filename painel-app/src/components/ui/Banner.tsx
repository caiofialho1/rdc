import type { ReactNode } from 'react'

interface BannerProps {
  tipo: 'atencao' | 'erro' | 'informacao'
  children: ReactNode
}

const estilos: Record<BannerProps['tipo'], string> = {
  atencao: 'border-warning/40 bg-warning-bg text-warning-text',
  erro: 'border-danger/40 bg-danger-bg text-danger-text',
  informacao: 'border-info/30 bg-info-bg text-info-text',
}

export default function Banner({ tipo, children }: BannerProps) {
  return (
    <div role={tipo === 'erro' ? 'alert' : 'status'} className={`rounded-control border px-3 py-2 text-sm ${estilos[tipo]}`}>
      {children}
    </div>
  )
}
