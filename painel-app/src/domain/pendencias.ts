import type { RdcRow } from '../api/schemas'

export interface ResumoPendencias {
  aguardandoValidacao: RdcRow[]
  semContrato: RdcRow[]
  ptsSemEspera: RdcRow[]
}

/** KPI "Pendências (resumo executivo)" — ver docs/KPI_CATALOG.md. */
export function pendencias(rdcs: RdcRow[]): ResumoPendencias {
  return {
    aguardandoValidacao: rdcs.filter((r) => r.status === 'Enviado'),
    semContrato: rdcs.filter((r) => !r.contrato),
    ptsSemEspera: rdcs.filter((r) => r.pts && r.espera_pts_min == null),
  }
}
