import type { Situacao, StatusRdc } from '../api/schemas'

export type Tom = 'success' | 'warning' | 'danger' | 'info' | 'neutro'

/**
 * Favorabilidade julgada pela regra de negócio, nunca pelo sinal do valor
 * (regra 4 do AGENTS.md Slate Executive) — Validado é um estado de fluxo
 * concluído (success), não uma nota de desempenho; Substituído/Cancelado
 * são encerramentos administrativos, não "erros".
 */
export function tomStatus(status: StatusRdc): Tom {
  switch (status) {
    case 'Validado':
      return 'success'
    case 'Enviado':
      return 'info'
    case 'Em revisão':
      return 'warning'
    case 'Cancelado':
      return 'danger'
    case 'Rascunho':
    case 'Substituído':
      return 'neutro'
  }
}

/**
 * "Produção com RDC" é reconciliação completa (success). As outras duas
 * situações são sinal de investigação, não culpa — mesmo tom (warning) para
 * as duas, sem graduar qual é "pior" sem evidência (ver BUSINESS_MODEL.md).
 */
export function tomSituacao(situacao: Situacao): Tom {
  return situacao === 'Produção com RDC' ? 'success' : 'warning'
}
