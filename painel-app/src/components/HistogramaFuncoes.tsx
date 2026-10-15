/**
 * Histograma de mão de obra por função e por dia (Painel executivo → Detalhamento, visão
 * "Histograma por função"): um gráfico pequeno por função, todos na mesma escala, e a
 * tabela função × dia logo abaixo. Regras de cálculo em domain/histogramaFuncoes.ts.
 */
import { useMemo, useState } from 'react'
import type { Recorte } from '../domain/filtros'
import EChart from './charts/EChart'
import { EIXO_VALOR_SEM_ROTULO, SEM_SOBREPOSICAO, gradeSuave } from './charts/padroes'
import { IconeFuncao } from './ui/icons/FuncaoIcons'
import { diasDoIntervalo } from '../domain/calendario'
import { fmtData, fmtHoras, fmtInteiro } from '../domain/formatters'
import { histogramaPorFuncao, type MetricaFuncao, type SerieFuncao } from '../domain/histogramaFuncoes'
import { cssVar } from '../styles/cssVar'

const METRICAS: Array<[MetricaFuncao, string]> = [
  ['efetivo', 'Efetivo (pessoas)'],
  ['hh', 'HH'],
]
type Eixo = 'periodo' | 'comRdc'
const EIXOS: Array<[Eixo, string]> = [
  ['periodo', 'Todos os dias'],
  ['comRdc', 'Só dias com RDC'],
]
/** Rótulo em cada barra até este número de dias; acima disso, só no dia de pico (o resto fica no tooltip). */
const ROTULO_EM_TODAS = 16
const ddmm = (iso: string) => fmtData(iso).slice(0, 5)

function Segmentado<T extends string>({ rotulo, opcoes, valor, onChange }: { rotulo: string; opcoes: Array<[T, string]>; valor: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-[var(--exec-text-2)]">{rotulo}</span>
      <div className="flex overflow-hidden rounded-control border border-[var(--exec-border)] text-xs font-semibold" role="group" aria-label={rotulo}>
        {opcoes.map(([v, texto]) => (
          <button
            key={v}
            type="button"
            aria-pressed={valor === v}
            onClick={() => onChange(v)}
            className={`min-h-8 px-3 ${valor === v ? 'bg-[var(--exec-ink)] text-white' : 'bg-white text-[var(--exec-text-2)] hover:bg-[var(--exec-surface-low)]'}`}
          >
            {texto}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function HistogramaFuncoes({ recorte, ini, fim, hoje }: { recorte: Recorte; ini: string; fim: string; hoje: string }) {
  const [metrica, setMetrica] = useState<MetricaFuncao>('efetivo')
  const [eixo, setEixo] = useState<Eixo>('periodo')
  const [ocultas, setOcultas] = useState<Set<string>>(new Set())

  // Dia futuro não entra no eixo (ainda não pode ter RDC).
  const ultimo = fim < hoje ? fim : hoje
  const periodo = useMemo(() => (ini <= ultimo ? diasDoIntervalo(ini, ultimo).map((d) => d.iso) : []), [ini, ultimo])
  const completo = useMemo(() => histogramaPorFuncao(recorte.rdcs, recorte.atividades, periodo, metrica), [recorte, periodo, metrica])
  const dados = useMemo(() => {
    if (eixo === 'periodo') return completo
    const manter = completo.dias.map((_, i) => completo.series.some((s) => s.valores[i] != null))
    const corta = <T,>(xs: T[]) => xs.filter((_, i) => manter[i])
    return {
      ...completo,
      dias: corta(completo.dias),
      series: completo.series.map((s) => {
        const valores = corta(s.valores)
        return { ...s, valores, pico: s.pico == null ? null : valores.indexOf(s.valores[s.pico]) }
      }),
    }
  }, [completo, eixo])
  const visiveis = dados.series.filter((s) => !ocultas.has(s.funcao))
  const comEfetivo = visiveis.filter((s) => s.pico != null)
  const zeradas = visiveis.filter((s) => s.pico == null)
  // Escala única: as funções são comparáveis entre si à primeira vista.
  const escala = Math.max(1, ...visiveis.flatMap((s) => s.valores.map((v) => v ?? 0)))
  const fmt = metrica === 'hh' ? fmtHoras : fmtInteiro
  const unidade = metrica === 'hh' ? 'HH' : 'pessoas'
  const totaisDia = dados.dias.map((_, i) => (visiveis.some((s) => s.valores[i] != null) ? visiveis.reduce((soma, s) => soma + (s.valores[i] ?? 0), 0) : null))

  function alternar(funcao: string) {
    setOcultas((atual) => {
      const novo = new Set(atual)
      if (novo.has(funcao)) novo.delete(funcao)
      else novo.add(funcao)
      return novo
    })
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Filtros da visão (contrato, área, responsável e disciplina vêm do filtro global) */}
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Segmentado rotulo="Medir por" opcoes={METRICAS} valor={metrica} onChange={setMetrica} />
          <Segmentado rotulo="Dias" opcoes={EIXOS} valor={eixo} onChange={setEixo} />
        </div>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Funções exibidas">
          <span className="mr-1 text-xs font-semibold text-[var(--exec-text-2)]">Funções</span>
          {dados.series.map((s) => {
            const ligada = !ocultas.has(s.funcao)
            return (
              <button
                key={s.funcao}
                type="button"
                aria-pressed={ligada}
                onClick={() => alternar(s.funcao)}
                className={`flex min-h-8 items-center gap-1.5 rounded-control border py-0.5 pr-2.5 pl-1 text-xs font-semibold ${
                  ligada ? 'border-[var(--exec-ink)] bg-white text-[var(--exec-ink)]' : 'border-[var(--exec-border)] bg-[var(--exec-surface-low)] text-[var(--exec-text-2)]'
                }`}
              >
                <IconeFuncao funcao={s.funcao} apagado={!ligada} tamanho={22} />
                {s.funcao}
              </button>
            )
          })}
          {ocultas.size > 0 && (
            <button type="button" onClick={() => setOcultas(new Set())} className="se-link ml-1 text-xs">
              Mostrar todas
            </button>
          )}
        </div>
        <p className="text-[11px] text-[var(--exec-text-2)]">
          {metrica === 'efetivo'
            ? 'Efetivo do dia: maior quantidade da função entre as atividades do RDC; RDC do mesmo responsável no mesmo dia contam uma vez (mesma equipe); responsáveis diferentes somam.'
            : 'HH do dia: quantidade × duração de cada atividade, somadas.'}{' '}
          Barra verde = dia de maior valor da função. Dia sem RDC fica sem barra (não é zero).
        </p>
      </div>

      {visiveis.length === 0 || dados.diasComRdc === 0 ? (
        <p className="py-10 text-center text-sm text-[var(--exec-text-2)]">
          {dados.diasComRdc === 0 ? 'Nenhum RDC no recorte. Amplie o período ou limpe os filtros.' : 'Escolha ao menos uma função acima.'}
        </p>
      ) : (
        <>
          {comEfetivo.length > 0 && (
            <div className="grid grid-cols-1 gap-3 @[48rem]:grid-cols-2 @[84rem]:grid-cols-3">
              {comEfetivo.map((s) => (
                <Mini key={s.funcao} serie={s} dias={dados.dias} escala={escala} metrica={metrica} fmt={fmt} unidade={unidade} />
              ))}
            </div>
          )}
          {/* Função zerada no período inteiro: uma linha, não um gráfico vazio */}
          {zeradas.length > 0 && (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-control border border-dashed border-[var(--exec-border)] px-3 py-2 text-xs text-[var(--exec-text-2)]">
              <strong className="text-[var(--exec-ink)]">Sem efetivo no recorte:</strong>
              {zeradas.map((s) => (
                <span key={s.funcao} className="flex items-center gap-1.5">
                  <IconeFuncao funcao={s.funcao} apagado tamanho={20} />
                  {s.funcao}
                </span>
              ))}
            </p>
          )}
          <Matriz series={visiveis} dias={dados.dias} totais={totaisDia} metrica={metrica} fmt={fmt} />
        </>
      )}
    </div>
  )
}

function Mini({ serie, dias, escala, metrica, fmt, unidade }: { serie: SerieFuncao; dias: string[]; escala: number; metrica: MetricaFuncao; fmt: (v: number) => string; unidade: string }) {
  const todas = dias.length <= ROTULO_EM_TODAS
  const opcao = useMemo(
    () => ({
      tooltip: {
        trigger: 'axis' as const,
        axisPointer: { type: 'shadow' as const },
        formatter: (ps: Array<{ dataIndex: number }>) => {
          const i = ps[0]?.dataIndex ?? 0
          const v = serie.valores[i]
          return `<strong>${fmtData(dias[i])}</strong><br/>${serie.funcao}: ${v == null ? 'sem RDC' : `${fmt(v)} ${unidade}`}`
        },
      },
      grid: { left: 4, right: 4, top: 22, bottom: 4, containLabel: true },
      xAxis: { type: 'category' as const, data: dias.map(ddmm), axisTick: { show: false }, axisLabel: { fontSize: 10 }, splitLine: gradeSuave() },
      yAxis: { type: 'value' as const, min: 0, max: escala, ...EIXO_VALOR_SEM_ROTULO },
      series: [
        {
          type: 'bar' as const,
          barMaxWidth: 22,
          data: serie.valores.map((v, i) => ({
            value: v,
            itemStyle: { color: cssVar(i === serie.pico ? '--exec-marca' : '--exec-ink-2'), borderRadius: [2, 2, 0, 0] },
            label: { show: v != null && v > 0 && (todas || i === serie.pico) },
          })),
          labelLayout: SEM_SOBREPOSICAO,
          label: { position: 'top' as const, distance: 3, fontSize: 10, fontWeight: 700, color: cssVar('--exec-ink'), formatter: (p: { value: number }) => fmt(p.value) },
        },
      ],
    }),
    [serie, dias, escala, fmt, unidade, todas],
  )
  const diaPico = serie.pico == null ? null : dias[serie.pico]
  return (
    <div className="flex min-w-0 flex-col rounded-control border border-[var(--exec-border)] bg-[var(--exec-surface)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex min-w-0 items-center gap-2 text-[12px] font-bold">
          <IconeFuncao funcao={serie.funcao} />
          <span className="truncate">{serie.funcao}</span>
        </h4>
        <span className={`exec-chip tabular ${diaPico ? 'exec-chip--marca' : ''}`}>
          {metrica === 'hh' ? `Total ${fmt(serie.total)} HH` : `Pico ${fmt(serie.total)}${diaPico ? ` · ${ddmm(diaPico)}` : ''}`}
        </span>
      </div>
      <p className="mt-0.5 text-[11px] text-[var(--exec-text-2)]">
        Média: <strong className="tabular text-[var(--exec-ink)]">{serie.media == null ? '—' : `${fmtHoras(serie.media)} ${unidade}`}</strong> por dia com RDC
      </p>
      <EChart
        option={opcao}
        height={150}
        descricao={`${serie.funcao}, ${unidade} por dia: ${serie.valores.map((v, i) => `${fmtData(dias[i])} ${v == null ? 'sem RDC' : fmt(v)}`).join('; ')}.`}
      />
    </div>
  )
}

function Matriz({ series, dias, totais, metrica, fmt }: { series: SerieFuncao[]; dias: string[]; totais: Array<number | null>; metrica: MetricaFuncao; fmt: (v: number) => string }) {
  const totalGeral = totais.reduce<number>((s, v) => (metrica === 'hh' ? s + (v ?? 0) : Math.max(s, v ?? 0)), 0)
  return (
    <div className="exec-card exec-card--tabela">
      <div className="overflow-x-auto" role="region" aria-label="Tabela função × dia (rolável)" tabIndex={0}>
        <table className="exec-tabela">
          <caption className="sr-only">Mão de obra por função e por dia ({metrica === 'hh' ? 'HH' : 'efetivo em pessoas'})</caption>
          <thead>
            <tr>
              <th scope="col" className="fixa">
                Função
              </th>
              {dias.map((d) => (
                <th key={d} scope="col" className="num whitespace-nowrap">
                  {ddmm(d)}
                </th>
              ))}
              <th scope="col" className="num whitespace-nowrap">
                {metrica === 'hh' ? 'Total' : 'Pico'}
              </th>
            </tr>
          </thead>
          <tbody>
            {series.map((s) => (
              <tr key={s.funcao}>
                <th scope="row" className="fixa whitespace-nowrap font-semibold">
                  {s.funcao}
                </th>
                {s.valores.map((v, i) => (
                  <td
                    key={dias[i]}
                    className={`num tabular ${i === s.pico ? 'bg-[var(--exec-marca-bg)] font-bold' : v === 0 ? 'text-[var(--exec-outline)]' : ''}`}
                  >
                    {v == null ? '—' : fmt(v)}
                  </td>
                ))}
                <td className="num tabular font-bold">{fmt(s.total)}</td>
              </tr>
            ))}
            {/* Total na última linha do corpo: herda o espaçamento das células da exec-tabela */}
            <tr className="bg-[var(--exec-surface-low)]">
              <th scope="row" className="fixa whitespace-nowrap bg-[var(--exec-surface-low)] font-bold">
                Total do dia
              </th>
              {totais.map((v, i) => (
                <td key={dias[i]} className="num tabular font-bold">
                  {v == null ? '—' : fmt(v)}
                </td>
              ))}
              <td className="num tabular font-bold">{fmt(totalGeral)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="border-t border-[var(--exec-border)] px-4 py-2 text-[11px] text-[var(--exec-text-2)]">
        — = dia sem RDC. Destaque verde = dia de maior valor da função. {metrica === 'hh' ? 'Total = soma do período.' : 'Pico = maior efetivo diário do período; o total do dia soma as funções (pessoas diferentes).'}
      </p>
    </div>
  )
}
