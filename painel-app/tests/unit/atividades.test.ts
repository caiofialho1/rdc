import { describe, expect, it } from 'vitest'
import type { AtividadeRow } from '../../src/api/schemas'
import { descricaoAtividade } from '../../src/domain/atividades'

const base: AtividadeRow = {
  codigo: 'RDC-X-A01',
  rdc: 'RDC-X',
  ordem: 1,
  disciplina: 'PAC',
  servico: 'ACABAMENTO PU',
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
}

describe('descricaoAtividade', () => {
  it('serviço do catálogo sem complementos não inventa descrição', () => {
    expect(descricaoAtividade(base)).toEqual({
      servico: 'ACABAMENTO PU',
      tipoAndaime: null,
      descricao: null,
      descricaoPendente: false,
      observacao: null,
    })
  })

  it('OUTROS traz o texto digitado e a observação aparada', () => {
    const d = descricaoAtividade({ ...base, servico: 'OUTROS', descricao_outros: '  Pintura de guarda-corpo  ', observacao: ' Área liberada às 9h ' })
    expect(d.descricao).toBe('Pintura de guarda-corpo')
    expect(d.observacao).toBe('Área liberada às 9h')
    expect(d.descricaoPendente).toBe(false)
  })

  it('OUTROS sem texto é pendência; espaços em branco contam como vazio', () => {
    expect(descricaoAtividade({ ...base, servico: 'OUTROS', descricao_outros: '   ' }).descricaoPendente).toBe(true)
    expect(descricaoAtividade({ ...base, observacao: '  ' }).observacao).toBeNull()
  })

  it('andaime mantém o tipo informado', () => {
    expect(descricaoAtividade({ ...base, disciplina: 'ANDAIME', servico: 'MONTAGEM DE ANDAIME', tipo_andaime: 'SUSPENSO' }).tipoAndaime).toBe('SUSPENSO')
  })
})
