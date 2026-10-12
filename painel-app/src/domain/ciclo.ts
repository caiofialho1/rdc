/**
 * Ciclo de medição contratual: 21 do mês até 20 do mês seguinte (confirmado
 * em supabase/migracao_v14_producao_todas_datas.sql). Porta cicloMedicao()
 * de painel.html linha 358 — mesma matemática de datas, mesmo uso de
 * componentes locais (ano/mês/dia), sem lib de datas.
 */
export interface Ciclo {
  ini: string
  fim: string
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function isoDia(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function cicloMedicao(dataIso: string): Ciclo {
  const data = new Date(`${dataIso}T12:00:00`)
  const ano = data.getFullYear()
  const mes = data.getMonth()
  return data.getDate() <= 20
    ? { ini: isoDia(new Date(ano, mes - 1, 21)), fim: isoDia(new Date(ano, mes, 20)) }
    : { ini: isoDia(new Date(ano, mes, 21)), fim: isoDia(new Date(ano, mes + 1, 20)) }
}
