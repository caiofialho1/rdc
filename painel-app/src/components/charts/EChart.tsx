import * as echarts from 'echarts/core'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import { GridComponent, LegendComponent, MarkLineComponent, TitleComponent, TooltipComponent } from 'echarts/components'
import { SVGRenderer } from 'echarts/renderers'
import { useEffect, useRef } from 'react'
import { fmtNumero } from '../../domain/formatters'
import { cssVar } from '../../styles/cssVar'

echarts.use([BarChart, LineChart, PieChart, GridComponent, LegendComponent, MarkLineComponent, TitleComponent, TooltipComponent, SVGRenderer])

interface EChartProps {
  option: echarts.EChartsCoreOption
  height?: number
  carregando?: boolean
  vazio?: boolean
  mensagemVazio?: string
  /**
   * Descrição textual do gráfico (o que mostra + principais valores). Lida
   * por leitores de tela no lugar do SVG, que não é navegável.
   */
  descricao: string
}

type Obj = Record<string, unknown>
type EixoComEstilo = Obj & {
  type?: string
  axisLine?: Obj & { lineStyle?: Obj }
  splitLine?: Obj & { lineStyle?: Obj }
  axisLabel?: Obj
}

function reduzMovimento(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/**
 * Aplica a paleta do app mobile (design-tokens.css) a toda opção de
 * gráfico, sem sobrescrever o que a tela definiu explicitamente:
 * - fundo transparente (o ChartCard já pinta --chart-background);
 * - eixos --axis mais fortes que a grade --gridline; rótulos 11 px;
 * - números de eixo e tooltip em pt-BR (o padrão do ECharts é en-US: "1,234.5");
 * - tooltip com borda/texto dos tokens; sem animação com prefers-reduced-motion.
 * Cores lidas em tempo de execução via cssVar(), nunca hexadecimal fixo.
 */
function comIdentidadeVisual(option: echarts.EChartsCoreOption): echarts.EChartsCoreOption {
  const axis = cssVar('--axis')
  const gridline = cssVar('--gridline')
  const textSecondary = cssVar('--text-secondary')
  const textPrimary = cssVar('--text-primary')
  const o = option as Obj

  const estiloEixo = (eixo: EixoComEstilo | undefined): EixoComEstilo | undefined => {
    if (!eixo) return eixo
    const valor = eixo.type === 'value'
    return {
      ...eixo,
      axisLine: { ...eixo.axisLine, lineStyle: { color: axis, width: 1, ...eixo.axisLine?.lineStyle } },
      splitLine: { ...eixo.splitLine, lineStyle: { color: gridline, width: 1, ...eixo.splitLine?.lineStyle } },
      axisLabel: {
        color: textSecondary,
        fontSize: 10,
        hideOverlap: true,
        ...(valor ? { formatter: (v: number) => fmtNumero(v) } : {}),
        ...eixo.axisLabel,
      },
      ...(valor && eixo.name ? { nameTextStyle: { color: textSecondary, fontSize: 10, ...(eixo.nameTextStyle as Obj) } } : {}),
    }
  }

  const tooltip = o.tooltip as Obj | undefined
  const legend = o.legend as Obj | undefined
  const title = o.title as Obj | undefined
  const semAnimacao = reduzMovimento()

  return {
    ...option,
    backgroundColor: o.backgroundColor ?? 'transparent',
    textStyle: { fontFamily: cssVar('--font-ui') || 'Inter, Arial, sans-serif', ...(o.textStyle as Obj) },
    ...(semAnimacao ? { animation: false } : {}),
    ...(title ? { title: { ...title, textStyle: { fontSize: 13, fontWeight: 600, color: textPrimary, ...(title.textStyle as Obj) } } } : {}),
    ...(legend
      ? {
          legend: {
            itemWidth: 12,
            itemHeight: 10,
            itemGap: 16,
            ...legend,
            textStyle: { fontSize: 11, color: textSecondary, ...(legend.textStyle as Obj) },
          },
        }
      : {}),
    ...(tooltip
      ? {
          tooltip: {
            valueFormatter: (v: unknown) => (typeof v === 'number' ? fmtNumero(v) : String(v ?? '—')),
            borderColor: cssVar('--border'),
            borderWidth: 1,
            padding: [8, 10],
            confine: true,
            ...tooltip,
            textStyle: { fontSize: 11, color: textPrimary, ...(tooltip.textStyle as Obj) },
          },
        }
      : {}),
    // Eixo duplo (ex.: Pareto) chega como array: cada eixo recebe o mesmo estilo.
    xAxis: Array.isArray(o.xAxis) ? (o.xAxis as EixoComEstilo[]).map(estiloEixo) : estiloEixo(o.xAxis as EixoComEstilo),
    yAxis: Array.isArray(o.yAxis) ? (o.yAxis as EixoComEstilo[]).map(estiloEixo) : estiloEixo(o.yAxis as EixoComEstilo),
  }
}

/** Wrapper fino: init/setOption/ResizeObserver/dispose, com a identidade visual já aplicada. */
export default function EChart({ option, height = 320, carregando, vazio, mensagemVazio = 'Sem dados no recorte.', descricao }: EChartProps) {
  const ref = useRef<HTMLDivElement>(null)
  const instancia = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!ref.current) return
    const chart = echarts.init(ref.current, undefined, { renderer: 'svg' })
    instancia.current = chart
    const observer = new ResizeObserver(() => chart.resize())
    observer.observe(ref.current)
    return () => {
      observer.disconnect()
      chart.dispose()
      instancia.current = null
    }
  }, [])

  useEffect(() => {
    const chart = instancia.current
    if (!chart) return
    // Sem dados: limpa o gráfico anterior em vez de deixá-lo por baixo do aviso.
    if (vazio) chart.clear()
    else if (!carregando) chart.setOption(comIdentidadeVisual(option), true)
  }, [option, vazio, carregando])

  const mostrandoGrafico = !vazio && !carregando

  return (
    <div className="relative min-w-0" style={{ height }}>
      <div
        ref={ref}
        className="h-full w-full"
        role={mostrandoGrafico ? 'img' : undefined}
        aria-label={mostrandoGrafico ? descricao : undefined}
        aria-hidden={mostrandoGrafico ? undefined : true}
      />
      {carregando && (
        <div role="status" className="absolute inset-0 flex items-center justify-center bg-chart-background/80 text-sm text-text-secondary">
          Carregando…
        </div>
      )}
      {!carregando && vazio && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-text-secondary">{mensagemVazio}</div>
      )}
    </div>
  )
}
