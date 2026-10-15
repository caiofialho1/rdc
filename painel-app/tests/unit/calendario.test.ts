import { describe, expect, it } from 'vitest'
import { classificarDia, diasDoIntervalo, estenderFimMesSeAplicavel, semanaIso } from '../../src/domain/calendario'

describe('diasDoIntervalo', () => {
  it('gera um dia por data do intervalo, inclusive', () => {
    const dias = diasDoIntervalo('2026-10-01', '2026-10-03')
    expect(dias.map((d) => d.iso)).toEqual(['2026-10-01', '2026-10-02', '2026-10-03'])
  })
})

describe('estenderFimMesSeAplicavel', () => {
  it('estende até o fim do mês quando o fim do filtro é hoje', () => {
    expect(estenderFimMesSeAplicavel('2026-10-11', '2026-10-11')).toBe('2026-10-31')
  })

  it('não estende quando o fim do filtro já passou', () => {
    expect(estenderFimMesSeAplicavel('2026-09-15', '2026-10-11')).toBe('2026-09-15')
  })
})

describe('classificarDia', () => {
  const hoje = '2026-10-11'

  it('com contagem > 0, mostra o número', () => {
    expect(classificarDia({ iso: '2026-10-05', diaSemana: 1, dia: 5, mes: 10 }, 3, hoje)).toEqual({
      tipo: 'ok',
      simbolo: '3',
      situacao: '3 RDC',
    })
  })

  it('feriado nacional sem RDC fica fora da contagem', () => {
    const c = classificarDia({ iso: '2026-10-12', diaSemana: 1, dia: 12, mes: 10 }, 0, hoje)
    expect(c.tipo).toBe('feriado')
  })

  it('fim de semana sem RDC fica fora da contagem', () => {
    const c = classificarDia({ iso: '2026-10-10', diaSemana: 6, dia: 10, mes: 10 }, 0, hoje)
    expect(c.tipo).toBe('fds')
  })

  it('dia útil passado sem RDC é "no" (ausência real)', () => {
    const c = classificarDia({ iso: '2026-10-07', diaSemana: 3, dia: 7, mes: 10 }, 0, hoje)
    expect(c).toEqual({ tipo: 'no', simbolo: '✕', situacao: 'sem RDC em dia útil' })
  })

  it('dia futuro sem RDC não conta como falta', () => {
    const c = classificarDia({ iso: '2026-10-20', diaSemana: 2, dia: 20, mes: 10 }, 0, hoje)
    expect(c.tipo).toBe('futuro')
  })
})

describe('semanaIso', () => {
  it('semana começa na segunda (ISO 8601)', () => {
    expect(semanaIso('2026-09-21')).toBe(39) // segunda
    expect(semanaIso('2026-09-27')).toBe(39) // domingo da mesma semana
    expect(semanaIso('2026-09-28')).toBe(40) // segunda seguinte
    expect(semanaIso('2026-10-14')).toBe(42)
  })
  it('virada de ano segue a regra da primeira quinta-feira', () => {
    expect(semanaIso('2026-01-01')).toBe(1) // quinta
    expect(semanaIso('2027-01-01')).toBe(53) // sexta: ainda semana 53 de 2026
    expect(semanaIso('2027-01-04')).toBe(1)
  })
})
