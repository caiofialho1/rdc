/**
 * Análise da produção por responsável (rdc_admin_producao_resp / vw_mc_producao_responsavel):
 * enriquecimento com contrato e área do RDC, filtros globais, agrupamentos e produtividade.
 *
 * Regras (ver docs/BUSINESS_MODEL.md e docs/KPI_CATALOG.md):
 * - m² (PAC) e kg (REC/TEL) nunca são somados entre si; toda soma é por unidade.
 * - A produção já vem rateada entre responsáveis pela view (campo participacao); aqui só se soma.
 * - Produtividade = produção ÷ HH somente nas linhas que têm as duas coisas (Produção com RDC
 *   e HH > 0). HH de "RDC sem produção" e produção "sem RDC" ficam fora do índice e aparecem
 *   como cobertura, nunca como zero.
 * - Contrato e área não existem na view de produção: vêm do RDC de campo do mesmo dia,
 *   responsável, OM, TAG e disciplina (mesma chave da view). Produção sem RDC não tem contrato
 *   nem área — fica "sem RDC", não é atribuída a ninguém.
 */
import type { AtividadeRow, ProducaoRespRow, RdcRow, Situacao } from '../api/schemas'
import type { FiltrosSecundarios } from './filtros'
import { ETAPAS, type Etapa } from './producao'

export type Unidade = 'm2' | 'kg'

export const ROTULO_UNIDADE: Record<Unidade, string> = { m2: 'm²', kg: 'kg' }

/** Rótulo curto da etapa, igual à coluna da memória de cálculo (MC). */
export const ROTULO_ETAPA: Record<Etapa, string> = {
  lav: 'LAV',
  slv: 'SLV',
  st2: 'ST2',
  st3: 'ST3',
  jat_1: 'JAT 1',
  jat_2: 'JAT 2',
  prm_c5: 'PRM C5',
  a05: 'A05',
  f22: 'F22',
  a06: 'A06',
  fab: 'FAB',
  desm: 'DESM',
  mont: 'MONT',
}

/** Código da etapa em mc_precos (descrição da etapa vem de lá quando houver preço cadastrado). */
export const CODIGO_ETAPA: Record<Etapa, string> = {
  lav: 'LAV',
  slv: 'SLV',
  st2: 'ST2',
  st3: 'ST3',
  jat_1: 'JAT_1',
  jat_2: 'JAT_2',
  prm_c5: 'PRM C5',
  a05: 'A05',
  f22: 'F22',
  a06: 'A06',
  fab: 'FAB',
  desm: 'DESM',
  mont: 'MONT',
}

export interface QtdEtapa {
  etapa: Etapa
  qtd: number
}

export interface LinhaProducao {
  id: string
  data: string | null
  responsavel: string
  tag: string | null
  om: string | null
  /** PAC, REC ou TEL (a view grava TEL/COB como TEL). */
  disciplina: string | null
  situacao: Situacao
  unidade: Unidade | null
  etapas: QtdEtapa[]
  /** Σ das etapas da linha, na unidade da linha (0 = sem produção). */
  quantidade: number
  valor: number | null
  etapasSemPreco: string | null
  participacao: number | null
  hh: number | null
  /** RDC(s) de campo que deram origem à linha (vazio em "Produção sem RDC"). */
  rdcs: string[]
  /** Contrato como exibido (nome, ou número quando não há nome). */
  contratos: string[]
  /** Número do contrato (filtro global "Contrato"). */
  contratoNumeros: string[]
  areas: string[]
  ativoDescricao: string | null
}

// ---------------------------------------------------------------------------
// Chaves iguais às funções SQL mc_tag_chave / mc_om_chave (migracao_v11)
// ---------------------------------------------------------------------------
const alnum = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '')

export function tagChave(t: string | null): string {
  return alnum((t ?? '').split(' ')[0].split('(')[0]).replace(/ZM$/, '')
}

export function omChave(o: string | null): string | null {
  const v = (o ?? '').replace(/\.0+$/, '').replace(/\D/g, '')
  return v || null
}

/** TEL/COB do app é TEL na produção (vw_mc_producao_responsavel). */
export function disciplinaProducao(d: string): string {
  return d === 'TEL/COB' ? 'TEL' : d
}

const unicos = (v: Array<string | null>) => [...new Set(v.filter((x): x is string => !!x && !!x.trim()))].sort((a, b) => a.localeCompare(b, 'pt-BR'))

/**
 * Liga cada linha de produção aos RDCs que a originaram e traz contrato, área e descrição do
 * ativo. Mesma chave da view: data + responsável + OM + disciplina, com a TAG do RDC
 * começando pela chave da TAG da produção. RDC substituído ou cancelado não entra (a view usa
 * vw_rdc_atividades, que os exclui).
 */
export function enriquecer(linhas: ProducaoRespRow[], rdcs: RdcRow[], atividades: AtividadeRow[]): LinhaProducao[] {
  const disciplinas = new Map<string, Set<string>>()
  for (const a of atividades) {
    const s = disciplinas.get(a.rdc) ?? new Set<string>()
    s.add(disciplinaProducao(a.disciplina))
    disciplinas.set(a.rdc, s)
  }
  const indice = new Map<string, RdcRow[]>()
  for (const r of rdcs) {
    if (r.status === 'Substituído' || r.status === 'Cancelado') continue
    const resp = r.responsavel.trim() || 'Sem responsável'
    for (const d of disciplinas.get(r.codigo) ?? []) {
      const chave = `${r.data_rdc.slice(0, 10)}|${resp}|${omChave(r.om) ?? '-'}|${d}`
      const lista = indice.get(chave) ?? []
      lista.push(r)
      indice.set(chave, lista)
    }
  }

  return linhas.map((l, i) => {
    const etapas: QtdEtapa[] = ETAPAS.flatMap((e) => (l[e] != null && l[e] !== 0 ? [{ etapa: e, qtd: l[e] as number }] : []))
    const quantidade = etapas.reduce((s, e) => s + e.qtd, 0)
    let origem: RdcRow[] = []
    if (l.situacao !== 'Produção sem RDC' && l.data && l.disciplina) {
      const candidatos = indice.get(`${l.data.slice(0, 10)}|${l.responsavel}|${omChave(l.om) ?? '-'}|${l.disciplina}`) ?? []
      const tag = tagChave(l.tag)
      origem = tag ? candidatos.filter((r) => alnum(r.ativo).startsWith(tag)) : candidatos
    }
    return {
      id: `${i}|${l.data}|${l.tag}|${l.om}|${l.disciplina}|${l.responsavel}`,
      data: l.data,
      responsavel: l.responsavel,
      tag: l.tag,
      om: l.om,
      disciplina: l.disciplina,
      situacao: l.situacao,
      unidade: l.unidade,
      etapas,
      quantidade,
      valor: l.valor,
      etapasSemPreco: l.etapas_sem_preco,
      participacao: l.participacao,
      hh: l.homem_hora,
      rdcs: origem.map((r) => r.codigo),
      contratos: unicos(origem.map((r) => r.contrato_nome ?? r.contrato)),
      contratoNumeros: unicos(origem.map((r) => r.contrato)),
      areas: unicos(origem.map((r) => r.area)),
      ativoDescricao: origem.find((r) => r.ativo_descricao)?.ativo_descricao ?? null,
    }
  })
}

/**
 * Filtros globais aplicáveis à produção. Status não se aplica (produção não tem status);
 * com filtro de área ou contrato, a produção sem RDC sai do recorte, porque não tem nenhum dos dois.
 */
export function filtrarProducao(linhas: LinhaProducao[], f: FiltrosSecundarios): LinhaProducao[] {
  const busca = f.busca?.toLowerCase().trim()
  return linhas.filter((l) => {
    if (f.responsavel && l.responsavel !== f.responsavel) return false
    if (f.disciplina && l.disciplina !== disciplinaProducao(f.disciplina)) return false
    if (f.area && !l.areas.includes(f.area)) return false
    if (f.contrato && !l.contratoNumeros.includes(f.contrato)) return false
    if (busca) {
      const alvo = [l.tag, l.om, l.responsavel, l.ativoDescricao, ...l.contratos, ...l.areas, ...l.rdcs]
      if (!alvo.some((v) => v && v.toLowerCase().includes(busca))) return false
    }
    return true
  })
}

// ---------------------------------------------------------------------------
// Totais e produtividade
// ---------------------------------------------------------------------------
export interface Totais {
  registros: number
  m2: number
  kg: number
  valor: number
  /** Linhas com produção e sem preço cadastrado (valor fora do total). */
  semPreco: number
  hh: number
  /** Produção e HH só das linhas com os dois (base da produtividade). */
  m2ComHh: number
  hhM2: number
  kgComHh: number
  hhKg: number
  /** HH de RDC sem produção batida na MC (fora da produtividade). */
  hhSemProducao: number
}

const vazio = (): Totais => ({ registros: 0, m2: 0, kg: 0, valor: 0, semPreco: 0, hh: 0, m2ComHh: 0, hhM2: 0, kgComHh: 0, hhKg: 0, hhSemProducao: 0 })

function somar(t: Totais, l: LinhaProducao, qtd = l.quantidade): void {
  const hh = l.hh ?? 0
  t.registros += 1
  t.valor += l.valor ?? 0
  t.hh += hh
  if (l.etapasSemPreco) t.semPreco += 1
  if (qtd === 0) t.hhSemProducao += hh
  if (l.unidade === 'm2') {
    t.m2 += qtd
    if (hh > 0 && qtd > 0) {
      t.m2ComHh += qtd
      t.hhM2 += hh
    }
  } else if (l.unidade === 'kg') {
    t.kg += qtd
    if (hh > 0 && qtd > 0) {
      t.kgComHh += qtd
      t.hhKg += hh
    }
  }
}

export function totalizar(linhas: LinhaProducao[]): Totais {
  const t = vazio()
  for (const l of linhas) somar(t, l)
  return t
}

/** Produção por HH na unidade pedida; null quando não há HH vinculado (não é zero). */
export function produtividade(t: Totais, u: Unidade): number | null {
  const hh = u === 'm2' ? t.hhM2 : t.hhKg
  return hh > 0 ? (u === 'm2' ? t.m2ComHh : t.kgComHh) / hh : null
}

// ---------------------------------------------------------------------------
// Agrupamento
// ---------------------------------------------------------------------------
export type Dimensao = 'responsavel' | 'contrato' | 'disciplina' | 'etapa' | 'ativo' | 'area' | 'data' | 'situacao'

export const ROTULO_DIMENSAO: Record<Dimensao, string> = {
  responsavel: 'Responsável',
  contrato: 'Contrato',
  disciplina: 'Disciplina',
  etapa: 'Etapa',
  ativo: 'Ativo',
  area: 'Área',
  data: 'Data',
  situacao: 'Situação',
}

export interface Grupo {
  chave: string
  totais: Totais
  linhas: LinhaProducao[]
}

/** Motivo de não haver contrato/área: produção sem RDC, ou RDC fora dos dados carregados. */
function semVinculo(l: LinhaProducao): string | null {
  if (l.situacao === 'Produção sem RDC') return 'Sem RDC vinculado'
  return l.rdcs.length ? null : 'RDC não localizado no período'
}

function chavesDa(l: LinhaProducao, d: Exclude<Dimensao, 'etapa'>): string {
  switch (d) {
    case 'responsavel':
      return l.responsavel
    case 'contrato':
      return l.contratos.length ? l.contratos.join(' / ') : semVinculo(l) ?? 'Contrato não informado'
    case 'disciplina':
      return l.disciplina ?? 'Não informada'
    case 'ativo':
      return l.tag ?? 'Não informado'
    case 'area':
      return l.areas.length ? l.areas.join(' / ') : semVinculo(l) ?? 'Área não informada'
    case 'data':
      return l.data?.slice(0, 10) ?? 'Sem data'
    case 'situacao':
      return l.situacao
  }
}

/**
 * Agrupa as linhas pela dimensão. Por etapa, cada linha entra uma vez em cada etapa que teve
 * produção, com a quantidade daquela etapa e o HH inteiro da linha: o HH do dia não é
 * discriminado por etapa no RDC, então ele se repete entre etapas e não se soma entre grupos.
 * Valor também não é discriminado por etapa na view — fica de fora nesse agrupamento.
 */
export function agrupar(linhas: LinhaProducao[], d: Dimensao): Grupo[] {
  const mapa = new Map<string, Grupo>()
  const grupo = (chave: string) => {
    let g = mapa.get(chave)
    if (!g) {
      g = { chave, totais: vazio(), linhas: [] }
      mapa.set(chave, g)
    }
    return g
  }
  for (const l of linhas) {
    if (d === 'etapa') {
      if (!l.etapas.length) {
        const g = grupo('Sem produção')
        somar(g.totais, { ...l, valor: null, etapasSemPreco: null })
        g.linhas.push(l)
      }
      for (const e of l.etapas) {
        const g = grupo(ROTULO_ETAPA[e.etapa])
        somar(g.totais, { ...l, valor: null, etapasSemPreco: null }, e.qtd)
        g.linhas.push(l)
      }
    } else {
      const g = grupo(chavesDa(l, d))
      somar(g.totais, l)
      g.linhas.push(l)
    }
  }
  return [...mapa.values()]
}

/** Ordem das etapas na MC, para listar etapas na sequência do processo e não alfabética. */
export const ORDEM_ETAPA = new Map<string, number>(ETAPAS.map((e, i) => [ROTULO_ETAPA[e], i]))

export interface ItemProdutividade {
  chave: string
  indice: number
  producao: number
  hh: number
}

/** Ranking de produtividade (maior primeiro) na unidade pedida; grupos sem HH vinculado ficam de fora. */
export function rankingProdutividade(linhas: LinhaProducao[], d: Dimensao, u: Unidade): ItemProdutividade[] {
  return agrupar(
    linhas.filter((l) => l.unidade === u),
    d,
  )
    .map((g) => {
      const indice = produtividade(g.totais, u)
      return { chave: g.chave, indice, producao: u === 'm2' ? g.totais.m2ComHh : g.totais.kgComHh, hh: u === 'm2' ? g.totais.hhM2 : g.totais.hhKg }
    })
    .filter((i): i is ItemProdutividade => i.indice != null)
    .sort((a, b) => b.indice - a.indice)
}

/** Contagem por situação de reconciliação na granularidade da view (TAG × OM × disciplina × data). */
export function contagemSituacao(linhas: LinhaProducao[]): Record<Situacao, number> {
  const chaves: Record<Situacao, Set<string>> = { 'Produção com RDC': new Set(), 'Produção sem RDC': new Set(), 'RDC sem produção': new Set() }
  for (const l of linhas) chaves[l.situacao].add(`${l.tag}|${l.om}|${l.disciplina}|${l.data}`)
  return { 'Produção com RDC': chaves['Produção com RDC'].size, 'Produção sem RDC': chaves['Produção sem RDC'].size, 'RDC sem produção': chaves['RDC sem produção'].size }
}

// ---------------------------------------------------------------------------
// Produtividade diária
// ---------------------------------------------------------------------------
export interface PontoDiario {
  /**
   * Produção ÷ HH do dia. Sem produção com HH vinculado: null, ou 0 quando o período é
   * preenchido dia a dia (ver `vazio`).
   */
  indice: number | null
  producao: number
  hh: number
  /** Dia sem produção com HH nessa série: o 0 é preenchimento para a linha seguir contínua, não medição. */
  vazio: boolean
}

export interface ProdutividadeDiaria {
  /** Dias (AAAA-MM-DD) do eixo, em ordem. */
  dias: string[]
  total: PontoDiario[]
  /** Séries da dimensão, da que tem mais HH para a que tem menos; null sem quebra. */
  series: Array<{ chave: string; hh: number; pontos: PontoDiario[] }> | null
}

function ponto(t: Totais | null, u: Unidade, preencher: boolean): PontoDiario {
  const indice = t ? produtividade(t, u) : null
  if (!t || indice == null) return { indice: preencher ? 0 : null, producao: 0, hh: 0, vazio: true }
  return { indice, producao: u === 'm2' ? t.m2ComHh : t.kgComHh, hh: u === 'm2' ? t.hhM2 : t.hhKg, vazio: false }
}

/**
 * Produtividade dia a dia na unidade pedida, total e (opcionalmente) quebrada por dimensão.
 * Mesmas regras do índice do período: só registros com produção e HH; por etapa, o HH do dia
 * se repete em cada etapa executada naquele dia.
 *
 * Com `periodo` (lista de dias), o eixo tem sempre todos esses dias, com ou sem dado — decisão
 * do usuário (2026-10-14): o eixo respeita o filtro. Dia até `limite` sem produção com HH entra
 * como 0 com `vazio: true` (a linha fica contínua; a tela marca o ponto de forma distinta); dia
 * depois de `limite` sem dado fica null (ainda não aconteceu). Sem `periodo`, só entram os dias
 * com dado.
 */
export function produtividadeDiaria(
  linhas: LinhaProducao[],
  d: Dimensao | null,
  u: Unidade,
  periodo?: string[],
  limite?: string,
): ProdutividadeDiaria {
  const daUnidade = linhas.filter((l) => l.unidade === u && l.data)
  const porDia = new Map<string, LinhaProducao[]>()
  for (const l of daUnidade) {
    const dia = l.data!.slice(0, 10)
    porDia.set(dia, [...(porDia.get(dia) ?? []), l])
  }
  const preencher = periodo != null
  const comDado = [...porDia.keys()].filter((dia) => produtividade(totalizar(porDia.get(dia)!), u) != null)
  const dias = preencher ? [...periodo].sort() : comDado.sort()
  const preencherDia = (dia: string) => preencher && (limite == null || dia <= limite)
  const total = dias.map((dia) => ponto(porDia.has(dia) ? totalizar(porDia.get(dia)!) : null, u, preencherDia(dia)))
  if (!d) return { dias, total, series: null }

  const series = agrupar(daUnidade, d)
    .map((g) => ({ chave: g.chave, hh: u === 'm2' ? g.totais.hhM2 : g.totais.hhKg }))
    .filter((g) => g.hh > 0)
    .sort((a, b) => b.hh - a.hh)
    .map(({ chave, hh }) => ({
      chave,
      hh,
      pontos: dias.map((dia) => {
        const g = porDia.has(dia) ? agrupar(porDia.get(dia)!, d).find((x) => x.chave === chave) : undefined
        return ponto(g ? g.totais : null, u, preencherDia(dia))
      }),
    }))
  return { dias, total, series }
}
