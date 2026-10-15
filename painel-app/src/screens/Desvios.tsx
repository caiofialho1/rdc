import { useMemo } from 'react'
import { useExportar, useProducao } from '../api/queries'
import { useUltimoSucesso } from '../api/useUltimoSucesso'
import { useAuth } from '../auth/AuthProvider'
import EChart from '../components/charts/EChart'
import { EIXO_VALOR_SEM_ROTULO, SEM_SOBREPOSICAO, gradeSuave } from '../components/charts/padroes'
import { useFotosRedondas } from '../components/charts/fotoRedonda'
import Badge from '../components/ui/Badge'
import Banner from '../components/ui/Banner'
import Card from '../components/ui/Card'
import CardHeader from '../components/ui/CardHeader'
import ChartCard from '../components/ui/ChartCard'
import EstadoTela from '../components/ui/EstadoTela'
import Responsavel from '../components/ui/Responsavel'
import { tomSituacao } from '../domain/badges'
import { rankingResponsaveis } from '../domain/diagnostico'
import { filtrar } from '../domain/filtros'
import { fmtData, fmtHoras, fmtInteiro, fmtNumero, fmtPercentual } from '../domain/formatters'
import { hhPorResponsavel } from '../domain/hh'
import { fotoResponsavel, iniciais } from '../domain/responsaveis'
import { useFilters } from '../filters/FilterContext'
import { cssVar } from '../styles/cssVar'

const LIMITE_DESVIOS = 20

export default function Desvios() {
  const { admin } = useAuth()
  const { ini, fim, secundarios } = useFilters()
  const exportar = useExportar(admin, ini, fim)
  const producao = useProducao(admin, ini, fim, true)

  const { dados: dadosOk, semDados } = useUltimoSucesso(exportar)
  const recorte = useMemo(() => (dadosOk ? filtrar(dadosOk, secundarios) : null), [dadosOk, secundarios])
  const porResp = useMemo(() => (recorte ? hhPorResponsavel(recorte.rdcs, recorte.atividades) : []), [recorte])
  const ranking = useMemo(() => (recorte ? rankingResponsaveis(recorte.rdcs, recorte.atividades) : []), [recorte])
  const fotos = useMemo(() => porResp.map((r) => fotoResponsavel(r.responsavel)).filter((f): f is string => !!f), [porResp])
  const redondas = useFotosRedondas(fotos)
  const porRdc = useMemo(() => new Map((recorte?.rdcs ?? []).map((r) => [r.codigo, r])), [recorte])

  const { dados: prodOk, carregando: prodCarregando, semDados: prodFalhou } = useUltimoSucesso(producao)
  const todosDesvios = useMemo(() => (prodOk ? prodOk.linhas.filter((l) => l.situacao !== 'Produção com RDC') : []), [prodOk])
  const desvios = todosDesvios.slice(0, LIMITE_DESVIOS)

  // Mesma linguagem do app mobile (Modelo/DESIGN.md): HH trabalhado = --actual
  // (azul de produção) e HH de impacto = --impact (laranja, exclusivo de impacto).
  // Foto (ou iniciais) ao lado do nome no eixo: um estilo rich por linha,
  // porque a imagem de fundo é fixa em cada estilo.
  const opcaoResponsavel = useMemo(() => {
    const avatares = Object.fromEntries(
      porResp.map((r, i) => {
        const original = fotoResponsavel(r.responsavel)
        const foto = original && (redondas[original] ?? original)
        const base = { width: 22, height: 22, borderRadius: 11, align: 'center' as const }
        return [
          `f${i}`,
          foto
            ? { ...base, backgroundColor: { image: foto } }
            : { ...base, backgroundColor: cssVar('--primary-light'), color: '#fff', fontSize: 10, fontWeight: 600 as const },
        ]
      }),
    )
    return {
      tooltip: {
        trigger: 'axis' as const,
        axisPointer: { type: 'shadow' as const },
        formatter: (ps: Array<{ dataIndex: number }>) => {
          const r = porResp[ps[0]?.dataIndex ?? 0]
          if (!r) return ''
          return `<strong>${r.responsavel.replace(/</g, '&lt;')}</strong><br/>HH trabalhado: ${fmtHoras(r.hhTrabalhado)} HH<br/>HH de impacto: ${fmtHoras(r.hhImpacto)} HH`
        },
      },
      legend: { top: 0, left: 0, data: ['HH trabalhado', 'HH de impacto'] },
      grid: { left: 8, right: 72, top: 32, bottom: 8, containLabel: true },
      xAxis: { type: 'value' as const, min: 0, ...EIXO_VALOR_SEM_ROTULO, splitLine: gradeSuave() },
      yAxis: {
        type: 'category' as const,
        inverse: true,
        data: porResp.map((r) => r.responsavel),
        axisTick: { show: false },
        // Nomes longos são truncados no eixo; o nome completo aparece no tooltip.
        axisLabel: {
          formatter: (nome: string, i: number) =>
            `{nome|${nome}}  {f${i}|${fotoResponsavel(nome) ? '' : iniciais(nome)}}`,
          rich: { ...avatares, nome: { fontSize: 11, width: 140, overflow: 'truncate' as const, align: 'right' as const } },
        },
      },
      series: [
        {
          name: 'HH trabalhado',
          type: 'bar' as const,
          stack: 'hh',
          barMaxWidth: 22,
          data: porResp.map((r) => r.hhTrabalhado),
          itemStyle: { color: cssVar('--actual') },
        },
        {
          name: 'HH de impacto',
          type: 'bar' as const,
          stack: 'hh',
          barMaxWidth: 22,
          data: porResp.map((r) => r.hhImpacto),
          itemStyle: { color: cssVar('--impact'), borderRadius: [0, 2, 2, 0] },
        },
        {
          // Série vazia no fim da pilha só para o rótulo: HH trabalhado e, se houver, "+impacto" em vermelho.
          name: 'Rótulo',
          type: 'bar' as const,
          stack: 'hh',
          barMaxWidth: 22,
          silent: true,
          data: porResp.map(() => 0),
          labelLayout: SEM_SOBREPOSICAO,
          label: {
            show: true,
            position: 'right' as const,
            distance: 6,
            formatter: (p: { dataIndex: number }) => {
              const r = porResp[p.dataIndex]
              return r.hhImpacto > 0 ? `{t|${fmtHoras(r.hhTrabalhado)}} {i|+${fmtHoras(r.hhImpacto)}}` : `{t|${fmtHoras(r.hhTrabalhado)}}`
            },
            rich: {
              t: { fontSize: 10, fontWeight: 700, color: cssVar('--text-primary') },
              i: { fontSize: 10, fontWeight: 700, color: cssVar('--impact') },
            },
          },
        },
      ],
    }
  }, [porResp, redondas])

  if (!recorte) return <EstadoTela erro={semDados} />

  return (
    <div className="flex flex-col gap-4">
      <ChartCard>
        <CardHeader
          titulo="HH trabalhado × HH de impacto por responsável"
          subtitulo="Homem-hora (HH), ordenado pelo HH trabalhado. O empilhamento só compara as séries; a soma não é um novo indicador."
        />
        <EChart
          option={opcaoResponsavel}
          vazio={porResp.length === 0}
          mensagemVazio="Nenhum RDC no recorte."
          height={Math.max(180, porResp.length * 34 + 56)}
          descricao={`HH trabalhado e HH de impacto por responsável: ${porResp
            .map((r) => `${r.responsavel}, ${fmtHoras(r.hhTrabalhado)} HH trabalhado e ${fmtHoras(r.hhImpacto)} HH de impacto`)
            .join('; ')}.`}
        />
      </ChartCard>

      <Card>
        <CardHeader
          titulo="Responsáveis de campo"
          subtitulo="Ordenado pelo HH trabalhado. Efetivo médio = média do maior efetivo de cada RDC. Sem classificação de desempenho: não há meta cadastrada."
        />
        <div className="se-table-wrap max-h-[28rem]" tabIndex={0} role="region" aria-label="Tabela de responsáveis de campo (rolável)">
          <table className="se-table min-w-[820px]">
            <caption className="sr-only">Responsáveis de campo no recorte</caption>
            <thead>
              <tr>
                <th scope="col">Responsável</th>
                <th scope="col">Área principal</th>
                <th scope="col" className="num">
                  RDC
                </th>
                <th scope="col" className="num">
                  Efetivo médio
                </th>
                <th scope="col" className="num">
                  HH trabalhado
                </th>
                <th scope="col" className="num">
                  HH de impacto
                </th>
                <th scope="col" className="num">
                  Impacto ÷ trabalhado
                </th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((l) => (
                <tr key={l.responsavel}>
                  <th scope="row" className="font-normal">
                    <Responsavel nome={l.responsavel} tamanho="md" comFuncao />
                  </th>
                  <td>{l.areaPrincipal ?? '—'}</td>
                  <td className="num">{fmtInteiro(l.rdcs)}</td>
                  <td className="num">{fmtNumero(l.efetivoMedio)}</td>
                  <td className="num">{fmtHoras(l.hhTrabalhado)}</td>
                  <td className="num">{fmtHoras(l.hhImpacto)}</td>
                  <td className="num">{l.hhTrabalhado > 0 ? fmtPercentual(l.hhImpacto / l.hhTrabalhado) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {ranking.length === 0 && <p className="se-table-empty">Nenhum RDC no recorte.</p>}
        </div>
      </Card>

      <Card>
        <CardHeader
          titulo="Maiores desvios de reconciliação (produção × RDC)"
          subtitulo={
            prodOk
              ? `${fmtInteiro(desvios.length)} de ${fmtInteiro(todosDesvios.length)} no período — sinal de investigação, não é desempenho. Segue só o período; área, responsável, contrato, status e busca não se aplicam.`
              : 'Segue só o período; área, responsável, contrato, status e busca não se aplicam.'
          }
        />
        {prodFalhou && <Banner tipo="erro">Não foi possível carregar a produção do período.</Banner>}
        {prodCarregando && !prodOk && <p className="se-table-empty">Carregando produção…</p>}
        {prodOk && (
          <div className="se-table-wrap max-h-96">
            <table className="se-table min-w-[560px]">
              <thead>
                <tr>
                  <th scope="col">Data</th>
                  <th scope="col">Tag</th>
                  <th scope="col">OM</th>
                  <th scope="col">Disciplina</th>
                  <th scope="col">Situação</th>
                </tr>
              </thead>
              <tbody>
                {desvios.map((l, i) => (
                  <tr key={i}>
                    <td className="nowrap">{fmtData(l.data)}</td>
                    <td>{l.tag_chave}</td>
                    <td className="nowrap">{l.om ?? '—'}</td>
                    <td>{l.disciplina}</td>
                    <td>
                      <Badge tom={tomSituacao(l.situacao)}>{l.situacao}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {desvios.length === 0 && <p className="se-table-empty">Nenhum desvio de reconciliação no período.</p>}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader titulo="Impactos" subtitulo={`${fmtInteiro(recorte.impactos.length)} no recorte · duração em horas`} />
        <div className="se-table-wrap max-h-96">
          <table className="se-table min-w-[560px]">
            <thead>
              <tr>
                <th scope="col">Data</th>
                <th scope="col">RDC</th>
                <th scope="col">Descrição</th>
                <th scope="col" className="num">
                  Duração (h)
                </th>
              </tr>
            </thead>
            <tbody>
              {recorte.impactos.map((i) => (
                <tr key={i.codigo}>
                  <td className="nowrap">{fmtData(porRdc.get(i.rdc)?.data_rdc ?? null)}</td>
                  <td className="nowrap">{i.rdc}</td>
                  <td>{i.descricao}</td>
                  <td className="num">{fmtHoras(i.duracao_min / 60)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {recorte.impactos.length === 0 && <p className="se-table-empty">Nenhum impacto no recorte.</p>}
        </div>
      </Card>
    </div>
  )
}
