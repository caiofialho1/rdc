import { describe, expect, it } from 'vitest'
import type { AtividadeRow, ProducaoRespRow, RdcRow } from '../../src/api/schemas'
import {
  agrupar,
  contagemSituacao,
  enriquecer,
  filtrarProducao,
  omChave,
  produtividade,
  produtividadeDiaria,
  rankingProdutividade,
  tagChave,
  totalizar,
} from '../../src/domain/producaoAnalise'

const etapasNulas = { lav: null, slv: null, st2: null, st3: null, jat_1: null, jat_2: null, prm_c5: null, a05: null, f22: null, a06: null, fab: null, desm: null, mont: null }

function prod(p: Partial<ProducaoRespRow>): ProducaoRespRow {
  return {
    responsavel: 'Ana',
    tag: 'TR-05',
    data: '2026-10-01',
    om: '123',
    disciplina: 'PAC',
    situacao: 'Produção com RDC',
    unidade: 'm2',
    ...etapasNulas,
    valor: null,
    etapas_sem_preco: null,
    participacao: 1,
    horas: 4,
    homem_hora: 8,
    ...p,
  }
}

function rdc(p: Partial<RdcRow>): RdcRow {
  return {
    codigo: 'RDC-1',
    data_rdc: '2026-10-01',
    responsavel: 'Ana ',
    responsavel_funcao: null,
    area: '840K',
    ativo: 'TR-05 TRANSPORTADOR',
    ativo_descricao: 'Transportador 05',
    om: '123.0',
    status: 'Validado',
    revisao: 0,
    revisao_de: null,
    substituido_por: null,
    recebido_em: '2026-10-01T20:00:00Z',
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
    contrato: '5900108690',
    contrato_nome: 'ROTINA',
    editado_por: null,
    editado_em: null,
    min_atividades: 240,
    hh_min: 480,
    efetivo_max: 2,
    min_impacto: 0,
    hh_impacto_min: 0,
    ...p,
  }
}

const ativ = (rdcCodigo: string, disciplina: AtividadeRow['disciplina']) => ({ rdc: rdcCodigo, disciplina }) as AtividadeRow

describe('chaves SQL', () => {
  it('replica mc_tag_chave e mc_om_chave', () => {
    expect(tagChave('TR-05 (linha K)')).toBe('TR05')
    expect(tagChave('SL-01ZM')).toBe('SL01')
    expect(omChave('OM 123.0')).toBe('123')
    expect(omChave('')).toBeNull()
  })
})

describe('enriquecer', () => {
  it('traz contrato, área e RDC pela mesma chave da view', () => {
    const [l] = enriquecer([prod({ lav: 10, st3: 5 })], [rdc({})], [ativ('RDC-1', 'PAC')])
    expect(l.quantidade).toBe(15)
    expect(l.etapas.map((e) => e.etapa)).toEqual(['lav', 'st3'])
    expect(l.contratos).toEqual(['ROTINA'])
    expect(l.contratoNumeros).toEqual(['5900108690'])
    expect(l.areas).toEqual(['840K'])
    expect(l.rdcs).toEqual(['RDC-1'])
  })

  it('não vincula RDC de outra TAG, disciplina, cancelado nem produção sem RDC', () => {
    const rdcs = [rdc({ codigo: 'X', ativo: 'TR-06' }), rdc({ codigo: 'Y', status: 'Cancelado' }), rdc({ codigo: 'Z' })]
    const atividades = [ativ('X', 'PAC'), ativ('Y', 'PAC'), ativ('Z', 'REC')]
    expect(enriquecer([prod({ lav: 1 })], rdcs, atividades)[0].rdcs).toEqual([])
    expect(enriquecer([prod({ situacao: 'Produção sem RDC', responsavel: 'Sem RDC' })], [rdc({})], [ativ('RDC-1', 'PAC')])[0].contratos).toEqual([])
  })

  it('TEL/COB do app casa com TEL da produção', () => {
    const [l] = enriquecer([prod({ disciplina: 'TEL', unidade: 'kg', mont: 30 })], [rdc({})], [ativ('RDC-1', 'TEL/COB')])
    expect(l.rdcs).toEqual(['RDC-1'])
  })
})

describe('totais e produtividade', () => {
  const linhas = enriquecer(
    [
      prod({ lav: 40, valor: 100, homem_hora: 8 }),
      prod({ responsavel: 'Bia', st3: 20, valor: null, etapas_sem_preco: 'ST3', homem_hora: 12 }),
      prod({ responsavel: 'Sem RDC', situacao: 'Produção sem RDC', lav: 100, homem_hora: null, participacao: null }),
      prod({ responsavel: 'Caio', situacao: 'RDC sem produção', homem_hora: 6 }),
      prod({ responsavel: 'Ana', disciplina: 'REC', unidade: 'kg', fab: 500, homem_hora: 10 }),
    ],
    [],
    [],
  )

  it('soma m² e kg em separado e deixa fora do índice o que não tem HH ou produção', () => {
    const t = totalizar(linhas)
    expect(t.m2).toBe(160)
    expect(t.kg).toBe(500)
    expect(t.valor).toBe(100)
    expect(t.semPreco).toBe(1)
    expect(t.hh).toBe(36)
    expect(t.hhSemProducao).toBe(6)
    expect(produtividade(t, 'm2')).toBe(60 / 20)
    expect(produtividade(t, 'kg')).toBe(50)
  })

  it('sem HH vinculado a produtividade é nula, não zero', () => {
    expect(produtividade(totalizar([linhas[2]]), 'm2')).toBeNull()
  })

  it('ranking por responsável na unidade pedida, maior primeiro', () => {
    const r = rankingProdutividade(linhas, 'responsavel', 'm2')
    expect(r.map((i) => i.chave)).toEqual(['Ana', 'Bia'])
    expect(r[0].indice).toBe(5)
  })

  it('por etapa, a linha entra em cada etapa com a quantidade da etapa e sem valor', () => {
    const [l] = enriquecer([prod({ lav: 30, st3: 10, valor: 80, homem_hora: 10 })], [], [])
    const grupos = agrupar([l], 'etapa')
    expect(grupos.map((g) => [g.chave, g.totais.m2, g.totais.hh, g.totais.valor])).toEqual([
      ['LAV', 30, 10, 0],
      ['ST3', 10, 10, 0],
    ])
  })

  it('situação é contada por TAG × OM × disciplina × data, não por responsável', () => {
    const duas = enriquecer([prod({ responsavel: 'Ana' }), prod({ responsavel: 'Bia' })], [], [])
    expect(contagemSituacao(duas)['Produção com RDC']).toBe(1)
  })
})

describe('filtrarProducao', () => {
  const linhas = enriquecer(
    [prod({ lav: 1 }), prod({ responsavel: 'Sem RDC', situacao: 'Produção sem RDC', lav: 2 }), prod({ disciplina: 'TEL', unidade: 'kg', mont: 3 })],
    [rdc({})],
    [ativ('RDC-1', 'PAC')],
  )

  it('contrato e área tiram a produção sem RDC; TEL/COB filtra TEL', () => {
    expect(filtrarProducao(linhas, { contrato: '5900108690' })).toHaveLength(1)
    expect(filtrarProducao(linhas, { area: '840K' })).toHaveLength(1)
    expect(filtrarProducao(linhas, { disciplina: 'TEL/COB' })).toHaveLength(1)
    expect(filtrarProducao(linhas, { busca: 'rotina' })).toHaveLength(1)
  })
})

describe('produtividadeDiaria', () => {
  const linhas = enriquecer(
    [
      prod({ data: '2026-10-01', responsavel: 'Ana', lav: 40, homem_hora: 8 }),
      prod({ data: '2026-10-01', responsavel: 'Bia', st3: 10, homem_hora: 10 }),
      prod({ data: '2026-10-02', responsavel: 'Ana', lav: 30, st3: 6, homem_hora: 6 }),
      prod({ data: '2026-10-03', responsavel: 'Sem RDC', situacao: 'Produção sem RDC', lav: 99, homem_hora: null }),
      prod({ data: '2026-10-02', disciplina: 'REC', unidade: 'kg', fab: 100, homem_hora: 4 }),
    ],
    [],
    [],
  )

  it('total por dia só com produção e HH; dia sem HH fica de fora', () => {
    const r = produtividadeDiaria(linhas, null, 'm2')
    expect(r.dias).toEqual(['2026-10-01', '2026-10-02'])
    expect(r.total.map((p) => p.indice)).toEqual([50 / 18, 36 / 6])
    expect(r.series).toBeNull()
  })

  it('por responsável: série ausente no dia é nula, não zero; ordem pelo HH', () => {
    const r = produtividadeDiaria(linhas, 'responsavel', 'm2')
    expect(r.series!.map((s) => s.chave)).toEqual(['Ana', 'Bia'])
    expect(r.series![1].pontos.map((p) => p.indice)).toEqual([1, null])
  })

  it('por etapa, o HH do dia se repete em cada etapa', () => {
    const r = produtividadeDiaria(linhas, 'etapa', 'm2')
    const st3 = r.series!.find((s) => s.chave === 'ST3')!
    expect(st3.pontos[1]).toEqual({ indice: 1, producao: 6, hh: 6 })
  })

  it('kg não se mistura com m²', () => {
    expect(produtividadeDiaria(linhas, null, 'kg').total.map((p) => p.indice)).toEqual([25])
  })
})
