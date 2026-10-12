import { useMemo } from 'react'
import { useExportar } from '../api/queries'
import { useUltimoSucesso } from '../api/useUltimoSucesso'
import { useAuth } from '../auth/AuthProvider'
import Calendario from '../components/Calendario'
import EChart from '../components/charts/EChart'
import CardHeader from '../components/ui/CardHeader'
import ChartCard from '../components/ui/ChartCard'
import EstadoTela from '../components/ui/EstadoTela'
import { IconeBarras, IconeBloqueio, IconeEspera, IconeImpacto, IconeRegistros, IconeRelogio } from '../components/ui/icons/KpiIcons'
import KpiCard from '../components/ui/KpiCard'
import { esperaPtsPorArea, hhAndaimePorTipo, hhPorDia, paretoImpactos, rdcsPorStatus } from '../domain/diagnostico'
import { filtrar } from '../domain/filtros'
import { fmtData, fmtHoras, fmtInteiro, fmtNumero, fmtPercentual } from '../domain/formatters'
import { esperaPts, hhImpacto, hhTrabalhado, hhTrabalhadoPorDisciplina, mediaEsperaPts, tempoImpacto } from '../domain/hh'
import { useFilters } from '../filters/FilterContext'
import { cssVar } from '../styles/cssVar'

const ROTULO_STATUS: Record<string, string> = {
  Rascunho: 'rascunho',
  Enviado: 'aguardando validação',
  'Em revisão': 'em revisão',
  Validado: 'validados',
  Substituído: 'substituídos',
  Cancelado: 'cancelados',
}

const ddmm = (iso: string) => fmtData(iso).slice(0, 5)

export default function Desempenho() {
  const { admin } = useAuth()
  const { ini, fim, secundarios } = useFilters()
  const consulta = useExportar(admin, ini, fim)
  const { dados: dadosOk, semDados } = useUltimoSucesso(consulta)
  const recorte = useMemo(() => (dadosOk ? filtrar(dadosOk, secundarios) : null), [dadosOk, secundarios])

  // Comparação categórica: barras horizontais ordenadas da maior para a menor.
  const disciplinas = useMemo(
    () => (recorte ? [...hhTrabalhadoPorDisciplina(recorte.atividades).entries()].sort((a, b) => b[1] - a[1]) : []),
    [recorte],
  )
  const andaime = useMemo(() => (recorte ? hhAndaimePorTipo(recorte.atividades) : []), [recorte])
  const dias = useMemo(() => (recorte ? hhPorDia(recorte.rdcs, recorte.atividades) : []), [recorte])
  const pareto = useMemo(() => (recorte ? paretoImpactos(recorte.impactos) : []), [recorte])
  const esperaArea = useMemo(() => (recorte ? esperaPtsPorArea(recorte.rdcs) : []), [recorte])

  const opcaoDisciplina = useMemo(
    () => ({
      tooltip: {
        trigger: 'axis' as const,
        axisPointer: { type: 'shadow' as const },
        valueFormatter: (v: number) => `${fmtHoras(v)} HH`,
      },
      // right reserva espaço para o rótulo "1.234,5 HH" na ponta da barra.
      grid: { left: 12, right: 88, top: 8, bottom: 8, containLabel: true },
      xAxis: { type: 'value' as const, min: 0 },
      yAxis: {
        type: 'category' as const,
        inverse: true,
        data: disciplinas.map(([nome]) => nome),
        axisTick: { show: false },
        axisLabel: { fontSize: 12, margin: 12 },
      },
      series: [
        {
          name: 'HH trabalhado',
          type: 'bar' as const,
          barMaxWidth: 22,
          data: disciplinas.map(([, hh]) => hh),
          itemStyle: { color: cssVar('--actual'), borderRadius: [0, 2, 2, 0] },
          label: {
            show: true,
            position: 'right' as const,
            color: cssVar('--text-primary'),
            fontSize: 12,
            fontWeight: 600,
            formatter: (p: { value: number }) => `${fmtHoras(p.value)} HH`,
          },
        },
      ],
    }),
    [disciplinas],
  )

  // Evolução temporal: colunas por dia com RDC (dia sem registro não aparece — não é zero).
  const opcaoDiaria = useMemo(
    () => ({
      tooltip: {
        trigger: 'axis' as const,
        axisPointer: { type: 'shadow' as const },
        valueFormatter: (v: number) => `${fmtHoras(v)} HH`,
      },
      legend: { top: 0, left: 0 },
      grid: { left: 8, right: 16, top: 48, bottom: 8, containLabel: true },
      xAxis: { type: 'category' as const, data: dias.map((d) => ddmm(d.data)), axisTick: { show: false } },
      yAxis: { type: 'value' as const, min: 0, name: 'HH', nameGap: 12 },
      series: [
        {
          name: 'HH trabalhado',
          type: 'bar' as const,
          stack: 'hh',
          barMaxWidth: 28,
          data: dias.map((d) => d.hhTrabalhado),
          itemStyle: { color: cssVar('--actual') },
        },
        {
          name: 'HH de impacto',
          type: 'bar' as const,
          stack: 'hh',
          barMaxWidth: 28,
          data: dias.map((d) => d.hhImpacto),
          itemStyle: { color: cssVar('--impact'), borderRadius: [2, 2, 0, 0] },
        },
      ],
    }),
    [dias],
  )

  // Pareto: barras em horas (eixo esquerdo) + % acumulado (eixo direito, 0–100%) com referência de 80%.
  const opcaoPareto = useMemo(
    () => ({
      tooltip: {
        trigger: 'axis' as const,
        axisPointer: { type: 'shadow' as const },
        formatter: (ps: Array<{ dataIndex: number }>) => {
          const item = pareto[ps[0]?.dataIndex ?? 0]
          if (!item) return ''
          return `<strong>${item.descricao.replace(/</g, '&lt;')}</strong><br/>${fmtHoras(item.horas)} h · ${fmtInteiro(item.ocorrencias)} ocorrência(s)<br/>Acumulado: ${fmtNumero(item.acumulado)}%`
        },
      },
      legend: { top: 0, left: 0 },
      grid: { left: 8, right: 8, top: 40, bottom: 8, containLabel: true },
      xAxis: {
        type: 'category' as const,
        data: pareto.map((p) => p.descricao),
        axisTick: { show: false },
        axisLabel: { interval: 0, width: 84, overflow: 'truncate' as const, fontSize: 11 },
      },
      yAxis: [
        { type: 'value' as const, min: 0, name: 'h', nameGap: 12 },
        {
          type: 'value' as const,
          min: 0,
          max: 100,
          interval: 20,
          splitLine: { show: false },
          axisLabel: { formatter: (v: number) => `${fmtNumero(v)}%` },
        },
      ],
      series: [
        {
          name: 'Tempo de impacto (h)',
          type: 'bar' as const,
          barMaxWidth: 36,
          data: pareto.map((p) => p.horas),
          itemStyle: { color: cssVar('--impact'), borderRadius: [2, 2, 0, 0] },
        },
        {
          name: '% acumulado',
          type: 'line' as const,
          yAxisIndex: 1,
          data: pareto.map((p) => p.acumulado),
          symbolSize: 6,
          itemStyle: { color: cssVar('--text-primary') },
          lineStyle: { width: 2 },
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { type: 'dashed' as const, color: cssVar('--axis'), width: 1 },
            label: { formatter: '80%', position: 'insideEndTop' as const, color: cssVar('--text-secondary'), fontSize: 11 },
            data: [{ yAxis: 80 }],
          },
        },
      ],
    }),
    [pareto],
  )

  const opcaoEspera = useMemo(
    () => ({
      tooltip: {
        trigger: 'axis' as const,
        axisPointer: { type: 'shadow' as const },
        formatter: (ps: Array<{ dataIndex: number }>) => {
          const item = esperaArea[ps[0]?.dataIndex ?? 0]
          if (!item) return ''
          return `<strong>${item.area.replace(/</g, '&lt;')}</strong><br/>Média: ${fmtInteiro(item.mediaMin)} min<br/>${fmtInteiro(item.comEspera)} RDC com espera informada`
        },
      },
      grid: { left: 12, right: 72, top: 8, bottom: 8, containLabel: true },
      xAxis: { type: 'value' as const, min: 0, name: 'min', nameGap: 8 },
      yAxis: {
        type: 'category' as const,
        inverse: true,
        data: esperaArea.map((e) => e.area),
        axisTick: { show: false },
        axisLabel: { fontSize: 12, width: 150, overflow: 'truncate' as const },
      },
      series: [
        {
          name: 'Espera média',
          type: 'bar' as const,
          barMaxWidth: 22,
          data: esperaArea.map((e) => e.mediaMin),
          itemStyle: { color: cssVar('--actual'), borderRadius: [0, 2, 2, 0] },
          label: {
            show: true,
            position: 'right' as const,
            color: cssVar('--text-primary'),
            fontSize: 12,
            fontWeight: 600,
            formatter: (p: { value: number }) => `${fmtInteiro(p.value)} min`,
          },
        },
      ],
    }),
    [esperaArea],
  )

  if (!recorte) return <EstadoTela erro={semDados} />

  const hhT = hhTrabalhado(recorte.atividades)
  const hhI = hhImpacto(recorte.rdcs)
  const tImp = tempoImpacto(recorte.impactos)
  const espera = esperaPts(recorte.rdcs)
  const mediaEspera = mediaEsperaPts(espera)
  const bloqueios = recorte.rdcs.filter((r) => r.bloqueio === true).length
  const porStatus = rdcsPorStatus(recorte.rdcs)
  const primeiroAcima80 = pareto.findIndex((p) => p.acumulado >= 80)

  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Indicadores do recorte" className="grid grid-cols-1 gap-3 @[22rem]:grid-cols-2 @[40rem]:grid-cols-3 @[66rem]:grid-cols-6">
        <KpiCard
          icone={<IconeBarras />}
          rotulo="HH trabalhado"
          valor={fmtHoras(hhT)}
          unidade="HH"
          titulo="Soma de efetivo × duração nas atividades do recorte"
        />
        <KpiCard
          icone={<IconeImpacto />}
          rotulo="HH de impacto estimado"
          valor={fmtHoras(hhI)}
          unidade="HH"
          contexto={hhT > 0 ? `Equivale a ${fmtPercentual(hhI / hhT)} do HH trabalhado` : undefined}
          titulo="Duração do impacto × maior efetivo do RDC. A proporção só compara as duas grandezas; não existe meta cadastrada."
        />
        <KpiCard
          icone={<IconeRelogio />}
          rotulo="Tempo de impacto"
          valor={fmtHoras(tImp)}
          unidade="h"
          contexto={`${fmtInteiro(recorte.impactos.length)} impacto(s) registrados`}
          titulo="Soma das durações de impacto — intervalos simultâneos se somam"
        />
        <KpiCard
          icone={<IconeEspera />}
          rotulo="Espera PTS (média)"
          valor={mediaEspera == null ? '—' : fmtHoras(mediaEspera)}
          unidade={mediaEspera == null ? undefined : 'h'}
          contexto={`${fmtInteiro(espera.comEspera.length)} com espera · ${fmtInteiro(espera.semPts)} sem PTS · ${fmtInteiro(espera.ptsSemHorario)} PTS sem horário`}
          titulo="Média das esperas informadas nos RDC com PTS. Sem PTS e PTS sem horário são estados distintos e ficam fora da média."
        />
        <KpiCard icone={<IconeBloqueio />} rotulo="Bloqueios" valor={fmtInteiro(bloqueios)} contexto="RDC que registraram bloqueio" />
        <KpiCard
          icone={<IconeRegistros />}
          rotulo="Registros no recorte"
          valor={fmtInteiro(recorte.rdcs.length)}
          contexto={porStatus.map(([s, n]) => `${fmtInteiro(n)} ${ROTULO_STATUS[s] ?? s}`).join(' · ') || 'RDC após os filtros'}
          titulo="RDC após os filtros, por status"
        />
      </section>

      <section aria-labelledby="diag-titulo" className="flex flex-col gap-3">
        <div>
          <h2 id="diag-titulo" className="text-base font-semibold text-text-primary">
            Diagnóstico operacional
          </h2>
          <p className="text-xs text-text-secondary">
            Período {fmtData(ini)} a {fmtData(fim)} e filtros atuais. Sem metas: nenhuma está cadastrada no banco.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 @[64rem]:grid-cols-2">
          <ChartCard className="min-w-0">
            <CardHeader
              nivel="h3"
              titulo="Evolução diária: HH trabalhado × HH de impacto"
              subtitulo={`${fmtInteiro(dias.length)} dia(s) com RDC no recorte. Dia sem registro não aparece (não é zero).`}
            />
            <EChart
              option={opcaoDiaria}
              vazio={dias.length === 0}
              mensagemVazio="Nenhum RDC no recorte."
              height={300}
              descricao={`HH trabalhado e HH de impacto por dia: ${dias
                .map((d) => `${fmtData(d.data)}, ${fmtHoras(d.hhTrabalhado)} HH trabalhado e ${fmtHoras(d.hhImpacto)} HH de impacto`)
                .join('; ')}.`}
            />
          </ChartCard>

          <ChartCard className="min-w-0">
            <CardHeader nivel="h3" titulo="HH trabalhado por disciplina" subtitulo="Homem-hora (HH), ordenado do maior para o menor" />
            <EChart
              option={opcaoDisciplina}
              vazio={disciplinas.length === 0}
              mensagemVazio="Nenhuma atividade no recorte."
              // Mesma altura útil do card vizinho (Evolução diária), descontada a linha do ANDAIME.
              height={Math.max(andaime.length ? 268 : 300, disciplinas.length * 40 + 32)}
              descricao={`HH trabalhado por disciplina: ${disciplinas.map(([d, hh]) => `${d} ${fmtHoras(hh)} HH`).join('; ')}.`}
            />
            {andaime.length > 0 && (
              <p className="mt-2 border-t border-border pt-2 text-xs text-text-secondary">
                <span className="font-semibold text-text-primary">ANDAIME por tipo:</span>{' '}
                {andaime.map(([tipo, hh]) => `${tipo} ${fmtHoras(hh)} HH`).join(' · ')}
              </p>
            )}
          </ChartCard>

          <ChartCard className="min-w-0">
            <CardHeader
              nivel="h3"
              titulo="Pareto dos impactos"
              subtitulo="Tempo de impacto (h) por descrição informada no RDC, agrupada sem diferenciar maiúsculas e espaços. Linha: % acumulado; tracejado: 80%."
            />
            <EChart
              option={opcaoPareto}
              vazio={pareto.length === 0}
              mensagemVazio="Nenhum impacto no recorte."
              height={320}
              descricao={`Pareto do tempo de impacto: ${pareto
                .map((p) => `${p.descricao}, ${fmtHoras(p.horas)} h, acumulado ${fmtNumero(p.acumulado)}%`)
                .join('; ')}.`}
            />
            {primeiroAcima80 >= 0 && pareto.length > 1 && (
              <p className="mt-2 border-t border-border pt-2 text-xs text-text-secondary">
                {primeiroAcima80 === 0
                  ? `"${pareto[0].descricao}" sozinho soma ${fmtNumero(pareto[0].acumulado)}% do tempo de impacto.`
                  : `As ${primeiroAcima80 + 1} primeiras causas somam ${fmtNumero(pareto[primeiroAcima80].acumulado)}% do tempo de impacto.`}
              </p>
            )}
          </ChartCard>

          <ChartCard className="min-w-0">
            <CardHeader
              nivel="h3"
              titulo="Espera média de PTS por área"
              subtitulo={`Minutos, só RDC com PTS e os dois horários informados (${fmtInteiro(espera.comEspera.length)} no recorte). Sem SLA cadastrado.`}
            />
            <EChart
              option={opcaoEspera}
              vazio={esperaArea.length === 0}
              mensagemVazio="Nenhum RDC com espera de PTS informada."
              // Alinha com o Pareto ao lado (gráfico de 320 px + nota).
              height={Math.max(352, esperaArea.length * 40 + 40)}
              descricao={`Espera média de PTS por área: ${esperaArea
                .map((e) => `${e.area}, ${fmtInteiro(e.mediaMin)} minutos em ${fmtInteiro(e.comEspera)} RDC`)
                .join('; ')}.`}
            />
          </ChartCard>
        </div>
      </section>

      <Calendario rdcs={recorte.rdcs} ini={ini} fim={fim} />
    </div>
  )
}
