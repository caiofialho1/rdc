import { useMemo } from 'react'
import { useExportar, useProducao } from '../api/queries'
import { useUltimoSucesso } from '../api/useUltimoSucesso'
import { useAuth } from '../auth/AuthProvider'
import EChart from '../components/charts/EChart'
import { useFotosRedondas } from '../components/charts/fotoRedonda'
import Badge from '../components/ui/Badge'
import Banner from '../components/ui/Banner'
import Card from '../components/ui/Card'
import CardHeader from '../components/ui/CardHeader'
import ChartCard from '../components/ui/ChartCard'
import EstadoTela from '../components/ui/EstadoTela'
import { tomSituacao } from '../domain/badges'
import { filtrar } from '../domain/filtros'
import { fmtData, fmtHoras, fmtInteiro } from '../domain/formatters'
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
        valueFormatter: (v: number) => `${fmtHoras(v)} HH`,
      },
      legend: { top: 0, left: 0 },
      grid: { left: 8, right: 24, top: 32, bottom: 8, containLabel: true },
      xAxis: { type: 'value' as const, min: 0 },
      yAxis: {
        type: 'category' as const,
        inverse: true,
        data: porResp.map((r) => r.responsavel),
        axisTick: { show: false },
        // Nomes longos são truncados no eixo; o nome completo aparece no tooltip.
        axisLabel: {
          formatter: (nome: string, i: number) =>
            `{nome|${nome}}  {f${i}|${fotoResponsavel(nome) ? '' : iniciais(nome)}}`,
          rich: { ...avatares, nome: { fontSize: 12, width: 140, overflow: 'truncate' as const, align: 'right' as const } },
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
