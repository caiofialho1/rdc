import { useMemo } from 'react'
import type { RdcRow } from '../api/schemas'
import { isoDia } from '../domain/ciclo'
import { classificarDia, diasDoIntervalo, estenderFimMesSeAplicavel, type ClassificacaoDia, type DiaCalendario } from '../domain/calendario'
import { fmtData } from '../domain/formatters'
import Card from './ui/Card'
import CardHeader from './ui/CardHeader'
import Responsavel from './ui/Responsavel'

const CORES: Record<ClassificacaoDia['tipo'], string> = {
  ok: 'bg-primary text-white font-semibold',
  feriado: 'bg-info-border',
  fds: 'bg-planned/15',
  futuro: 'text-text-secondary',
  no: 'bg-warning-bg text-warning-text font-semibold',
}

const INICIAL_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const NOME_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
const fmtMes = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })

/** Agrupa dias consecutivos do mesmo mês para a linha de meses do cabeçalho. */
function gruposDeMes(dias: DiaCalendario[]): Array<{ chave: string; rotulo: string; qtd: number }> {
  const grupos: Array<{ chave: string; rotulo: string; qtd: number }> = []
  for (const d of dias) {
    const chave = d.iso.slice(0, 7)
    const ultimo = grupos[grupos.length - 1]
    if (ultimo?.chave === chave) ultimo.qtd++
    else {
      const mes = fmtMes.format(new Date(`${d.iso}T12:00:00`)) // "setembro de 2026"
      grupos.push({ chave, rotulo: mes.charAt(0).toUpperCase() + mes.slice(1), qtd: 1 })
    }
  }
  return grupos
}

function Legenda() {
  const itens: Array<[string, string, string]> = [
    ['bg-primary text-white', '✓', 'RDC emitido (número = mais de um)'],
    ['bg-warning-bg text-warning-text', '✕', 'Dia útil sem RDC'],
    ['bg-info-border', '', 'Feriado'],
    ['bg-planned/15', '', 'Fim de semana'],
    ['text-text-secondary border border-border', '–', 'Data futura'],
  ]
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-text-secondary" aria-label="Legenda do calendário">
      {itens.map(([cor, simbolo, rotulo]) => (
        <li key={rotulo} className="flex items-center gap-1.5">
          <span className={`inline-flex h-4 w-4 items-center justify-center rounded-[2px] text-[10px] ${cor}`} aria-hidden="true">
            {simbolo}
          </span>
          {rotulo}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span className="inline-block h-4 w-4 rounded-[2px] border border-border shadow-[inset_0_-2px_0_var(--info)]" aria-hidden="true" />
        Hoje
      </li>
    </ul>
  )
}

export default function Calendario({ rdcs, ini, fim }: { rdcs: RdcRow[]; ini: string; fim: string }) {
  const hoje = isoDia(new Date())
  const fimEstendido = estenderFimMesSeAplicavel(fim, hoje)
  const dias = useMemo(() => diasDoIntervalo(ini, fimEstendido), [ini, fimEstendido])
  const meses = useMemo(() => gruposDeMes(dias), [dias])

  const responsaveis = useMemo(() => [...new Set(rdcs.map((r) => r.responsavel))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [rdcs])

  const contagem = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const r of rdcs) {
      const chave = `${r.responsavel}|${r.data_rdc}`
      mapa.set(chave, (mapa.get(chave) ?? 0) + 1)
    }
    return mapa
  }, [rdcs])

  if (!responsaveis.length) return null

  const classeDia = (d: DiaCalendario, i: number) =>
    `${d.dia === 1 && i > 0 ? 'cal-mes' : ''} ${d.iso === hoje ? 'cal-dia--hoje' : ''}`

  return (
    <Card>
      <CardHeader
        titulo="Emissão diária"
        subtitulo={`RDC por responsável e dia, ${fmtData(ini)} a ${fmtData(fimEstendido)}. Dia sem registro não comprova falta.`}
      />
      <div className="max-h-[28rem] overflow-auto rounded-card border border-border" tabIndex={0} role="region" aria-label="Calendário de emissão diária (rolável)">
        <table className="cal-tabela">
          <caption className="sr-only">Emissão diária de RDC por responsável</caption>
          <thead>
            <tr>
              <th rowSpan={2} scope="col" className="cal-resp font-semibold text-text-primary">
                Responsável
              </th>
              {meses.map((m, i) => (
                <th
                  key={m.chave}
                  colSpan={m.qtd}
                  scope="colgroup"
                  className={`px-1 pt-1.5 text-left text-[11px] font-semibold text-text-secondary ${i > 0 ? 'cal-mes' : ''}`}
                >
                  <span className="whitespace-nowrap">{m.rotulo}</span>
                </th>
              ))}
            </tr>
            <tr>
              {dias.map((d, i) => (
                <th
                  key={d.iso}
                  scope="col"
                  title={`${fmtData(d.iso)}, ${NOME_SEMANA[d.diaSemana]}`}
                  className={`cal-dia pb-1 text-center font-normal ${d.diaSemana === 0 || d.diaSemana === 6 ? 'text-text-secondary' : 'text-text-primary'} ${classeDia(d, i)}`}
                >
                  <span className="block text-[12px] leading-tight tabular">{d.dia}</span>
                  <span className="block text-[10px] leading-tight text-text-secondary" aria-hidden="true">
                    {INICIAL_SEMANA[d.diaSemana]}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {responsaveis.map((resp) => (
              <tr key={resp}>
                <th scope="row" className="cal-resp font-medium text-text-primary" title={resp}>
                  <Responsavel nome={resp} />
                </th>
                {dias.map((d, i) => {
                  const c = contagem.get(`${resp}|${d.iso}`) ?? 0
                  const info = classificarDia(d, c, hoje)
                  return (
                    <td key={d.iso} title={`${fmtData(d.iso)} · ${info.situacao}`} className={`cal-dia ${CORES[info.tipo]} ${classeDia(d, i)}`}>
                      <span aria-hidden="true">{info.simbolo}</span>
                      <span className="sr-only">
                        {fmtData(d.iso)}: {info.situacao}
                      </span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Legenda />
    </Card>
  )
}
