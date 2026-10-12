import { describe, expect, it } from 'vitest'
import { cicloMedicao } from '../../src/domain/ciclo'

describe('cicloMedicao', () => {
  it('dia 20 pertence ao ciclo que termina nesse mesmo dia', () => {
    expect(cicloMedicao('2026-10-20')).toEqual({ ini: '2026-09-21', fim: '2026-10-20' })
  })

  it('dia 21 já pertence ao próximo ciclo', () => {
    expect(cicloMedicao('2026-10-21')).toEqual({ ini: '2026-10-21', fim: '2026-11-20' })
  })

  it('dia 1 pertence ao ciclo iniciado no mês anterior', () => {
    expect(cicloMedicao('2026-10-01')).toEqual({ ini: '2026-09-21', fim: '2026-10-20' })
  })

  it('atravessa a virada de ano', () => {
    expect(cicloMedicao('2026-01-05')).toEqual({ ini: '2025-12-21', fim: '2026-01-20' })
    expect(cicloMedicao('2026-12-25')).toEqual({ ini: '2026-12-21', fim: '2027-01-20' })
  })
})
