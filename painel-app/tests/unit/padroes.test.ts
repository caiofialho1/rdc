import { describe, expect, it } from 'vitest'
import { afastarRotulos, posicaoRotulos } from '../../src/components/charts/padroes'

describe('afastarRotulos', () => {
  it('o de menor valor fica no lugar e os colados sobem', () => {
    const d = afastarRotulos(
      [
        { chave: 'A', valor: 3.0 },
        { chave: 'B', valor: 2.95 },
        { chave: 'C', valor: 1.0 },
        { chave: 'D', valor: null },
      ],
      0.2,
    )
    expect(d.get('C')).toBe(0)
    expect(d.get('B')).toBe(0)
    expect(d.get('A')).toBeCloseTo(0.15) // sobe para 3,15
    expect(d.has('D')).toBe(false)
  })
  it('séries que terminam todas em zero sobem em escada, sem descer abaixo do eixo', () => {
    const d = afastarRotulos(
      [
        { chave: 'A', valor: 0 },
        { chave: 'B', valor: 0 },
      ],
      0.2,
    )
    expect([d.get('A'), d.get('B')].sort()).toEqual([0, 0.2])
  })
})

describe('posicaoRotulos', () => {
  it('no mesmo dia, valores mais altos ficam acima e os mais baixos abaixo', () => {
    const p = posicaoRotulos([
      [3, 1, null],
      [2, 4, 5],
      [1, 2, null],
    ])
    expect(p.map((s) => s[0])).toEqual(['top', 'top', 'bottom'])
    expect(p.map((s) => s[1])).toEqual(['bottom', 'top', 'top']) // 3 séries: as 2 maiores acima
    expect(p[1][2]).toBe('top') // série sozinha no dia: acima
  })
})

describe('posicaoRotulos com distância mínima', () => {
  it('colisão do mesmo lado: o da série 0 (referência) sai primeiro', () => {
    // acima: total 5,02 e série 1 em 5,0 colam -> some o total
    const p = posicaoRotulos([[5.02], [5.0], [1.0], [0.5]], 0.3)
    expect(p.map((s) => s[0])).toEqual([null, 'top', 'bottom', 'bottom'])
  })
  it('entre séries comuns, fica a de índice menor', () => {
    // abaixo: série 2 (1,0) e série 3 (1,05) colam -> some a 3
    const p = posicaoRotulos([[2.0], [5.0], [1.0], [1.05]], 0.3)
    expect(p.map((s) => s[0])).toEqual(['top', 'top', 'bottom', null])
  })
  it('valores próximos em lados opostos não colidem', () => {
    const p = posicaoRotulos([[2.0], [5.0], [2.05], [1.0]], 0.3)
    expect(p.map((s) => s[0])).toEqual(['bottom', 'top', 'top', 'bottom'])
  })
})
