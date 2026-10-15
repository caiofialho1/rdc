import { describe, expect, it } from 'vitest'
import { afastarRotulos } from '../../src/components/charts/padroes'

describe('afastarRotulos', () => {
  it('afasta para baixo só o que ficaria colado no vizinho de cima', () => {
    const d = afastarRotulos(
      [
        { chave: 'A', valor: 3.0 },
        { chave: 'B', valor: 2.95 },
        { chave: 'C', valor: 1.0 },
        { chave: 'D', valor: null },
      ],
      0.2,
    )
    expect(d.get('A')).toBe(0)
    expect(d.get('B')).toBeCloseTo(0.15)
    expect(d.get('C')).toBe(0)
    expect(d.has('D')).toBe(false)
  })
})
