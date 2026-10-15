import { describe, expect, it } from 'vitest'
import type { AtividadeRow } from '../../src/api/schemas'
import { funcoesDaAtividade, maoDeObraPorFuncao, semFuncao } from '../../src/domain/maoDeObra'

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
    qtd_pintor: 0,
    qtd_jatista: 0,
    qtd_mecanico: 0,
    qtd_montador_andaime: 0,
    qtd_alpinista_n1: 0,
    qtd_soldador: 0,
    efetivo_total: 0,
    ...parcial,
  }
}

describe('mão de obra por função', () => {
  it('lista só as funções com quantidade, na ordem padrão', () => {
    const a = atividade({ qtd_pintor: 3, qtd_ajudante: 2, efetivo_total: 5 })
    expect(funcoesDaAtividade(a)).toEqual([
      { funcao: 'Ajudante', qtd: 2 },
      { funcao: 'Pintor', qtd: 3 },
    ])
    expect(semFuncao(a)).toBe(0)
  })

  it('usa o pico por função (não soma atividades) e soma o HH', () => {
    const r = maoDeObraPorFuncao([
      atividade({ codigo: 'A01', qtd_pintor: 3, efetivo_total: 3, duracao_min: 120 }),
      atividade({ codigo: 'A02', qtd_pintor: 2, qtd_ajudante: 1, efetivo_total: 3, duracao_min: 60 }),
    ])
    expect(r.linhas.filter((l) => l.pico > 0)).toEqual([
      { funcao: 'Ajudante', pico: 1, hh: 1 },
      { funcao: 'Pintor', pico: 3, hh: 8 },
    ])
    expect(r.linhas).toHaveLength(7)
    expect(r.hhSemFuncao).toBe(0)
  })

  it('sinaliza efetivo sem função discriminada em vez de ratear', () => {
    const r = maoDeObraPorFuncao([atividade({ efetivo_total: 4, qtd_pintor: 1, duracao_min: 60 })])
    expect(r.linhas.filter((l) => l.pico > 0)).toEqual([{ funcao: 'Pintor', pico: 1, hh: 1 }])
    expect(r.picoSemFuncao).toBe(3)
    expect(r.hhSemFuncao).toBe(3)
  })

  it('lista sempre as 7 funções, zeradas quando não há efetivo', () => {
    const r = maoDeObraPorFuncao([atividade({})])
    expect(r.linhas.map((l) => l.funcao)).toEqual(['Ajudante', 'Pintor', 'Jatista', 'Mecânico', 'Montador de Andaime', 'Alpinista N1', 'Soldador'])
    expect(r.linhas.every((l) => l.pico === 0 && l.hh === 0)).toBe(true)
  })
})
