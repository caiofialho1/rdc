/**
 * Leitura das linhas de produção (rdc_admin_producao / rdc_admin_producao_resp)
 * — nenhum recálculo de produção acontece aqui, isso já vem pronto das views
 * vw_mc_rdc_dia / vw_mc_producao_responsavel (ver DATABASE_AUDIT.md). Este
 * módulo só agrega/classifica o que a view devolve.
 */
import type { PrecoRow, ProducaoResponse, ProducaoRespResponse, ProducaoRespRow, ProducaoRow, Situacao } from '../api/schemas'

export const ETAPAS = ['lav', 'slv', 'st2', 'st3', 'jat_1', 'jat_2', 'prm_c5', 'a05', 'f22', 'a06', 'fab', 'desm', 'mont'] as const
export type Etapa = (typeof ETAPAS)[number]

export function quantidadeEtapas(linha: Pick<ProducaoRow, Etapa>): number {
  return ETAPAS.reduce((soma, etapa) => soma + (linha[etapa] ?? 0), 0)
}

export function porSituacao<T extends { situacao: Situacao }>(linhas: T[]): Record<Situacao, T[]> {
  const agrupado: Record<Situacao, T[]> = {
    'Produção com RDC': [],
    'Produção sem RDC': [],
    'RDC sem produção': [],
  }
  for (const linha of linhas) agrupado[linha.situacao].push(linha)
  return agrupado
}

/** Linhas onde houve produção mas nenhum preço mapeado — lacuna de cadastro, nunca omitir. */
export function linhasSemPreco(linhas: ProducaoRespRow[]): ProducaoRespRow[] {
  return linhas.filter((l) => l.etapas_sem_preco)
}

export function totalFinanceiro(linhas: ProducaoRespRow[]): number {
  return linhas.reduce((soma, l) => soma + (l.valor ?? 0), 0)
}

/** Agrupa preços por contrato+disciplina+etapa para consulta rápida de cobertura. */
export function mapaPrecos(precos: PrecoRow[]): Map<string, PrecoRow> {
  const mapa = new Map<string, PrecoRow>()
  for (const p of precos) mapa.set(`${p.contrato_codigo}|${p.disciplina}|${p.etapa}`, p)
  return mapa
}

export function dadosOk<T extends { ok: boolean }>(resposta: T): resposta is T & { ok: true } {
  return resposta.ok === true
}

export type { ProducaoResponse, ProducaoRespResponse }
