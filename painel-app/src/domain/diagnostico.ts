/**
 * Agregações dos visuais de diagnóstico (protótipo Stitch "Painel Executivo")
 * sobre os dados reais do recorte. Mesmas fórmulas de hh.ts; nenhuma meta,
 * SLA ou classificação de desempenho — não existem no banco (BUSINESS_MODEL.md).
 */
import type { AtividadeRow, FotoRow, ImpactoRow, RdcRow } from '../api/schemas'

const hhDe = (a: AtividadeRow) => (a.efetivo_total * a.duracao_min) / 60

function hhAtividadesPorRdc(atividades: AtividadeRow[]): Map<string, number> {
  const mapa = new Map<string, number>()
  for (const a of atividades) mapa.set(a.rdc, (mapa.get(a.rdc) ?? 0) + hhDe(a))
  return mapa
}

export interface HhDia {
  data: string
  hhTrabalhado: number
  hhImpacto: number
  rdcs: number
}

/** HH trabalhado e HH de impacto por data do RDC. Só dias com RDC aparecem (dia sem registro não é zero). */
export function hhPorDia(rdcs: RdcRow[], atividades: AtividadeRow[]): HhDia[] {
  const hhRdc = hhAtividadesPorRdc(atividades)
  const porDia = new Map<string, HhDia>()
  for (const r of rdcs) {
    const atual = porDia.get(r.data_rdc) ?? { data: r.data_rdc, hhTrabalhado: 0, hhImpacto: 0, rdcs: 0 }
    atual.hhTrabalhado += hhRdc.get(r.codigo) ?? 0
    atual.hhImpacto += r.hh_impacto_min / 60
    atual.rdcs++
    porDia.set(r.data_rdc, atual)
  }
  return [...porDia.values()].sort((a, b) => a.data.localeCompare(b.data))
}

/** HH de ANDAIME por tipo (Apoiado/Suspenso/Balanço). Atividade sem tipo fica em "Sem tipo informado". */
export function hhAndaimePorTipo(atividades: AtividadeRow[]): Array<[string, number]> {
  const mapa = new Map<string, number>()
  for (const a of atividades) {
    if (a.disciplina !== 'ANDAIME') continue
    const tipo = a.tipo_andaime?.trim() || 'Sem tipo informado'
    mapa.set(tipo, (mapa.get(tipo) ?? 0) + hhDe(a))
  }
  return [...mapa.entries()].sort((a, b) => b[1] - a[1])
}

export interface ItemPareto {
  descricao: string
  horas: number
  ocorrencias: number
  /** Percentual acumulado (0–100) até este item, na ordem decrescente de horas. */
  acumulado: number
}

/**
 * Pareto do tempo de impacto pelo tipo informado no RDC. O app mobile grava o
 * tipo da lista (TIPOS_IMPACTO) ou "OUTROS — texto livre"; todo OUTROS vira uma
 * barra só. RDC anterior à lista tem texto livre: agrupa ignorando maiúsculas e
 * espaços extras e exibe a grafia mais frequente. Acima de `limite` causas, o
 * restante vira "Demais causas".
 */
export function paretoImpactos(impactos: ImpactoRow[], limite = 8): ItemPareto[] {
  const grupos = new Map<string, { horas: number; ocorrencias: number; grafias: Map<string, number> }>()
  for (const i of impactos) {
    const livre = i.descricao.trim().replace(/\s+/g, ' ') || 'Sem descrição'
    const texto = /^OUTROS\s*[—–-]/.test(livre) ? 'OUTROS' : livre
    const chave = texto.toLocaleLowerCase('pt-BR')
    const g = grupos.get(chave) ?? { horas: 0, ocorrencias: 0, grafias: new Map() }
    g.horas += i.duracao_min / 60
    g.ocorrencias++
    g.grafias.set(texto, (g.grafias.get(texto) ?? 0) + 1)
    grupos.set(chave, g)
  }
  let itens = [...grupos.values()]
    .map((g) => ({
      descricao: [...g.grafias.entries()].sort((a, b) => b[1] - a[1])[0][0],
      horas: g.horas,
      ocorrencias: g.ocorrencias,
    }))
    .filter((g) => g.horas > 0)
    .sort((a, b) => b.horas - a.horas || a.descricao.localeCompare(b.descricao, 'pt-BR'))
  if (itens.length > limite) {
    const resto = itens.slice(limite - 1)
    itens = [
      ...itens.slice(0, limite - 1),
      { descricao: 'Demais causas', horas: resto.reduce((s, x) => s + x.horas, 0), ocorrencias: resto.reduce((s, x) => s + x.ocorrencias, 0) },
    ]
  }
  const total = itens.reduce((s, x) => s + x.horas, 0)
  let soma = 0
  return itens.map((x) => {
    soma += x.horas
    return { ...x, acumulado: total > 0 ? (soma / total) * 100 : 0 }
  })
}

export interface EsperaArea {
  area: string
  mediaMin: number
  /** Maior espera da área, em minutos (comparada à META_ESPERA_PTS_MIN). */
  maxMin: number
  comEspera: number
}

/** Média da espera de PTS por área, só com RDC que têm PTS e os dois horários (mesma regra de esperaPts). */
export function esperaPtsPorArea(rdcs: RdcRow[]): EsperaArea[] {
  const mapa = new Map<string, number[]>()
  for (const r of rdcs) {
    if (!r.pts || r.espera_pts_min == null) continue
    const area = r.area?.trim() || 'Sem área informada'
    mapa.set(area, [...(mapa.get(area) ?? []), r.espera_pts_min])
  }
  return [...mapa.entries()]
    .map(([area, esperas]) => ({
      area,
      mediaMin: esperas.reduce((a, b) => a + b, 0) / esperas.length,
      maxMin: Math.max(...esperas),
      comEspera: esperas.length,
    }))
    .sort((a, b) => b.mediaMin - a.mediaMin)
}

export interface LinhaRanking {
  responsavel: string
  rdcs: number
  /** Área com mais RDC do responsável (empate: ordem alfabética); null se nenhum RDC tem área. */
  areaPrincipal: string | null
  /** Média do maior efetivo de cada RDC. */
  efetivoMedio: number
  hhTrabalhado: number
  hhImpacto: number
}

/** Tabela por responsável, ordenada pelo HH trabalhado — sem classificação de desempenho. */
export function rankingResponsaveis(rdcs: RdcRow[], atividades: AtividadeRow[]): LinhaRanking[] {
  const hhRdc = hhAtividadesPorRdc(atividades)
  const grupos = new Map<string, RdcRow[]>()
  for (const r of rdcs) grupos.set(r.responsavel, [...(grupos.get(r.responsavel) ?? []), r])
  return [...grupos.entries()]
    .map(([responsavel, lista]) => {
      const areas = new Map<string, number>()
      for (const r of lista) if (r.area) areas.set(r.area, (areas.get(r.area) ?? 0) + 1)
      const areaPrincipal = [...areas.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'))[0]?.[0] ?? null
      return {
        responsavel,
        rdcs: lista.length,
        areaPrincipal,
        efetivoMedio: lista.reduce((s, r) => s + r.efetivo_max, 0) / lista.length,
        hhTrabalhado: lista.reduce((s, r) => s + (hhRdc.get(r.codigo) ?? 0), 0),
        hhImpacto: lista.reduce((s, r) => s + r.hh_impacto_min / 60, 0),
      }
    })
    .sort((a, b) => b.hhTrabalhado - a.hhTrabalhado || a.responsavel.localeCompare(b.responsavel, 'pt-BR'))
}

/** Disciplinas distintas de cada RDC, na ordem das atividades. */
export function disciplinasPorRdc(atividades: AtividadeRow[]): Map<string, string[]> {
  const mapa = new Map<string, string[]>()
  for (const a of [...atividades].sort((x, y) => x.ordem - y.ordem)) {
    const lista = mapa.get(a.rdc) ?? []
    if (!lista.includes(a.disciplina)) lista.push(a.disciplina)
    mapa.set(a.rdc, lista)
  }
  return mapa
}

/** Fotos por RDC e quantas têm coordenada (latitude e longitude). */
export function fotosPorRdc(fotos: FotoRow[]): Map<string, { total: number; comGps: number }> {
  const mapa = new Map<string, { total: number; comGps: number }>()
  for (const f of fotos) {
    const atual = mapa.get(f.rdc) ?? { total: 0, comGps: 0 }
    atual.total++
    if (f.latitude != null && f.longitude != null) atual.comGps++
    mapa.set(f.rdc, atual)
  }
  return mapa
}

/** Contagem de RDC por status, na ordem do ciclo. */
export function rdcsPorStatus(rdcs: RdcRow[]): Array<[RdcRow['status'], number]> {
  const ordem: RdcRow['status'][] = ['Rascunho', 'Enviado', 'Em revisão', 'Validado', 'Substituído', 'Cancelado']
  const mapa = new Map<RdcRow['status'], number>()
  for (const r of rdcs) mapa.set(r.status, (mapa.get(r.status) ?? 0) + 1)
  return ordem.filter((s) => mapa.has(s)).map((s) => [s, mapa.get(s)!])
}
