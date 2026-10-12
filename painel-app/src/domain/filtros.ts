/**
 * Filtros globais secundários (tudo além do período) — aplicados em memória
 * sobre o resultado já carregado de rdc_admin_exportar, sem nova chamada de
 * rede (mesmo modelo do painel.html atual, ver INFORMATION_ARCHITECTURE.md).
 */
import type { AtividadeRow, FotoRow, ImpactoRow, RdcRow, StatusRdc } from '../api/schemas'

export interface FiltrosSecundarios {
  area?: string
  responsavel?: string
  disciplina?: string
  contrato?: string
  status?: StatusRdc
  busca?: string
}

export interface Recorte {
  rdcs: RdcRow[]
  atividades: AtividadeRow[]
  impactos: ImpactoRow[]
  fotos: FotoRow[]
}

function normaliza(v: string): string {
  return v.toLowerCase().trim()
}

function casaBusca(r: RdcRow, busca: string): boolean {
  const alvo = normaliza(busca)
  return [r.codigo, r.om, r.ativo, r.ativo_descricao, r.responsavel, r.contrato, r.contrato_nome]
    .filter((v): v is string => !!v)
    .some((v) => normaliza(v).includes(alvo))
}

export function filtrar(dados: Recorte, filtros: FiltrosSecundarios): Recorte {
  const rdcs = dados.rdcs.filter((r) => {
    if (filtros.area && r.area !== filtros.area) return false
    if (filtros.responsavel && r.responsavel !== filtros.responsavel) return false
    if (filtros.contrato && r.contrato !== filtros.contrato) return false
    if (filtros.status && r.status !== filtros.status) return false
    if (filtros.busca && !casaBusca(r, filtros.busca)) return false
    return true
  })
  const codigos = new Set(rdcs.map((r) => r.codigo))
  const atividades = dados.atividades.filter((a) => codigos.has(a.rdc) && (!filtros.disciplina || a.disciplina === filtros.disciplina))
  const impactos = dados.impactos.filter((i) => codigos.has(i.rdc))
  const fotos = dados.fotos.filter((f) => codigos.has(f.rdc))
  return { rdcs, atividades, impactos, fotos }
}

export function valoresUnicos<T extends string | null>(rdcs: RdcRow[], campo: (r: RdcRow) => T): string[] {
  const vistos = new Set<string>()
  for (const r of rdcs) {
    const v = campo(r)
    if (v) vistos.add(v)
  }
  return [...vistos].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}
