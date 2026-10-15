/**
 * Tela Produção (antiga Comparação): produção física e financeira por responsável, com etapas,
 * ativo, área, contrato e HH; agrupamento livre para análise e produtividade (m²/HH, kg/HH)
 * por contrato, responsável, disciplina e etapa. Regras de cálculo em domain/producaoAnalise.ts.
 */
import { Fragment, useMemo, useState, type ReactNode } from 'react'
import { useExportar, useProducaoResp } from '../api/queries'
import { useUltimoSucesso } from '../api/useUltimoSucesso'
import type { Situacao } from '../api/schemas'
import { useAuth } from '../auth/AuthProvider'
import { Card, Kpi, Secao } from '../components/exec/ExecUi'
import ProdutividadeDiaria from '../components/ProdutividadeDiaria'
import Banner from '../components/ui/Banner'
import EstadoTela from '../components/ui/EstadoTela'
import { IconeArea, IconeBarras, IconePeso, IconeRazao, IconeValor } from '../components/ui/icons/KpiIcons'
import Responsavel from '../components/ui/Responsavel'
import { fmtData, fmtHoras, fmtIndice, fmtInteiro, fmtMoeda, fmtPercentual } from '../domain/formatters'
import {
  CODIGO_ETAPA,
  ORDEM_ETAPA,
  ROTULO_DIMENSAO,
  ROTULO_ETAPA,
  ROTULO_UNIDADE,
  agrupar,
  contagemSituacao,
  enriquecer,
  filtrarProducao,
  produtividade,
  rankingProdutividade,
  totalizar,
  type Dimensao,
  type Grupo,
  type ItemProdutividade,
  type LinhaProducao,
  type Totais,
  type Unidade,
} from '../domain/producaoAnalise'
import { useFilters } from '../filters/FilterContext'

const SITUACOES: Situacao[] = ['Produção com RDC', 'Produção sem RDC', 'RDC sem produção']
const CHIP_SITUACAO: Record<Situacao, string> = {
  'Produção com RDC': 'exec-chip--prod',
  'Produção sem RDC': 'exec-chip--alert',
  'RDC sem produção': 'exec-chip--alert',
}
const DIMENSOES: Dimensao[] = ['responsavel', 'contrato', 'disciplina', 'etapa', 'ativo', 'area', 'data', 'situacao']
const POR_PAGINA = 25
const TOPO_RANKING = 8

const qtd = (v: number) => fmtHoras(v)
const indiceOuTraco = (v: number | null) => (v == null ? '—' : fmtIndice(v))

/** Produção da linha com a unidade; zero de "RDC sem produção" aparece como ausência. */
function Quantidade({ valor, unidade }: { valor: number; unidade: Unidade | null }) {
  if (!valor || !unidade) return <span className="text-[var(--exec-text-2)]">—</span>
  return (
    <>
      {qtd(valor)}
      <span className="ml-1 text-xs text-[var(--exec-text-2)]">{ROTULO_UNIDADE[unidade]}</span>
    </>
  )
}

// ---------------------------------------------------------------------------
// Produtividade
// ---------------------------------------------------------------------------
function SeletorUnidade({ unidade, definir }: { unidade: Unidade; definir: (u: Unidade) => void }) {
  return (
    <div className="flex overflow-hidden rounded-control border border-[var(--exec-border)] text-xs font-semibold" role="group" aria-label="Unidade da produtividade">
      {(
        [
          ['m2', 'm²/HH · PAC'],
          ['kg', 'kg/HH · REC e TEL'],
        ] as const
      ).map(([u, rotulo]) => (
        <button
          key={u}
          type="button"
          aria-pressed={unidade === u}
          onClick={() => definir(u)}
          className={`min-h-8 px-3 ${unidade === u ? 'bg-[var(--exec-ink)] text-white' : 'bg-white text-[var(--exec-text-2)] hover:bg-[var(--exec-surface-low)]'}`}
        >
          {rotulo}
        </button>
      ))}
    </div>
  )
}

/**
 * Lista ranqueada de produtividade: o índice em destaque, a barra relativa ao maior índice
 * da lista e a conta que o originou (produção ÷ HH) logo abaixo, para quem quiser conferir.
 */
function Ranking({
  itens,
  unidade,
  rotuloItem,
  vazio,
}: {
  itens: ItemProdutividade[]
  unidade: Unidade
  rotuloItem?: (chave: string) => ReactNode
  vazio: string
}) {
  const [todos, setTodos] = useState(false)
  if (!itens.length) return <p className="py-2 text-sm text-[var(--exec-text-2)]">{vazio}</p>
  const max = Math.max(...itens.map((i) => i.indice))
  const visiveis = todos ? itens : itens.slice(0, TOPO_RANKING)
  const u = ROTULO_UNIDADE[unidade]
  return (
    <>
      <ol className="flex flex-col">
        {visiveis.map((i) => (
          <li key={i.chave} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b border-[var(--exec-border)] py-2 last:border-0">
            <span className="min-w-0 truncate text-sm font-semibold text-[var(--exec-ink)]" title={i.chave}>
              {rotuloItem ? rotuloItem(i.chave) : i.chave}
            </span>
            <span className="text-right text-sm font-bold whitespace-nowrap text-[var(--exec-ink)] tabular">
              {fmtIndice(i.indice)}
              <span className="ml-1 text-xs font-medium text-[var(--exec-text-2)]">{u}/HH</span>
            </span>
            <span className="exec-barra" aria-hidden="true">
              <span style={{ width: `${Math.max((i.indice / max) * 100, 1.5)}%`, background: 'var(--exec-marca)', boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--exec-marca-text) 35%, transparent)' }} />
            </span>
            <span className="text-right text-[10px] whitespace-nowrap text-[var(--exec-text-2)] tabular">
              {qtd(i.producao)} {u} ÷ {fmtHoras(i.hh)} HH
            </span>
          </li>
        ))}
      </ol>
      {itens.length > TOPO_RANKING && (
        <button type="button" onClick={() => setTodos((t) => !t)} className="se-link mt-2 self-start text-xs">
          {todos ? `Mostrar os ${TOPO_RANKING} primeiros` : `Mostrar todos (${fmtInteiro(itens.length)})`}
        </button>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Tabela
// ---------------------------------------------------------------------------
function Etapas({ linha, descricoes }: { linha: LinhaProducao; descricoes: Map<string, string> }) {
  if (!linha.etapas.length) return <span className="text-[var(--exec-text-2)]">—</span>
  return (
    <span className="flex flex-wrap gap-1">
      {linha.etapas.map((e) => (
        <span key={e.etapa} className="exec-chip tabular" title={descricoes.get(`${linha.disciplina}|${CODIGO_ETAPA[e.etapa]}`)}>
          {ROTULO_ETAPA[e.etapa]} <span className="font-normal">{qtd(e.qtd)}</span>
        </span>
      ))}
    </span>
  )
}

function Lista({ itens, vazio = '—' }: { itens: string[]; vazio?: string }) {
  if (!itens.length) return <span className="text-[var(--exec-text-2)]">{vazio}</span>
  return <>{itens.join(' / ')}</>
}

function TabelaDetalhe({ linhas, descricoes }: { linhas: LinhaProducao[]; descricoes: Map<string, string> }) {
  return (
    <table className="exec-tabela min-w-[1180px]">
      <thead>
        <tr>
          <th scope="col">Data</th>
          <th scope="col">Responsável</th>
          <th scope="col">Ativo / OM</th>
          <th scope="col">Área</th>
          <th scope="col">Contrato</th>
          <th scope="col">Disc.</th>
          <th scope="col">Etapas</th>
          <th scope="col" className="num">
            Produção
          </th>
          <th scope="col" className="num">
            Valor (R$)
          </th>
          <th scope="col" className="num">
            HH
          </th>
          <th scope="col" className="num">
            Produção/HH
          </th>
          <th scope="col">Situação</th>
        </tr>
      </thead>
      <tbody>
        {linhas.map((l) => {
          const semRdc = l.situacao === 'Produção sem RDC'
          const indice = l.hh && l.quantidade ? l.quantidade / l.hh : null
          return (
            <tr key={l.id}>
              <td className="tabular whitespace-nowrap">{fmtData(l.data)}</td>
              <td>
                {semRdc ? (
                  <span className="text-[var(--exec-text-2)]">Sem RDC</span>
                ) : (
                  <>
                    <Responsavel nome={l.responsavel} />
                    {l.participacao != null && l.participacao < 1 && (
                      <span className="mt-0.5 block text-[10px] text-[var(--exec-text-2)] tabular">rateio {fmtPercentual(l.participacao)}</span>
                    )}
                  </>
                )}
              </td>
              <td>
                <span className="block font-semibold whitespace-nowrap">{l.tag ?? '—'}</span>
                <span className="block text-xs whitespace-nowrap text-[var(--exec-text-2)] tabular">{l.om ? `OM ${l.om}` : 'OM —'}</span>
              </td>
              <td>
                <Lista itens={l.areas} />
              </td>
              <td>
                <Lista itens={l.contratos} />
              </td>
              <td>{l.disciplina ?? '—'}</td>
              <td>
                <Etapas linha={l} descricoes={descricoes} />
              </td>
              <td className="num">
                <Quantidade valor={l.quantidade} unidade={l.unidade} />
              </td>
              <td className="num">
                {l.valor != null ? fmtMoeda(l.valor) : <span className="text-[var(--exec-text-2)]">—</span>}
                {l.etapasSemPreco && <span className="mt-0.5 block text-[10px] font-semibold text-[var(--exec-alert)]">sem preço: {l.etapasSemPreco}</span>}
              </td>
              <td className="num">{l.hh != null ? fmtHoras(l.hh) : <span className="text-[var(--exec-text-2)]">—</span>}</td>
              <td className="num">
                {indice != null && l.unidade ? (
                  <>
                    {fmtIndice(indice)}
                    <span className="ml-1 text-xs text-[var(--exec-text-2)]">{ROTULO_UNIDADE[l.unidade]}/HH</span>
                  </>
                ) : (
                  <span className="text-[var(--exec-text-2)]">—</span>
                )}
              </td>
              <td>
                <span className={`exec-chip ${CHIP_SITUACAO[l.situacao]}`}>{l.situacao}</span>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

type ColunaGrupo = 'chave' | 'registros' | 'm2' | 'kg' | 'valor' | 'hh' | 'pm2' | 'pkg'

const valorGrupo = (g: Grupo, c: ColunaGrupo): number | string => {
  const t = g.totais
  switch (c) {
    case 'chave':
      return g.chave
    case 'registros':
      return t.registros
    case 'm2':
      return t.m2
    case 'kg':
      return t.kg
    case 'valor':
      return t.valor
    case 'hh':
      return t.hh
    case 'pm2':
      return produtividade(t, 'm2') ?? -1
    case 'pkg':
      return produtividade(t, 'kg') ?? -1
  }
}

function CabecalhoOrdenavel({
  coluna,
  ordem,
  alternar,
  num = false,
  children,
}: {
  coluna: ColunaGrupo
  ordem: { coluna: ColunaGrupo; dir: 1 | -1 }
  alternar: (c: ColunaGrupo) => void
  num?: boolean
  children: ReactNode
}) {
  const ativa = ordem.coluna === coluna
  return (
    <th scope="col" className={num ? 'num' : ''} aria-sort={ativa ? (ordem.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => alternar(coluna)} className={`inline-flex items-center gap-1 uppercase ${num ? 'flex-row-reverse' : ''}`}>
        {children}
        <span aria-hidden="true" className={ativa ? '' : 'opacity-40'}>
          {ativa ? (ordem.dir === 1 ? '▲' : '▼') : '↕'}
        </span>
      </button>
    </th>
  )
}

function TabelaGrupos({ grupos, dimensao, descricoes }: { grupos: Grupo[]; dimensao: Dimensao; descricoes: Map<string, string> }) {
  const [abertos, setAbertos] = useState<Set<string>>(new Set())
  const [ordem, setOrdem] = useState<{ coluna: ColunaGrupo; dir: 1 | -1 }>({ coluna: dimensao === 'data' || dimensao === 'etapa' ? 'chave' : 'hh', dir: dimensao === 'data' ? -1 : dimensao === 'etapa' ? 1 : -1 })
  const porEtapa = dimensao === 'etapa'

  const ordenados = useMemo(() => {
    const copia = [...grupos]
    copia.sort((a, b) => {
      if (porEtapa && ordem.coluna === 'chave') return ((ORDEM_ETAPA.get(a.chave) ?? 99) - (ORDEM_ETAPA.get(b.chave) ?? 99)) * ordem.dir
      const va = valorGrupo(a, ordem.coluna)
      const vb = valorGrupo(b, ordem.coluna)
      const c = typeof va === 'string' ? va.localeCompare(vb as string, 'pt-BR') : va - (vb as number)
      return c * ordem.dir
    })
    return copia
  }, [grupos, ordem, porEtapa])

  const total = useMemo(() => totalizar(grupos.flatMap((g) => g.linhas).filter((l, i, arr) => arr.indexOf(l) === i)), [grupos])

  function alternar(coluna: ColunaGrupo) {
    setOrdem((o) => (o.coluna === coluna ? { coluna, dir: o.dir === 1 ? -1 : 1 } : { coluna, dir: coluna === 'chave' ? 1 : -1 }))
  }
  function abrir(chave: string) {
    setAbertos((s) => {
      const n = new Set(s)
      if (n.has(chave)) n.delete(chave)
      else n.add(chave)
      return n
    })
  }

  const cab = (c: ColunaGrupo, rotulo: string, num = true) => (
    <CabecalhoOrdenavel coluna={c} ordem={ordem} alternar={alternar} num={num}>
      {rotulo}
    </CabecalhoOrdenavel>
  )
  const traco = <span className="text-[var(--exec-text-2)]">—</span>

  return (
    <table className="exec-tabela min-w-[880px] table-fixed">
      <colgroup>
        <col className="w-[26%]" />
        <col span={7} />
      </colgroup>
      <thead>
        <tr>
          {cab('chave', ROTULO_DIMENSAO[dimensao], false)}
          {cab('registros', 'Registros')}
          {cab('m2', 'Produção m²')}
          {cab('kg', 'Produção kg')}
          {cab('valor', 'Valor (R$)')}
          {cab('hh', 'HH')}
          {cab('pm2', 'm²/HH')}
          {cab('pkg', 'kg/HH')}
        </tr>
      </thead>
      <tbody>
        {ordenados.map((g) => {
          const t = g.totais
          const aberto = abertos.has(g.chave)
          const pm2 = produtividade(t, 'm2')
          const pkg = produtividade(t, 'kg')
          const rotulo = dimensao === 'data' && /^\d{4}-/.test(g.chave) ? fmtData(g.chave) : g.chave
          return (
            <Fragment key={g.chave}>
              <tr>
                <th scope="row" className="text-left">
                  <button type="button" onClick={() => abrir(g.chave)} aria-expanded={aberto} className="flex max-w-full min-w-0 items-center gap-2 text-left font-semibold text-[var(--exec-ink)]">
                    <span aria-hidden="true" className={`inline-block w-3 text-[10px] text-[var(--exec-text-2)] transition-transform motion-reduce:transition-none ${aberto ? 'rotate-90' : ''}`}>
                      ▶
                    </span>
                    {dimensao === 'responsavel' && !['Sem RDC', 'Sem responsável'].includes(g.chave) ? <Responsavel nome={g.chave} /> : <span className="min-w-0 break-words">{rotulo}</span>}
                  </button>
                </th>
                <td className="num">{fmtInteiro(t.registros)}</td>
                <td className="num">{t.m2 ? qtd(t.m2) : traco}</td>
                <td className="num">{t.kg ? qtd(t.kg) : traco}</td>
                <td className="num">
                  {porEtapa ? traco : fmtMoeda(t.valor)}
                  {!porEtapa && t.semPreco > 0 && <span className="mt-0.5 block text-[10px] font-semibold text-[var(--exec-alert)]">{fmtInteiro(t.semPreco)} sem preço</span>}
                </td>
                <td className="num">{fmtHoras(t.hh)}</td>
                <td className="num font-semibold">{indiceOuTraco(pm2)}</td>
                <td className="num font-semibold">{indiceOuTraco(pkg)}</td>
              </tr>
              {aberto && (
                <tr>
                  <td colSpan={8} className="bg-[var(--exec-surface-low)] !p-3">
                    <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--exec-border)] bg-white">
                      <TabelaDetalhe linhas={g.linhas} descricoes={descricoes} />
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          )
        })}
      </tbody>
      <tfoot>
        <tr className="border-t-2 border-[var(--exec-ink)] font-bold">
          <th scope="row" className="px-4 py-3 text-left">
            Total
          </th>
          <td className="num px-4 py-3">{porEtapa ? '—' : fmtInteiro(total.registros)}</td>
          <td className="num px-4 py-3">{total.m2 ? qtd(total.m2) : '—'}</td>
          <td className="num px-4 py-3">{total.kg ? qtd(total.kg) : '—'}</td>
          <td className="num px-4 py-3">{porEtapa ? '—' : fmtMoeda(total.valor)}</td>
          <td className="num px-4 py-3">{fmtHoras(total.hh)}</td>
          <td className="num px-4 py-3">{indiceOuTraco(produtividade(total, 'm2'))}</td>
          <td className="num px-4 py-3">{indiceOuTraco(produtividade(total, 'kg'))}</td>
        </tr>
      </tfoot>
    </table>
  )
}

// ---------------------------------------------------------------------------
// Tela
// ---------------------------------------------------------------------------
function cobertura(t: Totais, u: Unidade): string {
  const total = u === 'm2' ? t.m2 : t.kg
  const comHh = u === 'm2' ? t.m2ComHh : t.kgComHh
  return total > 0 ? `${fmtPercentual(comHh / total)} da produção tem HH vinculado` : 'Sem produção no recorte'
}

export default function Producao() {
  const { admin } = useAuth()
  const { ini, fim, secundarios } = useFilters()
  const { dados: rdcOk } = useUltimoSucesso(useExportar(admin, ini, fim))
  const consulta = useProducaoResp(admin, ini, fim, true)
  const { dados: prodOk, carregando, semDados } = useUltimoSucesso(consulta)

  const [unidade, setUnidade] = useState<Unidade>('m2')
  const [dimensao, setDimensao] = useState<Dimensao | ''>('')
  const [situacao, setSituacao] = useState<Situacao | null>(null)
  const [pagina, setPagina] = useState(0)

  const linhas = useMemo(
    () => (prodOk ? filtrarProducao(enriquecer(prodOk.linhas, rdcOk?.rdcs ?? [], rdcOk?.atividades ?? []), secundarios) : null),
    [prodOk, rdcOk, secundarios],
  )
  const descricoes = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of prodOk?.precos ?? []) if (p.descricao) m.set(`${p.disciplina}|${p.etapa}`, p.descricao)
    return m
  }, [prodOk])

  const totais = useMemo(() => (linhas ? totalizar(linhas) : null), [linhas])
  const contagem = useMemo(() => (linhas ? contagemSituacao(linhas) : null), [linhas])
  const ranking = useMemo(
    () =>
      linhas && {
        contrato: rankingProdutividade(linhas, 'contrato', unidade),
        responsavel: rankingProdutividade(linhas, 'responsavel', unidade),
        disciplina: rankingProdutividade(linhas, 'disciplina', unidade),
        etapa: rankingProdutividade(linhas, 'etapa', unidade).sort((a, b) => (ORDEM_ETAPA.get(a.chave) ?? 99) - (ORDEM_ETAPA.get(b.chave) ?? 99)),
      },
    [linhas, unidade],
  )
  const tabela = useMemo(() => {
    if (!linhas) return []
    const r = situacao ? linhas.filter((l) => l.situacao === situacao) : linhas
    return [...r].sort((a, b) => (b.data ?? '').localeCompare(a.data ?? '') || a.responsavel.localeCompare(b.responsavel, 'pt-BR'))
  }, [linhas, situacao])
  const grupos = useMemo(() => (dimensao ? agrupar(tabela, dimensao) : []), [tabela, dimensao])

  if (!linhas || !totais || !contagem || !ranking) {
    return (
      <>
        {consulta.data && !consulta.data.ok && <Banner tipo="erro">{consulta.data.erro}</Banner>}
        <EstadoTela erro={semDados} />
      </>
    )
  }

  const paginas = Math.max(1, Math.ceil(tabela.length / POR_PAGINA))
  const paginaAtual = Math.min(pagina, paginas - 1)
  const pm2 = produtividade(totais, 'm2')
  const pkg = produtividade(totais, 'kg')
  const u = ROTULO_UNIDADE[unidade]

  return (
    <div className="exec flex flex-col gap-6" aria-busy={carregando}>
      <Secao
        id="prod-kpis"
        titulo="Resultado do período"
        sub="Produção da memória de cálculo, rateada entre responsáveis pelo HH de cada um. m² (PAC) e kg (REC e TEL) nunca se somam."
      >
        <div className="grid grid-cols-1 gap-3.5 @[36rem]:grid-cols-2 @[60rem]:grid-cols-3 @[96rem]:grid-cols-6">
          <Kpi
            rotulo="Produtividade PAC"
            icone={<IconeRazao />}
            valor={indiceOuTraco(pm2)}
            unidade="m²/HH"
            linha={pm2 == null ? 'Nenhuma produção em m² com HH vinculado' : `${qtd(totais.m2ComHh)} m² ÷ ${fmtHoras(totais.hhM2)} HH`}
            rodape={<span>{cobertura(totais, 'm2')}</span>}
          />
          <Kpi
            rotulo="Produtividade REC e TEL"
            icone={<IconeRazao />}
            valor={indiceOuTraco(pkg)}
            unidade="kg/HH"
            linha={pkg == null ? 'Nenhuma produção em kg com HH vinculado' : `${qtd(totais.kgComHh)} kg ÷ ${fmtHoras(totais.hhKg)} HH`}
            rodape={<span>{cobertura(totais, 'kg')}</span>}
          />
          <Kpi rotulo="Produção PAC" icone={<IconeArea />} valor={qtd(totais.m2)} unidade="m²" linha="Σ das etapas executadas" />
          <Kpi rotulo="Produção REC e TEL" icone={<IconePeso />} valor={qtd(totais.kg)} unidade="kg" linha="Σ das etapas executadas" />
          <Kpi
            rotulo="Valor apurado"
            icone={<IconeValor />}
            valor={fmtMoeda(totais.valor)}
            linha={
              totais.semPreco > 0 ? (
                <span className="font-semibold text-[var(--exec-alert)]">{fmtInteiro(totais.semPreco)} registro(s) com produção sem preço, fora do total</span>
              ) : (
                'Produção × preço do contrato'
              )
            }
          />
          <Kpi
            rotulo="HH total"
            icone={<IconeBarras />}
            valor={fmtHoras(totais.hh)}
            unidade="HH"
            linha={totais.hhSemProducao > 0 ? `${fmtHoras(totais.hhSemProducao)} HH em RDC sem produção (fora da produtividade)` : 'Todo HH tem produção vinculada'}
          />
        </div>
      </Secao>

      <Secao
        id="prod-produtividade"
        titulo="Produtividade"
        sub={`Produção ÷ HH só nos registros com os dois. A barra compara com o maior índice de cada lista; abaixo, a conta que gerou o índice.`}
        extra={<SeletorUnidade unidade={unidade} definir={setUnidade} />}
      >
        <div className="grid grid-cols-1 gap-3.5 @[64rem]:grid-cols-2 @[96rem]:grid-cols-4">
          <Card titulo={`${u}/HH por contrato`} sub="Contrato do RDC vinculado à produção">
            <Ranking itens={ranking.contrato} unidade={unidade} vazio={`Nenhuma produção em ${u} com HH no recorte.`} />
          </Card>
          <Card titulo={`${u}/HH por responsável`} sub="Produção rateada pelo HH de cada um">
            <Ranking itens={ranking.responsavel} unidade={unidade} rotuloItem={(n) => <Responsavel nome={n} />} vazio={`Nenhuma produção em ${u} com HH no recorte.`} />
          </Card>
          <Card titulo={`${u}/HH por disciplina`} sub={unidade === 'm2' ? 'PAC é medida em m²' : 'REC e TEL são medidas em kg'}>
            <Ranking itens={ranking.disciplina} unidade={unidade} vazio={`Nenhuma produção em ${u} com HH no recorte.`} />
          </Card>
          <Card titulo={`${u}/HH por etapa`} sub="Na ordem da MC. O HH do dia não é separado por etapa no RDC: repete-se em cada etapa do dia">
            <Ranking itens={ranking.etapa} unidade={unidade} vazio={`Nenhuma produção em ${u} com HH no recorte.`} />
          </Card>
        </div>
        <ProdutividadeDiaria linhas={linhas} unidade={unidade} />
      </Secao>

      <Secao id="prod-tabela" titulo="Produção detalhada" sub="Um registro por responsável × ativo × OM × disciplina × dia. Contrato e área vêm do RDC; produção sem RDC não tem nenhum dos dois.">
        <div className="exec-card exec-card--tabela">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--exec-border)] px-4 py-3">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por situação">
              {[null, ...SITUACOES].map((s) => {
                const ativo = situacao === s
                const n = s ? contagem[s] : SITUACOES.reduce((soma, k) => soma + contagem[k], 0)
                return (
                  <button
                    key={s ?? 'todas'}
                    type="button"
                    aria-pressed={ativo}
                    onClick={() => {
                      setSituacao(s)
                      setPagina(0)
                    }}
                    className={`flex min-h-8 items-center gap-1.5 rounded-control border px-2.5 text-xs font-semibold ${
                      ativo ? 'border-[var(--exec-ink)] bg-[var(--exec-ink)] text-white' : 'border-[var(--exec-border)] bg-white text-[var(--exec-text-2)] hover:text-[var(--exec-ink)]'
                    }`}
                  >
                    {s ?? 'Todas as situações'}
                    <span className={`tabular ${ativo ? 'text-white' : 'text-[var(--exec-ink)]'}`}>{fmtInteiro(n)}</span>
                  </button>
                )
              })}
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-[var(--exec-text-2)]">
              Agrupar por
              <select
                value={dimensao}
                onChange={(e) => {
                  setDimensao(e.target.value as Dimensao | '')
                  setPagina(0)
                }}
                className="se-input min-h-8 w-auto py-1 text-sm"
              >
                <option value="">Sem agrupamento</option>
                {DIMENSOES.map((d) => (
                  <option key={d} value={d}>
                    {ROTULO_DIMENSAO[d]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="border-b border-[var(--exec-border)] px-4 py-2 text-[10px] text-[var(--exec-text-2)]">
            Situação contada por ativo × OM × disciplina × dia, como na conciliação produção × RDC.
            {dimensao === 'etapa' && ' Por etapa, o HH de um registro aparece em cada etapa daquele dia e o valor não é separado por etapa na view — por isso o total de HH vem dos registros, sem repetição.'}
          </p>

          <div className="max-h-[calc(100dvh-14rem)] overflow-auto">
            {tabela.length === 0 ? (
              <p className="se-table-empty">Nenhuma produção no período e filtros atuais. Escolha outro mês de medição ou limpe os filtros.</p>
            ) : dimensao ? (
              <TabelaGrupos key={dimensao} grupos={grupos} dimensao={dimensao} descricoes={descricoes} />
            ) : (
              <TabelaDetalhe linhas={tabela.slice(paginaAtual * POR_PAGINA, (paginaAtual + 1) * POR_PAGINA)} descricoes={descricoes} />
            )}
          </div>

          {!dimensao && tabela.length > POR_PAGINA && (
            <div className="exec-card__rodape mt-0 px-4 pb-3">
              <span className="tabular">
                {fmtInteiro(paginaAtual * POR_PAGINA + 1)}–{fmtInteiro(Math.min((paginaAtual + 1) * POR_PAGINA, tabela.length))} de {fmtInteiro(tabela.length)} registros
              </span>
              <span className="flex gap-2">
                <button type="button" className="se-button se-button--outline se-button--sm" disabled={paginaAtual === 0} onClick={() => setPagina(paginaAtual - 1)}>
                  Anterior
                </button>
                <button type="button" className="se-button se-button--outline se-button--sm" disabled={paginaAtual >= paginas - 1} onClick={() => setPagina(paginaAtual + 1)}>
                  Próxima
                </button>
              </span>
            </div>
          )}
        </div>
      </Secao>
    </div>
  )
}
