import { describe, expect, it } from 'vitest'
import type { ProducaoRespRow } from '../../src/api/schemas'
import { linhasSemPreco, porSituacao, quantidadeEtapas, totalFinanceiro } from '../../src/domain/producao'

function linha(parcial: Partial<ProducaoRespRow>): ProducaoRespRow {
  return {
    responsavel: 'Fulano',
    tag: 'TAG-1',
    data: '2026-10-01',
    om: 'OM-1',
    disciplina: 'PAC',
    situacao: 'Produção com RDC',
    unidade: 'm2',
    lav: null,
    slv: null,
    st2: null,
    st3: null,
    jat_1: null,
    jat_2: null,
    prm_c5: null,
    a05: null,
    f22: null,
    a06: null,
    fab: null,
    desm: null,
    mont: null,
    valor: null,
    etapas_sem_preco: null,
    participacao: 1,
    horas: 8,
    homem_hora: 8,
    ...parcial,
  }
}

describe('porSituacao', () => {
  it('separa nas 3 situações sem perder linhas', () => {
    const linhas = [
      linha({ situacao: 'Produção com RDC' }),
      linha({ situacao: 'Produção sem RDC' }),
      linha({ situacao: 'RDC sem produção' }),
      linha({ situacao: 'RDC sem produção' }),
    ]
    const agrupado = porSituacao(linhas)
    expect(agrupado['Produção com RDC']).toHaveLength(1)
    expect(agrupado['Produção sem RDC']).toHaveLength(1)
    expect(agrupado['RDC sem produção']).toHaveLength(2)
  })
})

describe('linhasSemPreco / totalFinanceiro', () => {
  it('nunca omite a lacuna de preço do total — ela fica de fora, não zerada escondida', () => {
    const linhas = [linha({ valor: 100 }), linha({ valor: null, etapas_sem_preco: 'JAT_2' })]
    expect(totalFinanceiro(linhas)).toBe(100)
    expect(linhasSemPreco(linhas)).toHaveLength(1)
    expect(linhasSemPreco(linhas)[0].etapas_sem_preco).toBe('JAT_2')
  })
})

describe('quantidadeEtapas', () => {
  it('soma só as etapas preenchidas, nunca mistura unidades diferentes implicitamente', () => {
    expect(quantidadeEtapas(linha({ lav: 10, jat_1: 5, fab: null }))).toBe(15)
  })
})
