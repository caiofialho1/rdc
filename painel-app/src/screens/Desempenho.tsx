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
import { filtrar } from '../domain/filtros'
import { fmtHoras, fmtInteiro } from '../domain/formatters'
import { esperaPts, hhImpacto, hhTrabalhado, hhTrabalhadoPorDisciplina, mediaEsperaPts, tempoImpacto } from '../domain/hh'
import { useFilters } from '../filters/FilterContext'
import { cssVar } from '../styles/cssVar'

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

  if (!recorte) return <EstadoTela erro={semDados} />

  const hhT = hhTrabalhado(recorte.atividades)
  const hhI = hhImpacto(recorte.rdcs)
  const tImp = tempoImpacto(recorte.impactos)
  const espera = esperaPts(recorte.rdcs)
  const mediaEspera = mediaEsperaPts(espera)
  const bloqueios = recorte.rdcs.filter((r) => r.bloqueio === true).length

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
          titulo="Duração do impacto × maior efetivo do RDC"
        />
        <KpiCard
          icone={<IconeRelogio />}
          rotulo="Tempo de impacto"
          valor={fmtHoras(tImp)}
          unidade="h"
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
        <KpiCard icone={<IconeRegistros />} rotulo="Registros no recorte" valor={fmtInteiro(recorte.rdcs.length)} contexto="RDC após os filtros" />
      </section>

      <ChartCard>
        <CardHeader titulo="HH trabalhado por disciplina" subtitulo="Homem-hora (HH), ordenado do maior para o menor" />
        <EChart
          option={opcaoDisciplina}
          vazio={disciplinas.length === 0}
          mensagemVazio="Nenhuma atividade no recorte."
          height={Math.max(160, disciplinas.length * 40 + 32)}
          descricao={`HH trabalhado por disciplina: ${disciplinas.map(([d, hh]) => `${d} ${fmtHoras(hh)} HH`).join('; ')}.`}
        />
      </ChartCard>

      <Calendario rdcs={recorte.rdcs} ini={ini} fim={fim} />
    </div>
  )
}
