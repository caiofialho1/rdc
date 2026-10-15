/**
 * Tela inicial "Painel executivo": layout do protótipo Stitch (KPIs →
 * pendências → diagnóstico → ranking → detalhamento, preto + verde PPL)
 * alimentado pelos mesmos dados reais e fórmulas das outras telas. Fica fora
 * do protótipo o que não existe no banco: metas, SLA, tolerâncias, turno,
 * número de PTS/LOTO e classificações de desempenho (BUSINESS_MODEL.md).
 * As pendências vieram da antiga tela Contexto, que esta substituiu.
 */
import { useMemo, useState, type ReactNode } from 'react'
import { useExportar } from '../api/queries'
import { useUltimoSucesso } from '../api/useUltimoSucesso'
import type { RdcRow } from '../api/schemas'
import { useAuth } from '../auth/AuthProvider'
import Calendario from '../components/Calendario'
import EChart from '../components/charts/EChart'
import EstadoTela from '../components/ui/EstadoTela'
import { IconeBarras, IconeBloqueio, IconeEspera, IconeImpacto, IconeRegistros } from '../components/ui/icons/KpiIcons'
import { Card, Kpi, Secao } from '../components/exec/ExecUi'
import Responsavel from '../components/ui/Responsavel'
import type { TelaProps } from '../components/ui/telas'
import {
  disciplinasPorRdc,
  esperaPtsPorArea,
  fotosPorRdc,
  hhAndaimePorTipo,
  hhPorDia,
  paretoImpactos,
  rankingResponsaveis,
  rdcsPorStatus,
} from '../domain/diagnostico'
import { estenderFimMesSeAplicavel } from '../domain/calendario'
import { isoDia } from '../domain/ciclo'
import { filtrar } from '../domain/filtros'
import { fmtData, fmtHoras, fmtInteiro, fmtNumero, fmtPercentual } from '../domain/formatters'
import { META_ESPERA_PTS_MIN, esperaMaximaPts, esperaPts, hhImpacto, hhTrabalhado, hhTrabalhadoPorDisciplina, mediaEsperaPts } from '../domain/hh'
import { pendencias } from '../domain/pendencias'
import { useFilters } from '../filters/FilterContext'
import { cssVar } from '../styles/cssVar'

const NOME_DISCIPLINA: Record<string, string> = {
  ANDAIME: 'ANDAIME (Montagem / Desmontagem)',
  REC: 'REC (Recuperação Estrutural)',
  PAC: 'PAC (Pintura Anticorrosiva)',
  'TEL/COB': 'TEL / COB (Telhamento & Cobertura)',
}
const COR_DISCIPLINA: Record<string, `--${string}`> = {
  ANDAIME: '--exec-ink',
  REC: '--exec-graphite',
  PAC: '--exec-marca',
  'TEL/COB': '--exec-outline',
}
const CHIP_STATUS: Record<RdcRow['status'], string> = {
  Validado: 'exec-chip--prod',
  Enviado: 'exec-chip--alert',
  'Em revisão': 'exec-chip--info',
  Rascunho: '',
  Substituído: '',
  Cancelado: 'exec-chip--impact',
}
const ROTULO_STATUS: Record<RdcRow['status'], string> = {
  Validado: 'Validado',
  Enviado: 'Aguardando validação',
  'Em revisão': 'Revisão liberada',
  Rascunho: 'Rascunho',
  Substituído: 'Substituído',
  Cancelado: 'Cancelado',
}
const POR_PAGINA = [10, 25, 50, 100]
const ddmm = (iso: string) => fmtData(iso).slice(0, 5)

/** Pendência: contagem + rótulo sempre visíveis; a borda colorida só reforça (zero = neutro). */
function Pendencia({ qtd, cor, rotulo, descricao, acao }: { qtd: number; cor: `--${string}`; rotulo: string; descricao: string; acao?: ReactNode }) {
  return (
    <div className="exec-card gap-1 border-l-4" style={{ borderLeftColor: qtd ? `var(${cor})` : 'var(--exec-border)' }}>
      <p className="text-sm">
        <strong className="exec-kpi__valor mr-1.5 align-baseline">{fmtInteiro(qtd)}</strong>
        {rotulo}
      </p>
      <p className="text-xs text-[var(--exec-text-2)]">{descricao}</p>
      {acao && qtd > 0 && <div className="mt-1">{acao}</div>}
    </div>
  )
}

function PtsBloqueio({ rdc }: { rdc: RdcRow }) {
  const itens: ReactNode[] = []
  if (rdc.pts === true)
    itens.push(
      <span key="pts" className="exec-chip exec-chip--info">
        PTS{rdc.espera_pts_min == null ? ' · sem horário' : ` · ${fmtInteiro(rdc.espera_pts_min)} min`}
      </span>,
    )
  else if (rdc.pts === false)
    itens.push(
      <span key="pts" className="exec-chip">
        Sem PTS
      </span>,
    )
  if (rdc.bloqueio === true)
    itens.push(
      <span key="blq" className="exec-chip exec-chip--marca">
        Bloqueio{rdc.bloqueio_ativo ? ` · ${rdc.bloqueio_ativo}` : ''}
      </span>,
    )
  return itens.length ? <span className="flex flex-col items-center gap-1">{itens}</span> : <>—</>
}

export default function Executivo({ irPara }: TelaProps) {
  const { admin } = useAuth()
  const { ini, fim, secundarios, definirSecundario } = useFilters()
  const consulta = useExportar(admin, ini, fim)
  const { dados: dadosOk, semDados } = useUltimoSucesso(consulta)
  const recorte = useMemo(() => (dadosOk ? filtrar(dadosOk, secundarios) : null), [dadosOk, secundarios])
  const [porPagina, setPorPagina] = useState(25)
  const [pagina, setPagina] = useState(0)
  // Data de hoje fixada na montagem (só estende o calendário até o fim do mês corrente).
  const [hoje] = useState(() => isoDia(new Date()))

  const dias = useMemo(() => (recorte ? hhPorDia(recorte.rdcs, recorte.atividades) : []), [recorte])
  const disciplinas = useMemo(
    () => (recorte ? [...hhTrabalhadoPorDisciplina(recorte.atividades).entries()].sort((a, b) => b[1] - a[1]) : []),
    [recorte],
  )
  const andaime = useMemo(() => (recorte ? hhAndaimePorTipo(recorte.atividades) : []), [recorte])
  const pareto = useMemo(() => (recorte ? paretoImpactos(recorte.impactos) : []), [recorte])
  const esperaArea = useMemo(() => (recorte ? esperaPtsPorArea(recorte.rdcs) : []), [recorte])
  const resumo = useMemo(() => (recorte ? pendencias(recorte.rdcs) : null), [recorte])
  const ranking = useMemo(() => (recorte ? rankingResponsaveis(recorte.rdcs, recorte.atividades) : []), [recorte])
  const discRdc = useMemo(() => disciplinasPorRdc(dadosOk?.atividades ?? []), [dadosOk])
  const fotosRdc = useMemo(() => fotosPorRdc(recorte?.fotos ?? []), [recorte])
  const linhas = useMemo(
    () => (recorte ? [...recorte.rdcs].sort((a, b) => b.data_rdc.localeCompare(a.data_rdc) || b.codigo.localeCompare(a.codigo)) : []),
    [recorte],
  )

  const opcaoDiaria = useMemo(
    () => ({
      tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const }, valueFormatter: (v: number) => `${fmtHoras(v)} HH` },
      legend: { top: 0, right: 0 },
      grid: { left: 8, right: 8, top: 40, bottom: 8, containLabel: true },
      xAxis: { type: 'category' as const, data: dias.map((d) => ddmm(d.data)), axisTick: { show: false } },
      yAxis: { type: 'value' as const, min: 0, name: 'HH', nameGap: 12 },
      series: [
        { name: 'HH trabalhado', type: 'bar' as const, stack: 'hh', barMaxWidth: 28, data: dias.map((d) => d.hhTrabalhado), itemStyle: { color: cssVar('--exec-ink-2') } },
        {
          name: 'HH de impacto',
          type: 'bar' as const,
          stack: 'hh',
          barMaxWidth: 28,
          data: dias.map((d) => d.hhImpacto),
          itemStyle: { color: cssVar('--exec-impact'), borderRadius: [2, 2, 0, 0] },
        },
      ],
    }),
    [dias],
  )

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
      legend: { top: 0, right: 0 },
      grid: { left: 8, right: 8, top: 40, bottom: 8, containLabel: true },
      xAxis: { type: 'category' as const, data: pareto.map((p) => p.descricao), axisTick: { show: false }, axisLabel: { interval: 0, width: 84, overflow: 'truncate' as const, fontSize: 10 } },
      yAxis: [
        { type: 'value' as const, min: 0, name: 'h', nameGap: 12 },
        { type: 'value' as const, min: 0, max: 100, interval: 20, splitLine: { show: false }, axisLabel: { formatter: (v: number) => `${fmtNumero(v)}%` } },
      ],
      series: [
        {
          name: 'Tempo de impacto (h)',
          type: 'bar' as const,
          barMaxWidth: 40,
          data: pareto.map((p) => p.horas),
          itemStyle: { color: cssVar('--exec-impact'), borderRadius: [3, 3, 0, 0] },
          label: { show: pareto.length <= 6, position: 'top' as const, fontSize: 10, fontWeight: 700, color: cssVar('--exec-impact'), formatter: (p: { value: number }) => `${fmtHoras(p.value)}h` },
        },
        {
          name: '% acumulado',
          type: 'line' as const,
          yAxisIndex: 1,
          data: pareto.map((p) => p.acumulado),
          symbolSize: 7,
          itemStyle: { color: cssVar('--exec-info') },
          lineStyle: { width: 2.5 },
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { type: 'dashed' as const, color: cssVar('--exec-marca'), width: 1.5 },
            label: { formatter: '80%', position: 'insideEndTop' as const, color: cssVar('--exec-marca-text'), fontSize: 10, fontWeight: 700 },
            data: [{ yAxis: 80 }],
          },
        },
      ],
    }),
    [pareto],
  )

  if (!recorte || !resumo) return <EstadoTela erro={semDados} />

  const hhT = hhTrabalhado(recorte.atividades)
  const hhI = hhImpacto(recorte.rdcs)
  const espera = esperaPts(recorte.rdcs)
  const mediaEspera = mediaEsperaPts(espera)
  const esperaMax = esperaMaximaPts(recorte.rdcs)
  const esperaMaxAcima = esperaMax != null && esperaMax.maxMin > META_ESPERA_PTS_MIN
  const comBloqueio = recorte.rdcs.filter((r) => r.bloqueio === true).length
  const bloqueioDeclarado = recorte.rdcs.filter((r) => r.bloqueio != null).length
  const porStatus = new Map(rdcsPorStatus(recorte.rdcs))
  const validados = porStatus.get('Validado') ?? 0
  const totalRdc = recorte.rdcs.length
  const mediaDia = dias.length ? dias.reduce((s, d) => s + d.hhTrabalhado, 0) / dias.length : null
  const primeiroAcima80 = pareto.findIndex((p) => p.acumulado >= 80)
  // A escala sempre inclui a meta, para a marca de 40 min caber no trilho.
  const escalaEspera = Math.max(15, Math.ceil(Math.max(META_ESPERA_PTS_MIN + 5, ...esperaArea.map((e) => e.mediaMin)) / 15) * 15)
  const totalPaginas = Math.max(1, Math.ceil(linhas.length / porPagina))
  const paginaAtual = Math.min(pagina, totalPaginas - 1)
  const visiveis = linhas.slice(paginaAtual * porPagina, (paginaAtual + 1) * porPagina)
  const periodo = `${fmtData(ini)} a ${fmtData(fim)}`
  const fimCalendario = estenderFimMesSeAplicavel(fim, hoje)

  return (
    <div className="exec flex flex-col gap-6">
      {/* 1. Indicadores consolidados */}
      <Secao
        id="exec-kpis"
        titulo="Indicadores consolidados"
        sub={`Realizado no recorte. Só a espera de PTS tem meta (máx. ${META_ESPERA_PTS_MIN} min, definida pelo planejamento); os demais indicadores não têm meta cadastrada.`}
        extra={<span className="exec-chip">Período {periodo}</span>}
      >
        <div className="grid grid-cols-1 gap-3.5 @[36rem]:grid-cols-2 @[60rem]:grid-cols-3 @[96rem]:grid-cols-6">
          <Kpi
            rotulo="Total HH trabalhado"
            icone={<IconeBarras />}
            valor={fmtHoras(hhT)}
            unidade="HH"
            linha={mediaDia == null ? 'Nenhum dia com RDC' : `Média: ${fmtHoras(mediaDia)} HH por dia com RDC`}
            rodape={<span>{fmtInteiro(dias.length)} dia(s) com RDC</span>}
          />
          <Kpi
            rotulo="HH impacto / parada"
            icone={<IconeImpacto />}
            valor={fmtHoras(hhI)}
            unidade="HH"
            linha={hhT > 0 ? `Equivale a ${fmtPercentual(hhI / hhT)} do HH trabalhado` : '—'}
            rodape={
              <>
                <span className="exec-chip exec-chip--impact">{fmtInteiro(recorte.impactos.length)} impacto(s)</span>
                <span>Sem tolerância cadastrada</span>
              </>
            }
          />
          <Kpi
            rotulo="Total de RDC emitidos"
            icone={<IconeRegistros />}
            valor={fmtInteiro(totalRdc)}
            unidade="relatórios"
            linha={
              <span className="flex flex-wrap gap-x-2">
                <span className="font-semibold text-[var(--exec-prod)]">{fmtInteiro(validados)} val</span>·
                <span className="font-semibold text-[var(--exec-alert)]">{fmtInteiro(porStatus.get('Enviado') ?? 0)} pend</span>·
                <span className="font-semibold text-[var(--exec-info)]">{fmtInteiro(porStatus.get('Em revisão') ?? 0)} rev</span>
              </span>
            }
            rodape={totalRdc > 0 && <span className="exec-chip exec-chip--prod">{fmtPercentual(validados / totalRdc)} validados</span>}
          />
          <Kpi
            rotulo="Espera média de PTS"
            icone={<IconeEspera />}
            valor={mediaEspera == null ? '—' : fmtInteiro(mediaEspera * 60)}
            unidade={mediaEspera == null ? undefined : 'min'}
            linha={`${fmtInteiro(espera.comEspera.length)} RDC com espera informada`}
            rodape={
              <span>
                {fmtInteiro(espera.semPts)} sem PTS · {fmtInteiro(espera.ptsSemHorario)} PTS sem horário
              </span>
            }
          />
          <Kpi
            rotulo="Espera máxima de PTS"
            icone={<IconeEspera />}
            valor={esperaMax == null ? '—' : fmtInteiro(esperaMax.maxMin)}
            unidade={esperaMax == null ? undefined : 'min'}
            linha={
              esperaMax == null ? (
                'Nenhuma espera informada'
              ) : esperaMaxAcima ? (
                <span className="font-semibold text-[var(--exec-impact)]">▲ Acima da meta de {META_ESPERA_PTS_MIN} min</span>
              ) : (
                <span className="font-semibold text-[var(--exec-prod)]">✓ Dentro da meta de {META_ESPERA_PTS_MIN} min</span>
              )
            }
            rodape={
              esperaMax != null && (
                <span className={`exec-chip ${esperaMax.acimaMeta > 0 ? 'exec-chip--impact' : 'exec-chip--prod'}`}>
                  {fmtInteiro(esperaMax.acimaMeta)} de {fmtInteiro(esperaMax.comEspera)} RDC acima de {META_ESPERA_PTS_MIN} min
                </span>
              )
            }
          />
          <Kpi
            rotulo="Bloqueios registrados"
            icone={<IconeBloqueio />}
            valor={fmtInteiro(comBloqueio)}
            unidade="RDC"
            linha={`${fmtInteiro(bloqueioDeclarado)} RDC responderam sobre bloqueio`}
            rodape={<span>{fmtInteiro(totalRdc - bloqueioDeclarado)} sem declaração (—)</span>}
          />
        </div>
      </Secao>

      {/* Pendências (antiga tela Contexto) */}
      <Secao id="exec-pendencias" titulo="Pendências do recorte" sub="Ações de planejamento e validação sobre os RDC do período e filtros atuais.">
        <div className="grid grid-cols-1 gap-3.5 @[40rem]:grid-cols-3">
          <Pendencia
            qtd={resumo.aguardandoValidacao.length}
            cor="--exec-info"
            rotulo="aguardando validação"
            descricao="RDC com status Enviado, ainda sem decisão do administrador."
            acao={
              irPara && (
                <button
                  type="button"
                  className="se-button se-button--outline se-button--sm"
                  onClick={() => {
                    definirSecundario('status', 'Enviado')
                    irPara('detalhamento')
                  }}
                >
                  Ver no Detalhamento
                </button>
              )
            }
          />
          <Pendencia
            qtd={resumo.semContrato.length}
            cor="--exec-alert"
            rotulo="sem contrato"
            descricao="RDC sem número de contrato; podem ser corrigidos em lote no Detalhamento."
          />
          <Pendencia
            qtd={resumo.ptsSemEspera.length}
            cor="--exec-alert"
            rotulo="com PTS sem espera informada"
            descricao="Declararam PTS, mas sem os horários de solicitação e abertura."
          />
        </div>
      </Secao>

      {/* 2. Diagnóstico */}
      <Secao
        id="exec-diag"
        titulo="Diagnóstico operacional e análise de produtividade"
        sub="Curvas de HH, ofensores de impacto e espera de PTS no recorte"
        extra={<span className="exec-chip">{fmtInteiro(dias.length)} dia(s) com RDC</span>}
      >
        <div className="grid grid-cols-1 gap-4 @[64rem]:grid-cols-2">
          <Card
            titulo="Evolução diária: HH trabalhado × HH de impacto"
            sub={`Por data do RDC · ${periodo}. Dia sem RDC não aparece.`}
            rodape={<span>Média: <strong className="tabular text-[var(--exec-ink)]">{mediaDia == null ? '—' : `${fmtHoras(mediaDia)} HH/dia`}</strong></span>}
          >
            <EChart
              option={opcaoDiaria}
              vazio={dias.length === 0}
              mensagemVazio="Nenhum RDC no recorte."
              height={260}
              descricao={`HH por dia: ${dias.map((d) => `${fmtData(d.data)} ${fmtHoras(d.hhTrabalhado)} HH trabalhado e ${fmtHoras(d.hhImpacto)} HH de impacto`).join('; ')}.`}
            />
          </Card>

          <Card
            titulo="Distribuição de HH por disciplina"
            sub="Ordenada do maior para o menor, com tipos de andaime"
            extra={<span className="exec-chip tabular">Total: {fmtHoras(hhT)} HH</span>}
            rodape={<span>Percentuais sobre o HH trabalhado do recorte</span>}
          >
            {disciplinas.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--exec-text-2)]">Nenhuma atividade no recorte.</p>
            ) : (
              <ul className="flex flex-col gap-3.5">
                {disciplinas.map(([d, hh]) => {
                  const pct = hhT > 0 ? hh / hhT : 0
                  const cor = `var(${COR_DISCIPLINA[d] ?? '--exec-outline'})`
                  return (
                    <li key={d}>
                      <div className="mb-1 flex flex-wrap items-center justify-between gap-x-3 text-[12px]">
                        <span className="flex items-center gap-1.5 font-semibold">
                          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-[2px]" style={{ background: cor }} />
                          {NOME_DISCIPLINA[d] ?? d}
                        </span>
                        <span className="tabular font-bold">
                          {fmtHoras(hh)} HH <span className="font-normal text-[var(--exec-text-2)]">({fmtPercentual(pct)})</span>
                        </span>
                      </div>
                      <div className="exec-barra" aria-hidden="true">
                        <span style={{ width: `${pct * 100}%`, background: cor }} />
                      </div>
                      {d === 'ANDAIME' && andaime.length > 0 && (
                        <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 border-l-2 border-[var(--exec-border)] pl-4 text-[10px] text-[var(--exec-text-2)]">
                          {andaime.map(([tipo, h]) => (
                            <span key={tipo}>
                              {tipo}: <strong className="tabular text-[var(--exec-ink)]">{fmtHoras(h)} HH</strong>
                            </span>
                          ))}
                        </p>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          <Card
            titulo="Pareto de ofensores de impacto"
            sub={`Tempo de impacto por tipo informado no RDC · ${fmtHoras(pareto.reduce((s, p) => s + p.horas, 0))} h no recorte`}
            extra={<span className="exec-chip exec-chip--marca">Referência 80%</span>}
            rodape={
              primeiroAcima80 >= 0 && pareto.length > 1 ? (
                <span className="font-semibold text-[var(--exec-info)]">
                  {primeiroAcima80 === 0
                    ? `"${pareto[0].descricao}" sozinho soma ${fmtNumero(pareto[0].acumulado)}%`
                    : `As ${primeiroAcima80 + 1} primeiras causas somam ${fmtNumero(pareto[primeiroAcima80].acumulado)}%`}
                </span>
              ) : undefined
            }
          >
            <EChart
              option={opcaoPareto}
              vazio={pareto.length === 0}
              mensagemVazio="Nenhum impacto no recorte."
              height={280}
              descricao={`Pareto do tempo de impacto: ${pareto.map((p) => `${p.descricao} ${fmtHoras(p.horas)} h, acumulado ${fmtNumero(p.acumulado)}%`).join('; ')}.`}
            />
          </Card>

          <Card
            titulo="Espera média de PTS por área"
            sub={`Média por área · escala de 0 a ${fmtInteiro(escalaEspera)} min; traço verde = meta de ${META_ESPERA_PTS_MIN} min · só RDC com PTS e os dois horários`}
            extra={<span className="exec-chip">Meta: máx. {META_ESPERA_PTS_MIN} min</span>}
            rodape={
              <span>
                RDC com PTS: <strong className="tabular text-[var(--exec-ink)]">{fmtInteiro(espera.comEspera.length + espera.ptsSemHorario)}</strong> ·{' '}
                {fmtInteiro(espera.ptsSemHorario)} sem horário
              </span>
            }
          >
            {esperaArea.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--exec-text-2)]">Nenhum RDC com espera de PTS informada.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {esperaArea.map((e) => (
                  <li key={e.area} className="rounded-control border border-[var(--exec-border)] bg-[var(--exec-surface)] p-3">
                    <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-3">
                      <span className="text-[12px] font-semibold">{e.area}</span>
                      <span className="flex items-center gap-2">
                        <span className={`tabular text-[14px] font-bold ${e.mediaMin > META_ESPERA_PTS_MIN ? 'text-[var(--exec-impact)]' : ''}`}>
                          {e.mediaMin > META_ESPERA_PTS_MIN && <span aria-hidden="true">▲ </span>}
                          {fmtInteiro(e.mediaMin)} min
                        </span>
                        <span className={`exec-chip ${e.maxMin > META_ESPERA_PTS_MIN ? 'exec-chip--impact' : ''}`}>máx. {fmtInteiro(e.maxMin)} min</span>
                        <span className="exec-chip">{fmtInteiro(e.comEspera)} RDC</span>
                      </span>
                    </div>
                    <div className="relative" aria-hidden="true">
                      <div className="exec-barra">
                        <span
                          style={{
                            width: `${(e.mediaMin / escalaEspera) * 100}%`,
                            background: e.mediaMin > META_ESPERA_PTS_MIN ? 'var(--exec-impact)' : 'var(--exec-ink-2)',
                          }}
                        />
                      </div>
                      {/* Marca da meta (40 min) sobre o trilho */}
                      <span
                        className="absolute -top-1 -bottom-1 w-0.5 rounded-full bg-[var(--exec-marca)]"
                        style={{ left: `${(META_ESPERA_PTS_MIN / escalaEspera) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </Secao>

      {/* 3. Ranking dos responsáveis */}
      <Secao id="exec-ranking" titulo="Responsáveis de campo" sub={`Volume de RDC, efetivo e HH por responsável · ${periodo}. Sem classificação: não há meta cadastrada.`}>
        <div className="exec-card exec-card--tabela">
          <div className="overflow-x-auto" role="region" aria-label="Tabela de responsáveis (rolável)" tabIndex={0}>
            <table className="exec-tabela min-w-[860px]">
              <caption className="sr-only">Responsáveis de campo no recorte</caption>
              <thead>
                <tr>
                  <th scope="col" className="fixa">Responsável / encarregado</th>
                  <th scope="col">Área principal</th>
                  <th scope="col" className="num">Total RDC</th>
                  <th scope="col" className="num">Efetivo médio</th>
                  <th scope="col" className="num">HH trabalhado</th>
                  <th scope="col" className="num">HH impacto</th>
                  <th scope="col" className="num">Impacto ÷ trabalhado</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((l) => (
                  <tr key={l.responsavel}>
                    <th scope="row" className="fixa">
                      <Responsavel nome={l.responsavel} tamanho="md" comFuncao />
                    </th>
                    <td className="text-[var(--exec-text-2)]">{l.areaPrincipal ?? '—'}</td>
                    <td className="num font-bold">{fmtInteiro(l.rdcs)}</td>
                    <td className="num">{fmtNumero(l.efetivoMedio)}</td>
                    <td className="num font-bold">{fmtHoras(l.hhTrabalhado)} HH</td>
                    <td className="num font-semibold text-[var(--exec-impact)]">{fmtHoras(l.hhImpacto)} HH</td>
                    <td className="num">{l.hhTrabalhado > 0 ? fmtPercentual(l.hhImpacto / l.hhTrabalhado) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {ranking.length === 0 && <p className="p-6 text-center text-sm text-[var(--exec-text-2)]">Nenhum RDC no recorte.</p>}
          </div>
        </div>
      </Secao>

      {/* 4. Emissão diária (veio da antiga tela Desempenho) */}
      <Secao
        id="exec-emissao"
        titulo="Emissão diária"
        sub={`RDC por responsável e dia, ${fmtData(ini)} a ${fmtData(fimCalendario)}. Dia sem registro não comprova falta.`}
      >
        <div className="exec-card">
          {recorte.rdcs.length > 0 ? (
            <Calendario rdcs={recorte.rdcs} ini={ini} fim={fim} />
          ) : (
            <p className="py-8 text-center text-sm text-[var(--exec-text-2)]">Nenhum RDC no recorte.</p>
          )}
        </div>
      </Secao>

      {/* 5. Detalhamento */}
      <Secao id="exec-detalhe" titulo="Detalhamento dos diários de campo (RDC)" sub="Registros do recorte, mais recentes primeiro. Validação e edição continuam na tela Detalhamento.">
        <div className="exec-card exec-card--tabela">
          <div className="max-h-[36rem] overflow-auto" role="region" aria-label="Tabela de RDC (rolável)" tabIndex={0}>
            <table className="exec-tabela min-w-[1100px]">
              <caption className="sr-only">RDC do recorte</caption>
              <thead>
                <tr>
                  <th scope="col" className="fixa">Código RDC</th>
                  <th scope="col">Data</th>
                  <th scope="col">Contrato</th>
                  <th scope="col">Ativo / área</th>
                  <th scope="col">Responsável</th>
                  <th scope="col">Disciplina</th>
                  <th scope="col" className="num">Fotos (GPS)</th>
                  <th scope="col">PTS / bloqueio</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((r) => {
                  const f = fotosRdc.get(r.codigo)
                  return (
                    <tr key={r.codigo}>
                      <th scope="row" className="fixa font-bold whitespace-nowrap tabular">
                        {r.codigo}
                      </th>
                      <td className="font-bold whitespace-nowrap tabular">{fmtData(r.data_rdc)}</td>
                      <td className="whitespace-nowrap">
                        <span className="tabular font-bold">{r.contrato ?? '—'}</span>
                        {r.contrato_nome && <span className="block text-[10px] text-[var(--exec-outline)]">{r.contrato_nome}</span>}
                      </td>
                      <td>
                        <span className="font-medium">{r.ativo}</span>
                        <span className="block text-[10px] text-[var(--exec-outline)]">{[r.ativo_descricao, r.area].filter(Boolean).join(' · ') || '—'}</span>
                      </td>
                      <td>
                        <Responsavel nome={r.responsavel} />
                        <span className="mt-0.5 block text-[10px] text-[var(--exec-outline)]">Efetivo máx.: {fmtInteiro(r.efetivo_max)}</span>
                      </td>
                      <td>
                        <span className="flex flex-wrap gap-1">
                          {(discRdc.get(r.codigo) ?? []).map((d) => (
                            <span key={d} className="exec-chip">
                              {d}
                            </span>
                          ))}
                          {!discRdc.has(r.codigo) && '—'}
                        </span>
                      </td>
                      <td className="num">{f ? `${fmtInteiro(f.total)} (${fmtInteiro(f.comGps)} GPS)` : '0'}</td>
                      <td>
                        <PtsBloqueio rdc={r} />
                      </td>
                      <td>
                        <span className={`exec-chip ${CHIP_STATUS[r.status]}`}>{ROTULO_STATUS[r.status]}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {linhas.length === 0 && <p className="p-6 text-center text-sm text-[var(--exec-text-2)]">Nenhum RDC no recorte.</p>}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--exec-border)] bg-[var(--exec-surface-low)] px-4 py-3 text-[12px]">
            <span className="text-[var(--exec-text-2)]">
              Exibindo{' '}
              <strong className="tabular text-[var(--exec-ink)]">
                {linhas.length ? `${fmtInteiro(paginaAtual * porPagina + 1)} - ${fmtInteiro(paginaAtual * porPagina + visiveis.length)}` : '0'}
              </strong>{' '}
              de <strong className="tabular text-[var(--exec-ink)]">{fmtInteiro(linhas.length)}</strong> RDC
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-[var(--exec-text-2)]">
                Linhas por página:
                <select
                  className="se-input w-auto py-1"
                  value={porPagina}
                  onChange={(e) => {
                    setPorPagina(Number(e.target.value))
                    setPagina(0)
                  }}
                >
                  {POR_PAGINA.map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              <nav aria-label="Paginação da tabela" className="flex items-center gap-1">
                <button type="button" className="se-button se-button--outline se-button--sm" disabled={paginaAtual === 0} onClick={() => setPagina(paginaAtual - 1)} aria-label="Página anterior">
                  ‹
                </button>
                <span className="px-2 text-xs tabular" aria-current="page">
                  {fmtInteiro(paginaAtual + 1)} / {fmtInteiro(totalPaginas)}
                </span>
                <button
                  type="button"
                  className="se-button se-button--outline se-button--sm"
                  disabled={paginaAtual >= totalPaginas - 1}
                  onClick={() => setPagina(paginaAtual + 1)}
                  aria-label="Próxima página"
                >
                  ›
                </button>
              </nav>
            </div>
          </div>
        </div>
      </Secao>
    </div>
  )
}
