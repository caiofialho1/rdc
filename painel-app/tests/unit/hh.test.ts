import { describe, expect, it } from 'vitest'
import type { AtividadeRow, ImpactoRow, RdcRow } from '../../src/api/schemas'
import {
  esperaPts,
  hhImpacto,
  hhImpactoRateadoPorDisciplina,
  hhTrabalhado,
  hhTrabalhadoPorDisciplina,
  mediaEsperaPts,
  tempoImpacto,
} from '../../src/domain/hh'

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

describe('hhTrabalhado', () => {
  it('soma efetivo x duração / 60', () => {
    const atividades = [atividade({ efetivo_total: 2, duracao_min: 240 }), atividade({ efetivo_total: 3, duracao_min: 120 })]
    expect(hhTrabalhado(atividades)).toBe(2 * 4 + 3 * 2)
  })

  it('agrupa por disciplina sem misturar', () => {
    const atividades = [
      atividade({ disciplina: 'PAC', efetivo_total: 2, duracao_min: 60 }),
      atividade({ disciplina: 'REC', efetivo_total: 1, duracao_min: 60 }),
    ]
    const porDisciplina = hhTrabalhadoPorDisciplina(atividades)
    expect(porDisciplina.get('PAC')).toBe(2)
    expect(porDisciplina.get('REC')).toBe(1)
  })
})

describe('hhImpacto', () => {
  it('converte hh_impacto_min (já calculado pela view) para horas', () => {
    expect(hhImpacto([rdc({ hh_impacto_min: 120 }), rdc({ hh_impacto_min: 60 })])).toBe(3)
  })
})

describe('hhImpactoRateadoPorDisciplina', () => {
  it('rateia pela participação da disciplina no HH trabalhado do RDC', () => {
    const r = rdc({ codigo: 'RDC-9', hh_impacto_min: 600 }) // 10h de impacto
    const atividades = [
      atividade({ rdc: 'RDC-9', disciplina: 'PAC', efetivo_total: 1, duracao_min: 60 }), // 1 HH
      atividade({ rdc: 'RDC-9', disciplina: 'REC', efetivo_total: 3, duracao_min: 60 }), // 3 HH
    ]
    // PAC é 1/4 do HH do RDC -> recebe 1/4 das 10h de impacto = 2.5h
    expect(hhImpactoRateadoPorDisciplina([r], atividades, 'PAC')).toBeCloseTo(2.5)
    expect(hhImpactoRateadoPorDisciplina([r], atividades, 'REC')).toBeCloseTo(7.5)
  })

  it('RDC sem atividade na disciplina não contribui', () => {
    const r = rdc({ codigo: 'RDC-9', hh_impacto_min: 600 })
    const atividades = [atividade({ rdc: 'RDC-9', disciplina: 'REC', efetivo_total: 1, duracao_min: 60 })]
    expect(hhImpactoRateadoPorDisciplina([r], atividades, 'ANDAIME')).toBe(0)
  })
})

describe('tempoImpacto', () => {
  it('soma durações mesmo quando os intervalos se sobrepõem (não deduplica)', () => {
    const impactos: ImpactoRow[] = [
      { codigo: 'I01', rdc: 'RDC-1', ordem: 1, descricao: 'Chuva', inicio: '2026-10-01T08:00:00Z', fim: '2026-10-01T09:00:00Z', duracao_min: 60 },
      { codigo: 'I02', rdc: 'RDC-1', ordem: 2, descricao: 'Bloqueio', inicio: '2026-10-01T08:30:00Z', fim: '2026-10-01T09:30:00Z', duracao_min: 60 },
    ]
    expect(tempoImpacto(impactos)).toBe(2)
  })
})

describe('esperaPts / mediaEsperaPts', () => {
  it('separa sem-PTS, PTS-sem-horário e espera calculada', () => {
    const rdcs = [
      rdc({ pts: false }),
      rdc({ pts: true, espera_pts_min: null }),
      rdc({ pts: true, espera_pts_min: 30 }),
      rdc({ pts: true, espera_pts_min: 90 }),
    ]
    const espera = esperaPts(rdcs)
    expect(espera.semPts).toBe(1)
    expect(espera.ptsSemHorario).toBe(1)
    expect(espera.comEspera).toEqual([0.5, 1.5])
    expect(mediaEsperaPts(espera)).toBe(1)
  })

  it('sem nenhum RDC com espera calculada, a média é null (não zero)', () => {
    expect(mediaEsperaPts(esperaPts([rdc({ pts: false })]))).toBeNull()
  })
})
