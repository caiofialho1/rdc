import { describe, expect, it } from 'vitest'
import type { AtividadeRow, RdcRow } from '../../src/api/schemas'
import { SEM_FUNCAO, histogramaPorFuncao } from '../../src/domain/histogramaFuncoes'

const atv = (rdc: string, campos: Partial<AtividadeRow>): AtividadeRow => ({
  codigo: `${rdc}-A`,
  rdc,
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
  qtd_pintor: 0,
  qtd_jatista: 0,
  qtd_mecanico: 0,
  qtd_montador_andaime: 0,
  qtd_alpinista_n1: 0,
  qtd_soldador: 0,
  efetivo_total: 0,
  ...campos,
})
const rdc = (codigo: string, data_rdc: string, responsavel: string) => ({ codigo, data_rdc, responsavel }) as RdcRow
const dias = ['2026-10-01', '2026-10-02', '2026-10-03']
const pintor = (h: ReturnType<typeof histogramaPorFuncao>) => h.series.find((s) => s.funcao === 'Pintor')!

describe('histogramaPorFuncao', () => {
  const rdcs = [rdc('R1', '2026-10-01', 'Ana'), rdc('R2', '2026-10-01', 'Ana'), rdc('R3', '2026-10-01', 'Bia'), rdc('R4', '2026-10-03', 'Bia')]
  const atividades = [
    atv('R1', { qtd_pintor: 3, efetivo_total: 3 }),
    atv('R1', { qtd_pintor: 2, efetivo_total: 2, duracao_min: 120 }),
    atv('R2', { qtd_pintor: 4, efetivo_total: 4, duracao_min: 60 }),
    atv('R3', { qtd_pintor: 1, efetivo_total: 1 }),
    atv('R4', { qtd_ajudante: 2, efetivo_total: 2 }),
  ]

  it('efetivo: pico do RDC, maior entre os RDC do mesmo responsável no dia, soma entre responsáveis', () => {
    const h = histogramaPorFuncao(rdcs, atividades, dias, 'efetivo')
    // Ana: max(3, 4) = 4 · Bia: 1 → 5
    expect(pintor(h).valores).toEqual([5, null, 0])
    expect(pintor(h).total).toBe(5)
    expect(pintor(h).pico).toBe(0)
  })

  it('HH soma todas as atividades do dia', () => {
    const h = histogramaPorFuncao(rdcs, atividades, dias, 'hh')
    // 3×4 + 2×2 + 4×1 + 1×4 = 24
    expect(pintor(h).valores).toEqual([24, null, 0])
    expect(pintor(h).total).toBe(24)
    expect(pintor(h).media).toBe(12)
  })

  it('dia sem RDC fica null e conta só os dias com RDC', () => {
    const h = histogramaPorFuncao(rdcs, atividades, dias, 'efetivo')
    expect(h.diasComRdc).toBe(2)
    expect(h.series.find((s) => s.funcao === 'Ajudante')!.valores).toEqual([0, null, 2])
  })

  it('"Sem função informada" só aparece quando há efetivo sem discriminação', () => {
    expect(histogramaPorFuncao(rdcs, atividades, dias, 'efetivo').series.some((s) => s.funcao === SEM_FUNCAO)).toBe(false)
    const h = histogramaPorFuncao([rdc('R9', '2026-10-02', 'Caio')], [atv('R9', { qtd_pintor: 1, efetivo_total: 4 })], dias, 'efetivo')
    expect(h.series.find((s) => s.funcao === SEM_FUNCAO)!.valores).toEqual([null, 3, null])
  })
})
