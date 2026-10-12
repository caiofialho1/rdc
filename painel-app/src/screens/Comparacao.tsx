import { useId, useMemo } from 'react'
import { useProducao, useProducaoResp } from '../api/queries'
import { useUltimoSucesso } from '../api/useUltimoSucesso'
import { useAuth } from '../auth/AuthProvider'
import Badge from '../components/ui/Badge'
import Banner from '../components/ui/Banner'
import Card from '../components/ui/Card'
import CardHeader from '../components/ui/CardHeader'
import { tomSituacao } from '../domain/badges'
import { fmtData, fmtInteiro, fmtMoeda, fmtPercentual } from '../domain/formatters'
import { linhasSemPreco, porSituacao, totalFinanceiro } from '../domain/producao'
import { useFilters } from '../filters/FilterContext'
import { useEscopoIndependente, type EscopoIndependente } from '../filters/useEscopoIndependente'

function SeletorEscopo({ escopo, definir }: { escopo: EscopoIndependente; definir: (e: EscopoIndependente) => void }) {
  const nome = useId()
  return (
    <fieldset className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <legend className="sr-only">Escopo de datas</legend>
      <label className="flex min-h-8 items-center gap-1.5">
        <input type="radio" name={nome} checked={escopo.modo === 'periodo'} onChange={() => definir({ ...escopo, modo: 'periodo' })} />
        Período do painel
      </label>
      <label className="flex min-h-8 items-center gap-1.5">
        <input type="radio" name={nome} checked={escopo.modo === 'todas'} onChange={() => definir({ ...escopo, modo: 'todas' })} />
        Todas as datas
      </label>
    </fieldset>
  )
}

function descreverEscopo(e: EscopoIndependente): string {
  return e.modo === 'todas' ? 'Todas as datas' : `${fmtData(e.ini)} a ${fmtData(e.fim)}`
}

function Situacao({ qtd, rotulo, situacao }: { qtd: number; rotulo: string; situacao: Parameters<typeof tomSituacao>[0] }) {
  return (
    <div className="flex min-w-0 flex-col items-start gap-1.5 rounded-card border border-border bg-surface px-4 py-3">
      <p className="se-kpi-value text-text-primary">{fmtInteiro(qtd)}</p>
      <Badge tom={tomSituacao(situacao)}>{rotulo}</Badge>
    </div>
  )
}

export default function Comparacao() {
  const { admin } = useAuth()
  const { ini, fim } = useFilters()
  const [escopoProd, definirEscopoProd] = useEscopoIndependente('painel:escopoProd', ini, fim)
  const [escopoResp, definirEscopoResp] = useEscopoIndependente('painel:escopoResp', ini, fim)

  const producao = useProducao(admin, escopoProd.ini, escopoProd.fim, true)
  const producaoResp = useProducaoResp(admin, escopoResp.ini, escopoResp.fim, true)

  const { dados: prodOk, carregando: prodCarregando } = useUltimoSucesso(producao)
  const { dados: respOk, carregando: respCarregando } = useUltimoSucesso(producaoResp)

  const porSit = useMemo(() => (prodOk ? porSituacao(prodOk.linhas) : null), [prodOk])
  const semPreco = useMemo(() => (respOk ? linhasSemPreco(respOk.linhas) : []), [respOk])
  const total = useMemo(() => (respOk ? totalFinanceiro(respOk.linhas) : 0), [respOk])

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader
          titulo="Produção × RDC"
          subtitulo={`${descreverEscopo(escopoProd)} · contagem de linhas por situação de reconciliação`}
          acoes={<SeletorEscopo escopo={escopoProd} definir={definirEscopoProd} />}
        />
        {producao.isError && <Banner tipo="erro">Não foi possível carregar a produção.</Banner>}
        {prodCarregando && !porSit && <p className="se-table-empty">Carregando produção…</p>}
        {porSit && (
          <div className="grid grid-cols-1 gap-3 @[40rem]:grid-cols-3" aria-busy={prodCarregando}>
            <Situacao qtd={porSit['Produção com RDC'].length} situacao="Produção com RDC" rotulo="Produção com RDC" />
            <Situacao qtd={porSit['Produção sem RDC'].length} situacao="Produção sem RDC" rotulo="Produção sem RDC — investigar" />
            <Situacao qtd={porSit['RDC sem produção'].length} situacao="RDC sem produção" rotulo="RDC sem produção — investigar" />
          </div>
        )}
      </Card>

      <Card>
        <CardHeader
          titulo="Produção por responsável"
          subtitulo={`${descreverEscopo(escopoResp)} · valor em R$ e participação no rateio`}
          acoes={<SeletorEscopo escopo={escopoResp} definir={definirEscopoResp} />}
        />
        {producaoResp.isError && <Banner tipo="erro">Não foi possível carregar a produção por responsável.</Banner>}
        {respCarregando && !respOk && <p className="se-table-empty">Carregando produção por responsável…</p>}
        {respOk && (
          <>
            <p className="mb-3 text-sm text-text-primary">
              Valor total apurado: <strong className="tabular">{fmtMoeda(total)}</strong>
              {semPreco.length > 0 && (
                <span className="ml-2 font-medium text-warning-text">
                  ({fmtInteiro(semPreco.length)} linha(s) com produção sem preço cadastrado, fora do total — ver abaixo)
                </span>
              )}
            </p>
            <div className="se-table-wrap max-h-96">
              <table className="se-table min-w-[720px]">
                <thead>
                  <tr>
                    <th scope="col">Data</th>
                    <th scope="col">Responsável</th>
                    <th scope="col">Tag</th>
                    <th scope="col">Disciplina</th>
                    <th scope="col">Situação</th>
                    <th scope="col" className="num">
                      Participação
                    </th>
                    <th scope="col" className="num">
                      Valor (R$)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {respOk.linhas.map((l, i) => (
                    <tr key={i}>
                      <td className="nowrap">{fmtData(l.data)}</td>
                      <td>{l.responsavel}</td>
                      <td>{l.tag}</td>
                      <td>{l.disciplina}</td>
                      <td>
                        <Badge tom={tomSituacao(l.situacao)}>{l.situacao}</Badge>
                      </td>
                      <td className="num">{l.participacao == null ? '—' : fmtPercentual(l.participacao)}</td>
                      <td className="num">{l.valor == null ? '—' : fmtMoeda(l.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {respOk.linhas.length === 0 && <p className="se-table-empty">Nenhuma produção no escopo selecionado.</p>}
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
