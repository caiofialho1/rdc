import type { ReactNode } from 'react'
import type { Tom } from '../../domain/badges'

const TONS: Record<Tom, string> = {
  success: 'border-success-border bg-success-bg text-success-text',
  warning: 'border-warning-border bg-warning-bg text-warning-text',
  danger: 'border-danger-border bg-danger-bg text-danger-text',
  info: 'border-info-border bg-info-bg text-info-text',
  neutro: 'border-border bg-surface-soft text-text-secondary',
}

/** Nunca só cor: rótulo textual sempre visível; contorno 1 px no tom do estado (padrão Stitch). */
export default function Badge({ tom, children }: { tom: Tom; children: ReactNode }) {
  return <span className={`se-chip border ${TONS[tom]}`}>{children}</span>
}
