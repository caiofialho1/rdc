import { describe, expect, it } from 'vitest'
import { cicloMedicao, medicaoDe, medicaoDoMes } from '../../src/domain/ciclo'

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

describe('medições', () => {
  it('nomeia a medição pelo mês de fechamento (21/01 a 20/02 = fevereiro)', () => {
    expect(medicaoDe('2026-01-21')).toEqual({ ini: '2026-01-21', fim: '2026-02-20', chave: '2026-02', rotulo: 'Fevereiro/2026' })
    expect(medicaoDe('2026-02-20').rotulo).toBe('Fevereiro/2026')
  })

  it('medição de janeiro começa em 21/12 do ano anterior', () => {
    expect(medicaoDe('2026-01-05')).toMatchObject({ ini: '2025-12-21', fim: '2026-01-20', rotulo: 'Janeiro/2026' })
  })

  it('mês medição monta o ciclo 21→20 que fecha no mês escolhido', () => {
    expect(medicaoDoMes(2026, 2)).toMatchObject({ ini: '2026-01-21', fim: '2026-02-20', rotulo: 'Fevereiro/2026' })
    expect(medicaoDoMes(2026, 1)).toMatchObject({ ini: '2025-12-21', fim: '2026-01-20' })
    expect(medicaoDoMes(2026, 12)).toMatchObject({ ini: '2026-11-21', fim: '2026-12-20' })
  })
})
