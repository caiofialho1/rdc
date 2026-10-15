/**
 * Fórmulas de esforço confirmadas em docs/BUSINESS_MODEL.md. Funções puras
 * sobre os arrays já validados por schemas.ts — nenhuma chamada de rede aqui.
 */
import type { AtividadeRow, ImpactoRow, RdcRow } from '../api/schemas'

/** HH trabalhado = Σ(efetivo_total × duração em minutos) / 60. */
export function hhTrabalhado(atividades: AtividadeRow[]): number {
  return atividades.reduce((soma, a) => soma + (a.efetivo_total * a.duracao_min) / 60, 0)
}

export function hhTrabalhadoPorDisciplina(atividades: AtividadeRow[]): Map<string, number> {
  const porDisciplina = new Map<string, number>()
  for (const a of atividades) {
    const atual = porDisciplina.get(a.disciplina) ?? 0
    porDisciplina.set(a.disciplina, atual + (a.efetivo_total * a.duracao_min) / 60)
  }
  return porDisciplina
}

/**
 * HH de impacto de um RDC = duração do impacto × maior efetivo entre suas
 * atividades (a equipe que ficou parada) — já vem pronto em `hh_impacto_min`
 * (vw_rdc_metricas), em minutos. Aqui só converte para horas.
 */
export function hhImpacto(rdcs: RdcRow[]): number {
  return rdcs.reduce((soma, r) => soma + r.hh_impacto_min / 60, 0)
}

/**
 * Quando uma disciplina é selecionada, o HH de impacto de cada RDC é
 * rateado pela participação daquela disciplina no HH trabalhado do próprio
 * RDC — não existe HH de impacto "nativo" por disciplina (ver
 * BUSINESS_MODEL.md). RDC sem nenhuma atividade na disciplina não contribui.
 */
export function hhImpactoRateadoPorDisciplina(
  rdcs: RdcRow[],
  atividades: AtividadeRow[],
  disciplina: string,
): number {
  const hhPorRdc = new Map<string, number>()
  const hhDisciplinaPorRdc = new Map<string, number>()
  for (const a of atividades) {
    const hh = (a.efetivo_total * a.duracao_min) / 60
    hhPorRdc.set(a.rdc, (hhPorRdc.get(a.rdc) ?? 0) + hh)
    if (a.disciplina === disciplina) {
      hhDisciplinaPorRdc.set(a.rdc, (hhDisciplinaPorRdc.get(a.rdc) ?? 0) + hh)
    }
  }
  let soma = 0
  for (const r of rdcs) {
    const hhTotalRdc = hhPorRdc.get(r.codigo) ?? 0
    const hhDisciplinaRdc = hhDisciplinaPorRdc.get(r.codigo) ?? 0
    if (hhTotalRdc <= 0 || hhDisciplinaRdc <= 0) continue
    soma += (r.hh_impacto_min / 60) * (hhDisciplinaRdc / hhTotalRdc)
  }
  return soma
}

export interface HhResponsavel {
  responsavel: string
  hhTrabalhado: number
  hhImpacto: number
}

/** Comparação por responsável (HH trabalhado × HH de impacto) — mesma visão da antiga seção "Responsáveis". */
export function hhPorResponsavel(rdcs: RdcRow[], atividades: AtividadeRow[]): HhResponsavel[] {
  const hhAtividadesPorRdc = new Map<string, number>()
  for (const a of atividades) {
    hhAtividadesPorRdc.set(a.rdc, (hhAtividadesPorRdc.get(a.rdc) ?? 0) + (a.efetivo_total * a.duracao_min) / 60)
  }
  const porResponsavel = new Map<string, HhResponsavel>()
  for (const r of rdcs) {
    const atual = porResponsavel.get(r.responsavel) ?? { responsavel: r.responsavel, hhTrabalhado: 0, hhImpacto: 0 }
    atual.hhTrabalhado += hhAtividadesPorRdc.get(r.codigo) ?? 0
    atual.hhImpacto += r.hh_impacto_min / 60
    porResponsavel.set(r.responsavel, atual)
  }
  return [...porResponsavel.values()].sort((a, b) => b.hhTrabalhado - a.hhTrabalhado)
}

/** Tempo de impacto = Σ duração dos impactos, em horas. Intervalos simultâneos somam (não deduplicam). */
export function tempoImpacto(impactos: ImpactoRow[]): number {
  return impactos.reduce((soma, i) => soma + i.duracao_min / 60, 0)
}

export interface EsperaPts {
  comEspera: number[]
  semPts: number
  ptsSemHorario: number
}

/**
 * Espera PTS só existe quando o RDC declarou PTS=true E informou os dois
 * horários. "Sem PTS", "PTS sem horário" e "espera calculada" são estados
 * distintos — nunca tratar ausência como zero (ver BUSINESS_MODEL.md).
 */
export function esperaPts(rdcs: RdcRow[]): EsperaPts {
  const comEspera: number[] = []
  let semPts = 0
  let ptsSemHorario = 0
  for (const r of rdcs) {
    if (!r.pts) {
      semPts++
    } else if (r.espera_pts_min == null) {
      ptsSemHorario++
    } else {
      comEspera.push(r.espera_pts_min / 60)
    }
  }
  return { comEspera, semPts, ptsSemHorario }
}

export function mediaEsperaPts(espera: EsperaPts): number | null {
  if (!espera.comEspera.length) return null
  return espera.comEspera.reduce((a, b) => a + b, 0) / espera.comEspera.length
}

/**
 * Meta de espera de PTS definida pelo planejamento em 2026-10-14: espera acima de
 * 40 min é desfavorável. Não vem do banco — é regra do painel (ver KPI_CATALOG.md).
 */
export const META_ESPERA_PTS_MIN = 40

export interface EsperaMaxima {
  /** Maior espera informada no recorte, em minutos. */
  maxMin: number
  /** RDC com espera acima da meta. */
  acimaMeta: number
  /** RDC com PTS e espera informada (base da comparação). */
  comEspera: number
}

/** Espera máxima de PTS (mesma base de esperaPts: só RDC com PTS e os dois horários); null sem nenhuma espera informada. */
export function esperaMaximaPts(rdcs: RdcRow[], meta = META_ESPERA_PTS_MIN): EsperaMaxima | null {
  const esperas = rdcs.filter((r) => r.pts && r.espera_pts_min != null).map((r) => r.espera_pts_min as number)
  if (!esperas.length) return null
  return { maxMin: Math.max(...esperas), acimaMeta: esperas.filter((e) => e > meta).length, comEspera: esperas.length }
}
