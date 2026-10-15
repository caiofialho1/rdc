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

export interface Medicao extends Ciclo {
  /** AAAA-MM do mês em que o ciclo termina (21/01 a 20/02 → '2026-02'). */
  chave: string
  /** Nome do mês de fechamento: 21/01 a 20/02 = "Fevereiro/2026". */
  rotulo: string
}

const fmtMesAno = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })

/** Medição (ciclo 21→20) nomeada pelo mês de fechamento. */
export function medicaoDe(dataIso: string): Medicao {
  const ciclo = cicloMedicao(dataIso)
  const [ano, mes] = ciclo.fim.split('-').map(Number)
  const nome = fmtMesAno.format(new Date(ano, mes - 1, 1)).replace(' de ', '/')
  return { ...ciclo, chave: ciclo.fim.slice(0, 7), rotulo: nome.charAt(0).toUpperCase() + nome.slice(1) }
}

/** Medição do mês `mes` (1–12) de `ano`: 21 do mês anterior a 20 do próprio mês (fevereiro = 21/01 a 20/02). */
export function medicaoDoMes(ano: number, mes: number): Medicao {
  return medicaoDe(isoDia(new Date(ano, mes - 1, 20)))
}

/** Medição em curso (a que contém hoje). */
export function medicaoAtual(): Medicao {
  return medicaoDe(isoDia(new Date()))
}

/** Anos oferecidos no filtro: do ano da medição atual até dois anos antes, do mais recente para o mais antigo. */
export function anosDisponiveis(): number[] {
  const atual = Number(medicaoAtual().chave.slice(0, 4))
  return [atual, atual - 1, atual - 2]
}
