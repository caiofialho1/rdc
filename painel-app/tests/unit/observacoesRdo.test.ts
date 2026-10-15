import { describe, expect, it } from 'vitest'
import type { AtividadeRow, ImpactoRow, RdcRow } from '../../src/api/schemas'
import { duracaoCurta, observacoesRdo, quebrar, rotuloImpacto } from '../../src/domain/observacoesRdo'

// Horários sem "Z": lidos como hora local, para o teste não depender do fuso da máquina.
function rdc(p: Partial<RdcRow>): RdcRow {
  return {
    codigo: 'RDC-1', data_rdc: '2026-09-21', responsavel: 'Carlos Magno', responsavel_funcao: null, area: '851K', ativo: 'PO_851K_FO',
    ativo_descricao: null, om: '202404834149', status: 'Validado', revisao: 0, revisao_de: null, substituido_por: null,
    recebido_em: '2026-09-21T09:45:40', enviado_por: null, validado_por: null, validado_em: null, obs_validacao: null,
    qtd_atividades: 1, qtd_impactos: 0, qtd_fotos: 0, pts: true, pts_solicitacao: '2026-09-21T08:34:18', pts_abertura: '2026-09-21T09:15:49',
    espera_pts_min: 41, bloqueio: false, bloqueio_ativo: null, bloqueio_hora: null, contrato: null, contrato_nome: null,
    editado_por: null, editado_em: null, min_atividades: 240, hh_min: 0, efetivo_max: 3, min_impacto: 0, hh_impacto_min: 0, ...p,
  }
}
function ativ(p: Partial<AtividadeRow>): AtividadeRow {
  return {
    codigo: 'RDC-1-A01', rdc: 'RDC-1', ordem: 1, disciplina: 'PAC', servico: 'JATO SA2 1/2', tipo_andaime: null, descricao_outros: null,
    observacao: null, inicio: '2026-09-21T09:20:00', fim: '2026-09-21T16:00:00', duracao_min: 400, qtd_ajudante: 1, qtd_pintor: 0,
    qtd_jatista: 2, qtd_mecanico: 0, qtd_montador_andaime: 0, qtd_alpinista_n1: 0, qtd_soldador: 0, efetivo_total: 3, ...p,
  }
}
const imp = (descricao: string, duracao_min: number): ImpactoRow => ({ codigo: 'I', rdc: 'RDC-1', ordem: 1, descricao, inicio: '', fim: '', duracao_min })

describe('formatos', () => {
  it('duração curta como no RDO', () => {
    expect(duracaoCurta(41)).toBe('41min')
    expect(duracaoCurta(177)).toBe('2h57min')
    expect(duracaoCurta(120)).toBe('2h')
  })
  it('rótulo do impacto', () => {
    expect(rotuloImpacto('LIBERAÇÃO DE PTS')).toBe('IMPACTO PTS')
    expect(rotuloImpacto('CHUVA')).toBe('IMPACTO CHUVA')
    expect(rotuloImpacto('IMPACTO VALE')).toBe('IMPACTO VALE')
    expect(rotuloImpacto('OUTROS — falta de energia')).toBe('IMPACTO OUTROS (falta de energia)')
  })
  it('quebra sem cortar palavras', () => {
    expect(quebrar('aa bb cc dd', 5)).toEqual(['aa bb', 'cc dd'])
  })
})

describe('observacoesRdo', () => {
  it('espera de PTS acima da meta vira IMPACTO PTS com a espera inteira', () => {
    const linhas = observacoesRdo({ rdcs: [rdc({})], atividades: [ativ({})], impactos: [], fotos: [] }, 1000)
    expect(linhas).toHaveLength(1)
    expect(linhas[0]).toMatchObject({
      Data: '21/09/2026', Hora: '09:45:40', Equipamento: 'PO_851K_FO', OM: '202404834149',
      Horario_Solicitacao: '08:34:18', Horario_Abertura: '09:15:49', Impacto: 'Sim — IMPACTO PTS',
    })
    expect(linhas[0].Descricao_Macro_RDO).toBe(
      'PTS: Solicitação às 08:34:18, Abertura às 09:15:49. Serviços: jato SA2 1/2. Executante: Carlos Magno. Efetivo: 1 ajudante + 2 jatistas. Impactos: sim — IMPACTO PTS (41min impactados).',
    )
  })

  it('espera dentro da meta e sem impacto registrado: "Não"', () => {
    const [l] = observacoesRdo({ rdcs: [rdc({ espera_pts_min: 12 })], atividades: [ativ({})], impactos: [], fotos: [] }, 1000)
    expect(l.Impacto).toBe('Não')
    expect(l.Descricao_Macro_RDO.endsWith('Impactos: não.')).toBe(true)
  })

  it('impacto de PTS registrado não é contado duas vezes; outros tipos somam por tipo', () => {
    const [l] = observacoesRdo(
      { rdcs: [rdc({})], atividades: [ativ({})], impactos: [imp('LIBERAÇÃO DE PTS', 30), imp('CHUVA', 20), imp('CHUVA', 25)], fotos: [] },
      1000,
    )
    expect(l.Impacto).toBe('Sim — IMPACTO PTS; IMPACTO CHUVA')
    expect(l.Descricao_Macro_RDO).toContain('IMPACTO PTS (30min impactados); IMPACTO CHUVA (45min impactados)')
  })

  it('texto longo continua em linhas "(cont.)" que repetem só Data, Equipamento e OM', () => {
    const linhas = observacoesRdo({ rdcs: [rdc({})], atividades: [ativ({ observacao: 'Jateamento nos andaimes do piso 05 (2 bicos) e piso 0 (1 bico), dia todo' })], impactos: [], fotos: [] }, 60)
    expect(linhas.length).toBeGreaterThan(1)
    expect(linhas[0].Descricao_Macro_RDO.endsWith(' (cont.)')).toBe(true)
    expect(linhas[1].Descricao_Macro_RDO.startsWith('(cont.) ')).toBe(true)
    expect(linhas[1]).toMatchObject({ Hora: '', Horario_Solicitacao: '', Horario_Abertura: '', Impacto: '', Equipamento: 'PO_851K_FO' })
    expect(linhas.every((l) => l.Descricao_Macro_RDO.replace(/^\(cont\.\) /, '').replace(/ \(cont\.\)$/, '').length <= 60)).toBe(true)
  })

  it('RDC cancelado ou substituído fica fora', () => {
    expect(observacoesRdo({ rdcs: [rdc({ status: 'Cancelado' }), rdc({ codigo: 'X', status: 'Substituído' })], atividades: [], impactos: [], fotos: [] })).toEqual([])
  })
})
