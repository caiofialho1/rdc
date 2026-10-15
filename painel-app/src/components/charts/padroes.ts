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
