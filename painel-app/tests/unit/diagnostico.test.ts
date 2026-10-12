import { describe, expect, it } from 'vitest'
import type { AtividadeRow, FotoRow, ImpactoRow, RdcRow } from '../../src/api/schemas'
import {
  disciplinasPorRdc,
  esperaPtsPorArea,
  fotosPorRdc,
  hhAndaimePorTipo,
  hhPorDia,
  paretoImpactos,
  rankingResponsaveis,
  rdcsPorStatus,
} from '../../src/domain/diagnostico'

function atividade(parcial: Partial<AtividadeRow>): AtividadeRow {
  return {
    codigo: 'A01',
    rdc: 'RDC-1',
    ordem: 1,
    disciplina: 'PAC',
    servico: 'Pintura',
    tipo_andaime: null,
    descricao_outros: null,
    observacao: null,
    inicio: '2026-10-01T08:00:00Z',
    fim: '2026-10-01T12:00:00Z',
    duracao_min: 240,
    qtd_ajudante: 0,
    qtd_pintor: 2,
    qtd_jatista: 0,
    qtd_mecanico: 0,
    qtd_montador_andaime: 0,
    qtd_alpinista_n1: 0,
    qtd_soldador: 0,
    efetivo_total: 2,
    ...parcial,
  }
}

function rdc(parcial: Partial<RdcRow>): RdcRow {
  return {
    codigo: 'RDC-1',
    data_rdc: '2026-10-01',
    responsavel: 'Fulano',
    responsavel_funcao: null,
    area: null,
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
    min_atividades: 240,
    hh_min: 480,
    efetivo_max: 2,
    min_impacto: 0,
    hh_impacto_min: 0,
    ...parcial,
  }
}

function impacto(descricao: string, duracao_min: number, rdcCodigo = 'RDC-1'): ImpactoRow {
  return { codigo: `I-${descricao}-${duracao_min}`, rdc: rdcCodigo, ordem: 1, descricao, inicio: '', fim: '', duracao_min }
}

function foto(parcial: Partial<FotoRow>): FotoRow {
  return { codigo: 'F1', rdc: 'RDC-1', atividade: 'A01', caminho: 'x.jpg', data_hora_foto: null, latitude: null, longitude: null, precisao_m: null, gps_fonte: null, ...parcial }
}

describe('hhPorDia', () => {
  it('agrupa HH trabalhado e de impacto pela data do RDC, só dias com registro', () => {
    const rdcs = [
      rdc({ codigo: 'R1', data_rdc: '2026-10-02', hh_impacto_min: 60 }),
      rdc({ codigo: 'R2', data_rdc: '2026-10-01', hh_impacto_min: 0 }),
      rdc({ codigo: 'R3', data_rdc: '2026-10-02', hh_impacto_min: 30 }),
    ]
    const atividades = [
      atividade({ rdc: 'R1', efetivo_total: 2, duracao_min: 60 }),
      atividade({ rdc: 'R3', efetivo_total: 1, duracao_min: 120 }),
      atividade({ rdc: 'R2', efetivo_total: 3, duracao_min: 60 }),
    ]
    expect(hhPorDia(rdcs, atividades)).toEqual([
      { data: '2026-10-01', hhTrabalhado: 3, hhImpacto: 0, rdcs: 1 },
      { data: '2026-10-02', hhTrabalhado: 4, hhImpacto: 1.5, rdcs: 2 },
    ])
  })
})

describe('hhAndaimePorTipo', () => {
  it('só considera ANDAIME e separa atividade sem tipo', () => {
    const atividades = [
      atividade({ disciplina: 'ANDAIME', tipo_andaime: 'APOIADO', efetivo_total: 2, duracao_min: 60 }),
      atividade({ disciplina: 'ANDAIME', tipo_andaime: null, efetivo_total: 1, duracao_min: 60 }),
      atividade({ disciplina: 'PAC', tipo_andaime: 'SUSPENSO', efetivo_total: 5, duracao_min: 60 }),
    ]
    expect(hhAndaimePorTipo(atividades)).toEqual([
      ['APOIADO', 2],
      ['Sem tipo informado', 1],
    ])
  })
})

describe('paretoImpactos', () => {
  it('agrupa descrições iguais ignorando caixa/espaços e acumula o percentual', () => {
    const itens = paretoImpactos([impacto('Chuva', 60), impacto(' chuva ', 60), impacto('Aguardando PTS', 120), impacto('Vento', 60)])
    expect(itens.map((i) => [i.descricao, i.horas, i.ocorrencias])).toEqual([
      ['Aguardando PTS', 2, 1],
      ['Chuva', 2, 2],
      ['Vento', 1, 1],
    ])
    expect(itens.map((i) => i.acumulado)).toEqual([40, 80, 100])
  })

  it('junta o excedente em "Outros" mantendo o total', () => {
    const itens = paretoImpactos([impacto('A', 50), impacto('B', 40), impacto('C', 30), impacto('D', 20)], 3)
    expect(itens.map((i) => [i.descricao, Math.round(i.horas * 60)])).toEqual([
      ['A', 50],
      ['B', 40],
      ['Outros', 50],
    ])
    expect(itens[2].acumulado).toBe(100)
  })

  it('sem impactos devolve lista vazia', () => {
    expect(paretoImpactos([])).toEqual([])
  })
})

describe('esperaPtsPorArea', () => {
  it('usa só RDC com PTS e espera informada; sem PTS não vira zero', () => {
    const rdcs = [
      rdc({ area: 'Forno', pts: true, espera_pts_min: 40 }),
      rdc({ area: 'Forno', pts: true, espera_pts_min: 20 }),
      rdc({ area: 'Forno', pts: false, espera_pts_min: null }),
      rdc({ area: 'Pátio', pts: true, espera_pts_min: null }),
      rdc({ area: null, pts: true, espera_pts_min: 50 }),
    ]
    expect(esperaPtsPorArea(rdcs)).toEqual([
      { area: 'Sem área informada', mediaMin: 50, comEspera: 1 },
      { area: 'Forno', mediaMin: 30, comEspera: 2 },
    ])
  })
})

describe('rankingResponsaveis', () => {
  it('soma HH, média de efetivo e área mais frequente por responsável', () => {
    const rdcs = [
      rdc({ codigo: 'R1', responsavel: 'Ana', area: 'Forno', efetivo_max: 4, hh_impacto_min: 60 }),
      rdc({ codigo: 'R2', responsavel: 'Ana', area: 'Forno', efetivo_max: 2 }),
      rdc({ codigo: 'R3', responsavel: 'Ana', area: 'Pátio', efetivo_max: 3 }),
      rdc({ codigo: 'R4', responsavel: 'Bia', area: null, efetivo_max: 1 }),
    ]
    const atividades = [atividade({ rdc: 'R1', efetivo_total: 4, duracao_min: 60 }), atividade({ rdc: 'R4', efetivo_total: 1, duracao_min: 600 })]
    expect(rankingResponsaveis(rdcs, atividades)).toEqual([
      { responsavel: 'Bia', rdcs: 1, areaPrincipal: null, efetivoMedio: 1, hhTrabalhado: 10, hhImpacto: 0 },
      { responsavel: 'Ana', rdcs: 3, areaPrincipal: 'Forno', efetivoMedio: 3, hhTrabalhado: 4, hhImpacto: 1 },
    ])
  })
})

describe('detalhes por RDC', () => {
  it('lista disciplinas distintas na ordem das atividades', () => {
    const atividades = [
      atividade({ rdc: 'R1', ordem: 2, disciplina: 'PAC' }),
      atividade({ rdc: 'R1', ordem: 1, disciplina: 'ANDAIME' }),
      atividade({ rdc: 'R1', ordem: 3, disciplina: 'PAC' }),
    ]
    expect(disciplinasPorRdc(atividades).get('R1')).toEqual(['ANDAIME', 'PAC'])
  })

  it('conta fotos e as que têm coordenada', () => {
    const mapa = fotosPorRdc([foto({ latitude: -2.5, longitude: -44.3 }), foto({ latitude: -2.5, longitude: null }), foto({})])
    expect(mapa.get('RDC-1')).toEqual({ total: 3, comGps: 1 })
  })

  it('conta RDC por status na ordem do ciclo', () => {
    const rdcs = [rdc({ status: 'Validado' }), rdc({ status: 'Enviado' }), rdc({ status: 'Validado' })]
    expect(rdcsPorStatus(rdcs)).toEqual([
      ['Enviado', 1],
      ['Validado', 2],
    ])
  })
})
