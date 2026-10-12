import { describe, expect, it } from 'vitest'
import type { AtividadeRow, RdcRow } from '../../src/api/schemas'
import { filtrar } from '../../src/domain/filtros'

function rdc(parcial: Partial<RdcRow>): RdcRow {
  return {
    codigo: 'RDC-1',
    data_rdc: '2026-10-01',
    responsavel: 'Fulano',
    responsavel_funcao: null,
    area: 'AREA-1',
    ativo: 'TAG-1',
    ativo_descricao: null,
    om: 'OM-1',
    status: 'Validado',
    revisao: 0,
    revisao_de: null,
    substituido_por: null,
    recebido_em: '2026-10-01T18:00:00Z',
    enviado_por: null,
    validado_por: null,
    validado_em: null,
    obs_validacao: null,
    qtd_atividades: 1,
    qtd_impactos: 0,
    qtd_fotos: 0,
    pts: null,
    pts_solicitacao: null,
    pts_abertura: null,
    espera_pts_min: null,
    bloqueio: null,
    bloqueio_ativo: null,
    bloqueio_hora: null,
    contrato: null,
    contrato_nome: null,
    editado_por: null,
    editado_em: null,
    min_atividades: 0,
    hh_min: 0,
    efetivo_max: 0,
    min_impacto: 0,
    hh_impacto_min: 0,
    ...parcial,
  }
}

function atividade(rdcCodigo: string, disciplina: AtividadeRow['disciplina']): AtividadeRow {
  return {
    codigo: `${rdcCodigo}-A01`,
    rdc: rdcCodigo,
    ordem: 1,
    disciplina,
    servico: 'Serviço',
    tipo_andaime: null,
    descricao_outros: null,
    observacao: null,
    inicio: '2026-10-01T08:00:00Z',
    fim: '2026-10-01T09:00:00Z',
    duracao_min: 60,
    qtd_ajudante: 0,
    qtd_pintor: 1,
    qtd_jatista: 0,
    qtd_mecanico: 0,
    qtd_montador_andaime: 0,
    qtd_alpinista_n1: 0,
    qtd_soldador: 0,
    efetivo_total: 1,
  }
}

describe('filtrar', () => {
  it('filtra RDC por área e corta atividades/impactos/fotos junto', () => {
    const dados = {
      rdcs: [rdc({ codigo: 'RDC-1', area: 'A' }), rdc({ codigo: 'RDC-2', area: 'B' })],
      atividades: [atividade('RDC-1', 'PAC'), atividade('RDC-2', 'REC')],
      impactos: [],
      fotos: [],
    }
    const recorte = filtrar(dados, { area: 'A' })
    expect(recorte.rdcs.map((r) => r.codigo)).toEqual(['RDC-1'])
    expect(recorte.atividades.map((a) => a.rdc)).toEqual(['RDC-1'])
  })

  it('filtro de disciplina só afeta atividades, não remove o RDC', () => {
    const dados = {
      rdcs: [rdc({ codigo: 'RDC-1' })],
      atividades: [atividade('RDC-1', 'PAC'), atividade('RDC-1', 'REC')],
      impactos: [],
      fotos: [],
    }
    const recorte = filtrar(dados, { disciplina: 'PAC' })
    expect(recorte.rdcs).toHaveLength(1)
    expect(recorte.atividades).toHaveLength(1)
    expect(recorte.atividades[0].disciplina).toBe('PAC')
  })

  it('busca casa por código, OM, ativo ou responsável', () => {
    const dados = {
      rdcs: [rdc({ codigo: 'RDC-1', om: 'OM-123', responsavel: 'Maria' }), rdc({ codigo: 'RDC-2', om: 'OM-999', responsavel: 'João' })],
      atividades: [],
      impactos: [],
      fotos: [],
    }
    expect(filtrar(dados, { busca: 'om-123' }).rdcs.map((r) => r.codigo)).toEqual(['RDC-1'])
    expect(filtrar(dados, { busca: 'joão' }).rdcs.map((r) => r.codigo)).toEqual(['RDC-2'])
  })
})
