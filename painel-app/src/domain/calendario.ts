/**
 * Matriz "Emissão diária" (responsável × dia) — porta a lógica de matriz()
 * em painel.html (classificação de célula, extensão até o fim do mês).
 * Dias sem registro são ausência, não execução zero (ver BUSINESS_MODEL.md).
 */
import { isoDia } from './ciclo'
import { FERIADOS } from './feriados'

export interface DiaCalendario {
  iso: string
  diaSemana: number
  dia: number
  mes: number
}

export function diasDoIntervalo(ini: string, fim: string): DiaCalendario[] {
  const out: DiaCalendario[] = []
  for (const d = new Date(`${ini}T12:00:00`); isoDia(d) <= fim; d.setDate(d.getDate() + 1)) {
    out.push({ iso: isoDia(d), diaSemana: d.getDay(), dia: d.getDate(), mes: d.getMonth() + 1 })
  }
  return out
}

/** Só estende o mês corrente, e só quando o filtro já inclui hoje. */
export function estenderFimMesSeAplicavel(fim: string, hojeIso: string): string {
  const hojeData = new Date(`${hojeIso}T12:00:00`)
  const fimMes = isoDia(new Date(hojeData.getFullYear(), hojeData.getMonth() + 1, 0))
  return fim >= hojeIso && fim <= fimMes ? fimMes : fim
}

export type TipoDia = 'ok' | 'feriado' | 'fds' | 'futuro' | 'no'

export interface ClassificacaoDia {
  tipo: TipoDia
  simbolo: string
  situacao: string
}

export function classificarDia(dia: DiaCalendario, contagem: number, hojeIso: string): ClassificacaoDia {
  const feriado = FERIADOS.get(dia.iso)
  const fds = dia.diaSemana === 0 || dia.diaSemana === 6
  const futuro = dia.iso > hojeIso
  if (contagem > 0) return { tipo: 'ok', simbolo: contagem > 1 ? String(contagem) : '✓', situacao: `${contagem} RDC` }
  if (feriado) return { tipo: 'feriado', simbolo: '', situacao: `feriado · ${feriado.nome} · fora da contagem` }
  if (fds) return { tipo: 'fds', simbolo: '', situacao: 'fim de semana · fora da contagem' }
  if (futuro) return { tipo: 'futuro', simbolo: '–', situacao: 'data futura · fora da contagem' }
  return { tipo: 'no', simbolo: '✕', situacao: 'sem RDC em dia útil' }
}
