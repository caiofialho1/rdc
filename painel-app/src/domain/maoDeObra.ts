/**
 * Mão de obra por função: colunas qtd_* de rdc_atividades (migracao_v3_efetivo).
 * efetivo_total é gravado como a soma dessas colunas; registros anteriores à v3
 * podem ter efetivo sem discriminação por função — isso é sinalizado, não rateado.
 */
import type { AtividadeRow } from '../api/schemas'

export type CampoFuncao =
  | 'qtd_ajudante'
  | 'qtd_pintor'
  | 'qtd_jatista'
  | 'qtd_mecanico'
  | 'qtd_montador_andaime'
  | 'qtd_alpinista_n1'
  | 'qtd_soldador'

export const FUNCOES: Array<[CampoFuncao, string]> = [
  ['qtd_ajudante', 'Ajudante'],
  ['qtd_pintor', 'Pintor'],
  ['qtd_jatista', 'Jatista'],
  ['qtd_mecanico', 'Mecânico'],
  ['qtd_montador_andaime', 'Montador de Andaime'],
  ['qtd_alpinista_n1', 'Alpinista N1'],
  ['qtd_soldador', 'Soldador'],
]

/** Funções com quantidade > 0 numa atividade, na ordem de FUNCOES. */
export function funcoesDaAtividade(a: AtividadeRow): Array<{ funcao: string; qtd: number }> {
  return FUNCOES.filter(([campo]) => a[campo] > 0).map(([campo, funcao]) => ({ funcao, qtd: a[campo] }))
}

/** Pessoas do efetivo_total que não aparecem em nenhuma função (registro sem discriminação). */
export function semFuncao(a: AtividadeRow): number {
  const discriminado = FUNCOES.reduce((s, [campo]) => s + a[campo], 0)
  return Math.max(0, a.efetivo_total - discriminado)
}

export interface LinhaFuncao {
  funcao: string
  /** Maior quantidade da função numa mesma atividade — atividades não são somadas, a equipe se repete entre elas. */
  pico: number
  /** Σ(qtd × duração) / 60 — aditivo, compõe o HH trabalhado. */
  hh: number
}

export interface MaoDeObraRdc {
  linhas: LinhaFuncao[]
  /** HH de efetivo sem função discriminada (0 quando tudo está discriminado). */
  hhSemFuncao: number
  /** Maior efetivo_total entre as atividades sem discriminação. */
  picoSemFuncao: number
}

export function maoDeObraPorFuncao(atividades: AtividadeRow[]): MaoDeObraRdc {
  const linhas: LinhaFuncao[] = []
  for (const [campo, funcao] of FUNCOES) {
    let pico = 0
    let hh = 0
    for (const a of atividades) {
      pico = Math.max(pico, a[campo])
      hh += (a[campo] * a.duracao_min) / 60
    }
    // Todas as funções sempre aparecem (lista fixa), inclusive as que ficaram em zero no RDC.
    linhas.push({ funcao, pico, hh })
  }
  let hhSemFuncao = 0
  let picoSemFuncao = 0
  for (const a of atividades) {
    const n = semFuncao(a)
    hhSemFuncao += (n * a.duracao_min) / 60
    picoSemFuncao = Math.max(picoSemFuncao, n)
  }
  return { linhas, hhSemFuncao, picoSemFuncao }
}
