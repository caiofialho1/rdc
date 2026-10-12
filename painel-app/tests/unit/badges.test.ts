import { describe, expect, it } from 'vitest'
import { tomSituacao, tomStatus } from '../../src/domain/badges'

describe('tomStatus', () => {
  it('mapeia cada status do RDC para um tom', () => {
    expect(tomStatus('Validado')).toBe('success')
    expect(tomStatus('Enviado')).toBe('info')
    expect(tomStatus('Em revisão')).toBe('warning')
    expect(tomStatus('Cancelado')).toBe('danger')
    expect(tomStatus('Substituído')).toBe('neutro')
    expect(tomStatus('Rascunho')).toBe('neutro')
  })
})

describe('tomSituacao', () => {
  it('reconciliação completa é success; as duas divergências usam o mesmo tom (sem graduar culpa)', () => {
    expect(tomSituacao('Produção com RDC')).toBe('success')
    expect(tomSituacao('Produção sem RDC')).toBe('warning')
    expect(tomSituacao('RDC sem produção')).toBe('warning')
  })
})
