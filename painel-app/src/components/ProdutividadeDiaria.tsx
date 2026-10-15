/**
 * Análise diária da produtividade (tela Produção): linha por dia, total ou quebrada por etapa,
 * encarregado ou disciplina, com as séries escolhidas em chips logo acima do gráfico.
 * Regras de cálculo em produtividadeDiaria (domain/producaoAnalise.ts).
 */
import { useMemo, useState } from 'react'
import { Card } from './exec/ExecUi'
import EChart from './charts/EChart'
import { CORES_SERIES, EIXO_VALOR_SEM_ROTULO, MAX_SERIES, SEM_SOBREPOSICAO, gradeSuave } from './charts/padroes'
import { semanaIso } from '../domain/calendario'
import { fmtData, fmtHoras, fmtIndice } from '../domain/formatters'
import { ORDEM_ETAPA, ROTULO_UNIDADE, produtividadeDiaria, type Dimensao, type LinhaProducao, type Unidade } from '../domain/producaoAnalise'
import { cssVar } from '../styles/cssVar'

type Quebra = Extract<Dimensao, 'etapa' | 'responsavel' | 'disciplina'>

const QUEBRAS: Array<[Quebra | null, string]> = [
  [null, 'Total'],
  ['etapa', 'Etapa'],
  ['responsavel', 'Encarregado'],
  ['disciplina', 'Disciplina'],
]
/** Começa com poucas séries para o gráfico abrir legível; o usuário liga as demais. */
const INICIAIS = 3
const ddmm = (iso: string) => fmtData(iso).slice(0, 5)
const curto = (s: string) => (s.length > 16 ? `${s.slice(0, 15)}…` : s)

export default function ProdutividadeDiaria({ linhas, unidade }: { linhas: LinhaProducao[]; unidade: Unidade }) {
  const [quebra, setQuebra] = useState<Quebra | null>(null)
  // Cor por entidade (slot fixo enquanto a série estiver ligada): desligar uma não repinta as outras.
  const [slots, setSlots] = useState<Map<string, number>>(new Map())
  const u = ROTULO_UNIDADE[unidade]

  const dados = useMemo(() => produtividadeDiaria(linhas, quebra, unidade), [linhas, quebra, unidade])
  const entidades = useMemo(() => {
    const s = dados.series ?? []
    return quebra === 'etapa' ? [...s].sort((a, b) => (ORDEM_ETAPA.get(a.chave) ?? 99) - (ORDEM_ETAPA.get(b.chave) ?? 99)) : s
  }, [dados, quebra])

  // Ao trocar a quebra (ou quando as séries disponíveis mudam), liga as de maior HH.
  const chaveEntidades = entidades.map((e) => e.chave).join('|')
  const [ultimaChave, setUltimaChave] = useState('')
  if (chaveEntidades !== ultimaChave) {
    setUltimaChave(chaveEntidades)
    const iniciais = [...(dados.series ?? [])].slice(0, INICIAIS).map((s) => s.chave)
    setSlots(new Map(iniciais.map((c, i) => [c, i])))
  }

  function alternar(chave: string) {
    setSlots((atual) => {
      const novo = new Map(atual)
      if (novo.has(chave)) novo.delete(chave)
      else {
        const livre = [...Array(MAX_SERIES).keys()].find((i) => ![...novo.values()].includes(i))
        if (livre == null) return atual
        novo.set(chave, livre)
      }
      return novo
    })
  }

  const ativas = entidades.filter((e) => slots.has(e.chave))

  const opcao = useMemo(() => {
    const { dias, total } = dados
    const textoSec = cssVar('--exec-text-2')
    const comQuebra = quebra != null
    const serieTotal = {
      name: comQuebra ? 'Total do dia' : `${u}/HH do dia`,
      type: 'line' as const,
      data: total.map((p) => p.indice),
      connectNulls: false,
      color: comQuebra ? cssVar('--exec-outline') : cssVar('--exec-ink'),
      lineStyle: { width: comQuebra ? 1.5 : 2, type: comQuebra ? ('dashed' as const) : ('solid' as const) },
      symbol: 'circle',
      symbolSize: comQuebra ? 0 : 7,
      showSymbol: !comQuebra,
      z: 1,
      ...(comQuebra
        ? {}
        : {
            labelLayout: SEM_SOBREPOSICAO,
            label: { show: true, position: 'top' as const, fontSize: 10, fontWeight: 700, color: cssVar('--exec-ink'), formatter: (p: { value: number }) => fmtIndice(p.value) },
          }),
    }
    const series = ativas.map((e) => ({
      name: e.chave,
      type: 'line' as const,
      data: e.pontos.map((p) => p.indice),
      connectNulls: false,
      color: CORES_SERIES[slots.get(e.chave)!],
      lineStyle: { width: 2 },
      symbol: 'circle',
      symbolSize: 8,
      z: 2,
      endLabel: { show: true, formatter: () => curto(e.chave), color: textoSec, fontSize: 10, fontWeight: 600, distance: 6 },
    }))
    return {
      tooltip: {
        trigger: 'axis' as const,
        formatter: (ps: Array<{ dataIndex: number; seriesName: string; marker: string; value: number | null }>) => {
          const i = ps[0]?.dataIndex ?? 0
          const linhasTip = ps
            .filter((p) => p.value != null)
            .map((p) => {
              const fonte = p.seriesName === serieTotal.name ? total[i] : ativas.find((e) => e.chave === p.seriesName)?.pontos[i]
              const conta = fonte ? ` <span style="color:${textoSec}">(${fmtHoras(fonte.producao)} ${u} ÷ ${fmtHoras(fonte.hh)} HH)</span>` : ''
              return `${p.marker}${p.seriesName.replace(/</g, '&lt;')}: <strong>${fmtIndice(p.value!)} ${u}/HH</strong>${conta}`
            })
          return `<strong>${fmtData(dias[i])}</strong> · semana ${semanaIso(dias[i])}<br/>${linhasTip.join('<br/>')}`
        },
      },
      legend: { top: 0, left: 0, type: 'scroll' as const },
      grid: { left: 8, right: comQuebra ? 112 : 16, top: 40, bottom: 26, containLabel: true },
      xAxis: [
        { type: 'category' as const, boundaryGap: false, data: dias.map(ddmm), axisTick: { show: false }, splitLine: gradeSuave() },
        {
          type: 'category' as const,
          position: 'bottom' as const,
          offset: 20,
          boundaryGap: false,
          data: dias.map((d) => `Sem ${semanaIso(d)}`),
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: {
            interval: (i: number) => i === 0 || semanaIso(dias[i]) !== semanaIso(dias[i - 1]),
            fontSize: 10,
            fontWeight: 600,
            color: cssVar('--exec-outline'),
          },
        },
      ],
      yAxis: { type: 'value' as const, min: 0, ...EIXO_VALOR_SEM_ROTULO },
      series: [serieTotal, ...series],
    }
  }, [dados, ativas, slots, quebra, u])

  const descricao = `${u}/HH por dia${quebra ? ` por ${QUEBRAS.find(([q]) => q === quebra)![1].toLowerCase()}` : ''}: ${dados.dias
    .map((d, i) => `${fmtData(d)} total ${dados.total[i].indice == null ? 'sem índice' : fmtIndice(dados.total[i].indice!)}`)
    .join('; ')}.`

  return (
    <Card
      titulo={`${u}/HH por dia`}
      sub="Análise diária: produção ÷ HH dos registros com os dois. Ponto ausente = série sem produção com HH naquele dia (não é zero)."
    >
      <div className="mb-3 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-[var(--exec-text-2)]">Analisar por</span>
          <div className="flex overflow-hidden rounded-control border border-[var(--exec-border)] text-xs font-semibold" role="group" aria-label="Analisar a produtividade diária por">
            {QUEBRAS.map(([q, rotulo]) => (
              <button
                key={rotulo}
                type="button"
                aria-pressed={quebra === q}
                onClick={() => setQuebra(q)}
                className={`min-h-8 px-3 ${quebra === q ? 'bg-[var(--exec-ink)] text-white' : 'bg-white text-[var(--exec-text-2)] hover:bg-[var(--exec-surface-low)]'}`}
              >
                {rotulo}
              </button>
            ))}
          </div>
        </div>
        {quebra && entidades.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={`Séries exibidas (até ${MAX_SERIES})`}>
            {entidades.map((e) => {
              const slot = slots.get(e.chave)
              const ligada = slot != null
              const cheio = !ligada && slots.size >= MAX_SERIES
              return (
                <button
                  key={e.chave}
                  type="button"
                  aria-pressed={ligada}
                  disabled={cheio}
                  onClick={() => alternar(e.chave)}
                  title={cheio ? `Até ${MAX_SERIES} séries ao mesmo tempo: desligue uma para ligar esta` : `${fmtHoras(e.hh)} HH no período`}
                  className={`flex min-h-7 items-center gap-1.5 rounded-control border px-2 text-xs font-semibold disabled:opacity-40 ${
                    ligada ? 'border-[var(--exec-ink)] bg-white text-[var(--exec-ink)]' : 'border-[var(--exec-border)] bg-[var(--exec-surface-low)] text-[var(--exec-text-2)]'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 rounded-full border"
                    style={ligada ? { background: CORES_SERIES[slot], borderColor: CORES_SERIES[slot] } : { borderColor: 'var(--exec-outline)' }}
                  />
                  {e.chave}
                </button>
              )
            })}
            <span className="text-[11px] text-[var(--exec-text-2)]">até {MAX_SERIES} séries · linha tracejada = total do dia</span>
          </div>
        )}
      </div>
      <EChart option={opcao} vazio={dados.dias.length === 0} mensagemVazio={`Nenhuma produção em ${u} com HH no recorte.`} height={300} descricao={descricao} />
    </Card>
  )
}
