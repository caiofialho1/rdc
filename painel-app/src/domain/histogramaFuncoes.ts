/**
 * Histograma de mão de obra por função e por dia (Painel executivo → Detalhamento).
 *
 * Efetivo (pessoas) — não é aditivo:
 *  - num RDC, a equipe se repete entre as atividades: vale o maior qtd_* da função (pico);
 *  - no mesmo dia, o mesmo responsável comanda a mesma equipe em todos os RDC dele: vale o
 *    maior pico entre esses RDC (não soma, para não contar a mesma pessoa duas vezes);
 *  - responsáveis diferentes têm equipes diferentes: somam.
 * HH — aditivo: Σ(qtd × duração) / 60 de todas as atividades do dia.
 *
 * Dia sem RDC é ausência (null), não zero. Dia com RDC e função sem ninguém é zero.
 * "Sem função informada" = efetivo_total não discriminado por função (RDC anteriores à v3).
 */
import type { AtividadeRow, RdcRow } from '../api/schemas'
import { FUNCOES, semFuncao } from './maoDeObra'

export type MetricaFuncao = 'efetivo' | 'hh'
export const SEM_FUNCAO = 'Sem função informada'

export interface SerieFuncao {
  funcao: string
  /** Valor por dia, alinhado a `dias`; null = dia sem RDC. */
  valores: Array<number | null>
  /** Efetivo: maior valor diário. HH: soma do período. */
  total: number
  /** Média dos dias com RDC. */
  media: number | null
  /** Índice do dia de maior valor (o primeiro, se empatar); null se tudo zero. */
  pico: number | null
}

export interface HistogramaFuncoes {
  dias: string[]
  diasComRdc: number
  series: SerieFuncao[]
}

export function histogramaPorFuncao(rdcs: RdcRow[], atividades: AtividadeRow[], dias: string[], metrica: MetricaFuncao): HistogramaFuncoes {
  const dadosRdc = new Map(rdcs.map((r) => [r.codigo, r]))
  const comRdc = new Set(rdcs.map((r) => r.data_rdc.slice(0, 10)))
  const nomes = [...FUNCOES.map(([, f]) => f), SEM_FUNCAO]
  const qtd = (a: AtividadeRow, i: number) => (i < FUNCOES.length ? a[FUNCOES[i][0]] : semFuncao(a))

  // valor[dia][função]
  const porDia = new Map<string, number[]>()
  if (metrica === 'hh') {
    for (const a of atividades) {
      const r = dadosRdc.get(a.rdc)
      if (!r) continue
      const v = porDia.get(r.data_rdc.slice(0, 10)) ?? nomes.map(() => 0)
      nomes.forEach((_, i) => (v[i] += (qtd(a, i) * a.duracao_min) / 60))
      porDia.set(r.data_rdc.slice(0, 10), v)
    }
  } else {
    // pico por RDC → maior pico por (dia, responsável) → soma dos responsáveis no dia
    const picoRdc = new Map<string, number[]>()
    for (const a of atividades) {
      const v = picoRdc.get(a.rdc) ?? nomes.map(() => 0)
      nomes.forEach((_, i) => (v[i] = Math.max(v[i], qtd(a, i))))
      picoRdc.set(a.rdc, v)
    }
    const porResp = new Map<string, { dia: string; v: number[] }>()
    for (const [codigo, v] of picoRdc) {
      const r = dadosRdc.get(codigo)
      if (!r) continue
      const dia = r.data_rdc.slice(0, 10)
      const chave = `${dia}|${r.responsavel}`
      const atual = porResp.get(chave)
      if (atual) atual.v.forEach((x, i) => (atual.v[i] = Math.max(x, v[i])))
      else porResp.set(chave, { dia, v: [...v] })
    }
    for (const { dia, v } of porResp.values()) {
      const soma = porDia.get(dia) ?? nomes.map(() => 0)
      v.forEach((x, i) => (soma[i] += x))
      porDia.set(dia, soma)
    }
  }

  const series = nomes.map((funcao, i) => {
    const valores = dias.map((d) => (comRdc.has(d) ? (porDia.get(d)?.[i] ?? 0) : null))
    const presentes = valores.filter((v): v is number => v != null)
    const maior = presentes.length ? Math.max(...presentes) : 0
    return {
      funcao,
      valores,
      total: metrica === 'hh' ? presentes.reduce((s, v) => s + v, 0) : maior,
      media: presentes.length ? presentes.reduce((s, v) => s + v, 0) / presentes.length : null,
      pico: maior > 0 ? valores.indexOf(maior) : null,
    }
  })
  // "Sem função informada" só aparece quando existe no recorte.
  const semFuncaoSerie = series[series.length - 1]
  return {
    dias,
    diasComRdc: dias.filter((d) => comRdc.has(d)).length,
    series: semFuncaoSerie.pico == null ? series.slice(0, -1) : series,
  }
}
