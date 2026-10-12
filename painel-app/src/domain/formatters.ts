/** Formatação pt-BR padrão do painel (ver docs/KPI_CATALOG.md). */
const nf1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const nf0 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const percentual = new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 })

const nfAuto = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

/** Número genérico pt-BR com até 1 casa (eixos e tooltips de gráfico). */
export function fmtNumero(v: number): string {
  return nfAuto.format(v)
}

export function fmtHoras(v: number): string {
  return nf1.format(v)
}

export function fmtInteiro(v: number): string {
  return nf0.format(v)
}

export function fmtMoeda(v: number): string {
  return moeda.format(v)
}

export function fmtPercentual(v: number): string {
  return percentual.format(v)
}

export function fmtData(iso: string | null): string {
  if (!iso) return '—'
  const [ano, mes, dia] = iso.slice(0, 10).split('-')
  return `${dia}/${mes}/${ano}`
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Só o horário (HH:MM), hora local — mesma regra de fmtHora em painel.html. */
export function fmtHora(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Data + hora pt-BR curta — mesma regra de fmtDH em painel.html. */
export function fmtDH(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}
