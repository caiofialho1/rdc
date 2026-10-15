import { cssVar } from '../../styles/cssVar'

/**
 * Padrão dos gráficos de barras do painel: o valor vem no rótulo de dado, então o eixo de
 * valor fica sem números e sem grade horizontal; a grade vertical, bem clara, separa as
 * categorias (dias, causas, responsáveis) sem competir com as barras.
 */
export function gradeSuave() {
  return { show: true, interval: 0, lineStyle: { color: cssVar('--gridline'), opacity: 0.7, width: 1 } }
}

export const EIXO_VALOR_SEM_ROTULO = { axisLabel: { show: false }, splitLine: { show: false }, axisLine: { show: false }, axisTick: { show: false } }

/** Rótulos de dado nunca se sobrepõem: o que colidiria é ocultado (o valor segue no tooltip). */
export const SEM_SOBREPOSICAO = { hideOverlap: true }

/**
 * Cores categóricas para séries comparáveis (ordem fixa, nunca ciclada; no máximo 6 séries).
 * Validada com o validate_palette do skill dataviz (fundo claro): banda de luminosidade,
 * croma, separação para daltonismo e piso de visão normal passam. Contraste de algumas cores
 * fica abaixo de 3:1, por isso toda série leva o nome no fim da linha, legenda e tooltip.
 * Vermelho e laranja ficam de fora: no painel são reservados a impacto e alerta.
 */
export const CORES_SERIES = ['#2a78d6', '#1baf7a', '#6250d6', '#e87ba4', '#008300', '#c98500'] as const
export const MAX_SERIES = CORES_SERIES.length

/**
 * Afasta na vertical os nomes do fim das linhas que ficariam a menos de `minimo` (em valor do
 * eixo) um do outro. Devolve o deslocamento de cada série em valor do eixo (positivo = para baixo).
 */
export function afastarRotulos(itens: Array<{ chave: string; valor: number | null }>, minimo: number): Map<string, number> {
  const ordenados = itens.filter((i): i is { chave: string; valor: number } => i.valor != null).sort((a, b) => b.valor - a.valor)
  const saida = new Map<string, number>()
  let anterior = Infinity
  for (const i of ordenados) {
    const pos = Math.min(i.valor, anterior - minimo)
    saida.set(i.chave, i.valor - pos)
    anterior = pos
  }
  return saida
}

/**
 * Posição do rótulo de cada ponto em gráficos de várias linhas: em cada categoria (dia), as
 * séries de valor mais alto levam o rótulo acima do ponto e as de valor mais baixo, abaixo —
 * assim os rótulos se afastam em vez de se empilhar. Se dois rótulos do mesmo lado ficariam a
 * menos de `minimo` (em valor do eixo) um do outro, um deles é ocultado (null): sai primeiro o
 * da série 0 (referência, ex.: total do dia); entre as demais, fica o de índice menor.
 * `series[s][i]` = valor da série s no dia i.
 */
export function posicaoRotulos(series: Array<Array<number | null>>, minimo = 0): Array<Array<'top' | 'bottom' | null>> {
  const saida = series.map((s) => s.map(() => null as 'top' | 'bottom' | null))
  const n = Math.max(0, ...series.map((s) => s.length))
  const prioridade = (k: number) => (k === 0 ? series.length : k) // menor = mais importante
  for (let i = 0; i < n; i++) {
    const presentes = series.map((s, k) => ({ k, v: s[i] })).filter((x): x is { k: number; v: number } => x.v != null)
    presentes.sort((a, b) => b.v - a.v)
    const metade = Math.ceil(presentes.length / 2)
    for (const lado of ['top', 'bottom'] as const) {
      const grupo = presentes.filter((_, ordem) => (lado === 'top' ? ordem < metade : ordem >= metade))
      const mantidos: Array<{ k: number; v: number }> = []
      for (const x of [...grupo].sort((a, b) => prioridade(a.k) - prioridade(b.k))) {
        if (mantidos.some((m) => Math.abs(m.v - x.v) < minimo)) continue
        mantidos.push(x)
        saida[x.k][i] = lado
      }
    }
  }
  return saida
}
