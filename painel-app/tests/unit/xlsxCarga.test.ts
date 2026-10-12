import * as XLSX from 'xlsx'
import { describe, expect, it } from 'vitest'
import { lerArquivo } from '../../src/domain/xlsxCarga'

/**
 * Monta uma planilha MC_PAC mínima no mesmo layout esperado por
 * painel-carga.js: rótulos em A1..A4, cabeçalho de colunas na linha 9,
 * dados a partir da linha 10. Espelha o papel do planilha_mc() do teste
 * Python antigo (tests/test_painel.py), agora em TS/xlsx.
 */
function montarPlanilhaMcPac(): File {
  const linhas = [
    ['Contrato', 'ROTINA'],
    ['Ativo', 'TAG-TESTE'],
    ['Início', new Date(2026, 8, 21)],
    ['Término', new Date(2026, 9, 20)],
    [],
    [],
    [],
    [],
    ['Item', 'Descrição', 'Prev', 'Exec (%)', 'Observação', 'LAV', 'JAT_1', 'Data', 'LAV', 'JAT_1'],
    [1, 'Viga X', 100, 0.5, null, new Date(2026, 8, 25), null, new Date(2026, 8, 25), 10, 5],
  ]
  const ws = XLSX.utils.aoa_to_sheet(linhas, { cellDates: true })
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'MC_PAC')
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  return new File([buf], 'planilha-teste.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

describe('lerArquivo (porte de painel-carga.js)', () => {
  it('lê contrato/ativo/período e os itens com as etapas por data', async () => {
    const file = montarPlanilhaMcPac()
    const { folhas, ignoradas } = await lerArquivo(file, 'planilha-teste.xlsx', new Map())

    expect(ignoradas).toEqual([])
    expect(folhas).toHaveLength(1)
    const folha = folhas[0]
    expect(folha.aba).toBe('MC_PAC')
    expect(folha.disciplina).toBe('PAC')
    expect(folha.unidade).toBe('m2')
    expect(folha.contrato).toBe('ROTINA')
    expect(folha.contrato_codigo).toBe('5900108690')
    expect(folha.ativo).toBe('TAG-TESTE')
    expect(folha.periodo_ini).toBe('2026-09-21')
    expect(folha.periodo_fim).toBe('2026-10-20')

    expect(folha.itens).toHaveLength(1)
    const item = folha.itens[0]
    expect(item.descricao).toBe('Viga X')
    expect(item.prev).toBe(100)
    expect(item.exec_pct).toBe(0.5)
    expect(item.etapas).toEqual({ LAV: '2026-09-25' })

    expect(folha.diario).toEqual([
      { data: '2026-09-25', etapa: 'LAV', valor: 10 },
      { data: '2026-09-25', etapa: 'JAT_1', valor: 5 },
    ])
  })

  it('ignora abas sem contrato/ativo preenchidos', async () => {
    const linhas = [
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      ['Item', 'Descrição', 'Prev', 'Exec (%)'],
      [1, 'Viga Y', 10, 0.1],
    ]
    const ws = XLSX.utils.aoa_to_sheet(linhas)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'MC_PAC')
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
    const file = new File([buf], 'vazia.xlsx')

    const { folhas, ignoradas } = await lerArquivo(file, 'vazia.xlsx', new Map())
    expect(folhas).toEqual([])
    expect(ignoradas).toEqual([{ chave: 'vazia.xlsx|MC_PAC', motivo: 'aba sem contrato/ativo (modelo vazio)' }])
  })
})
