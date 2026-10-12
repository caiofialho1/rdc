import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { useExportar } from '../api/queries'
import { useUltimoSucesso } from '../api/useUltimoSucesso'
import { useEditar, useValidar } from '../api/mutations'
import { useFotoBlobUrl } from '../api/fotos'
import type { AtividadeRow, CamposEditaveis, FotoRow, RdcRow } from '../api/schemas'
import { useAuth } from '../auth/AuthProvider'
import Badge from '../components/ui/Badge'
import Banner from '../components/ui/Banner'
import Card from '../components/ui/Card'
import CardHeader from '../components/ui/CardHeader'
import EstadoTela from '../components/ui/EstadoTela'
import Lightbox from '../components/ui/Lightbox'
import Responsavel from '../components/ui/Responsavel'
import { tomStatus } from '../domain/badges'
import { filtrar } from '../domain/filtros'
import { fmtData, fmtHoras, fmtInteiro } from '../domain/formatters'
import { useFilters } from '../filters/FilterContext'

type Coluna = 'data_rdc' | 'responsavel' | 'ativo' | 'om' | 'status' | 'contrato'

const COLUNAS: Array<[Coluna, string]> = [
  ['data_rdc', 'Data'],
  ['responsavel', 'Responsável'],
  ['ativo', 'Ativo'],
  ['om', 'OM'],
  ['status', 'Status'],
  ['contrato', 'Contrato'],
]

function Miniatura({ foto, onClick }: { foto: FotoRow; onClick: () => void }) {
  const url = useFotoBlobUrl(foto.caminho)
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-16 w-16 overflow-hidden rounded-[3px] border border-border bg-chart-background"
      title={foto.codigo}
      aria-label={`Abrir foto ${foto.codigo}`}
    >
      {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : <span className="text-xs">…</span>}
    </button>
  )
}

function FormularioEdicao({ rdc, onSalvo }: { rdc: RdcRow; onSalvo: () => void }) {
  const { admin, tratarErroRpc } = useAuth()
  const editar = useEditar(admin)
  const [campos, setCampos] = useState<CamposEditaveis>({
    contrato: rdc.contrato ?? '',
    contrato_nome: rdc.contrato_nome ?? '',
    responsavel: rdc.responsavel,
    area: rdc.area ?? '',
    ativo: rdc.ativo,
    om: rdc.om,
  })

  function campo<K extends keyof CamposEditaveis>(chave: K, rotulo: string) {
    return (
      <label className="se-field">
        {rotulo}
        <input
          value={(campos[chave] as string) ?? ''}
          onChange={(e) => setCampos((c) => ({ ...c, [chave]: e.target.value }))}
          className="se-input"
        />
      </label>
    )
  }

  async function salvar() {
    const resposta = await editar.mutateAsync({ codigos: [rdc.codigo], campos, motivo: 'Edição pelo painel' })
    if (!resposta.ok) tratarErroRpc(resposta.erro)
    else onSalvo()
  }

  return (
    <div className="mt-2 flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {campo('contrato', 'Contrato (número)')}
        {campo('contrato_nome', 'Contrato (nome)')}
        {campo('responsavel', 'Responsável')}
        {campo('area', 'Área')}
        {campo('ativo', 'Ativo')}
        {campo('om', 'OM')}
      </div>
      <button type="button" onClick={salvar} disabled={editar.isPending} className="se-button self-start">
        {editar.isPending ? 'Salvando…' : 'Salvar edição'}
      </button>
      {editar.isError && <Banner tipo="erro">Não foi possível salvar a edição.</Banner>}
    </div>
  )
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="border-t border-border pt-3">
      <h4 className="mb-1.5 text-xs font-semibold tracking-wide text-text-secondary uppercase">{titulo}</h4>
      {children}
    </div>
  )
}

function Detalhe({
  rdc,
  atividades,
  fotos,
  onFechar,
}: {
  rdc: RdcRow
  atividades: AtividadeRow[]
  fotos: FotoRow[]
  onFechar: () => void
}) {
  const { admin, tratarErroRpc } = useAuth()
  const validar = useValidar(admin)
  const [obs, setObs] = useState('')
  const [editando, setEditando] = useState(false)
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [confirmarCancelamento, setConfirmarCancelamento] = useState(false)
  const [ultimaDecisao, setUltimaDecisao] = useState<string | null>(null)
  const idObs = useId()
  const ref = useRef<HTMLDivElement>(null)

  // Em telas < 1024 px o detalhe fica abaixo da tabela: leva o usuário até ele.
  useEffect(() => {
    if (!window.matchMedia('(min-width: 1024px)').matches) ref.current?.scrollIntoView({ block: 'start' })
  }, [])

  async function decidir(decisao: 'Validado' | 'Em revisão' | 'Cancelado') {
    setConfirmarCancelamento(false)
    const resposta = await validar.mutateAsync({ codigo: rdc.codigo, decisao, obs: obs || undefined })
    if (!resposta.ok) tratarErroRpc(resposta.erro)
    else setUltimaDecisao(decisao)
  }

  return (
    <Card ref={ref} className="flex scroll-mt-4 flex-col gap-3 lg:sticky lg:top-0" aria-labelledby={`detalhe-${rdc.codigo}`}>
      <div className="flex items-start justify-between gap-2">
        <h3 id={`detalhe-${rdc.codigo}`} className="min-w-0 text-[15px] font-semibold break-all text-text-primary">
          {rdc.codigo}
        </h3>
        <button type="button" onClick={onFechar} className="se-link shrink-0">
          Fechar
        </button>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        <dt className="text-text-secondary">Status</dt>
        <dd>
          <Badge tom={tomStatus(rdc.status)}>{rdc.status}</Badge>
        </dd>
        <dt className="text-text-secondary">Responsável</dt>
        <dd>
          <Responsavel nome={rdc.responsavel} tamanho="lg" comFuncao />
        </dd>
        <dt className="text-text-secondary">Data</dt>
        <dd className="tabular">{fmtData(rdc.data_rdc)}</dd>
        <dt className="text-text-secondary">Ativo / OM</dt>
        <dd className="break-words">
          {rdc.ativo} / {rdc.om}
        </dd>
        <dt className="text-text-secondary">Contrato</dt>
        <dd>{rdc.contrato_nome ?? '— sem contrato'}</dd>
        <dt className="text-text-secondary">HH trabalhado</dt>
        <dd className="tabular">{fmtHoras(rdc.hh_min / 60)} HH</dd>
        <dt className="text-text-secondary">PTS</dt>
        <dd>{rdc.pts == null ? '—' : rdc.pts ? `Sim (espera: ${rdc.espera_pts_min == null ? 'não informada' : fmtHoras(rdc.espera_pts_min / 60) + ' h'})` : 'Não'}</dd>
        <dt className="text-text-secondary">Bloqueio</dt>
        <dd>{rdc.bloqueio == null ? '—' : rdc.bloqueio ? `Sim (${rdc.bloqueio_ativo ?? '—'})` : 'Não'}</dd>
        <dt className="text-text-secondary">Validado por</dt>
        <dd>{rdc.validado_por ?? '—'}</dd>
      </dl>

      {atividades.length > 0 && (
        <Secao titulo={`Atividades (${fmtInteiro(atividades.length)})`}>
          <ul className="flex flex-col gap-1 text-sm">
            {atividades.map((a) => (
              <li key={a.codigo}>
                <span className="font-medium">{a.disciplina}</span> — {a.servico}{' '}
                <span className="tabular text-text-secondary">
                  ({fmtHoras(a.duracao_min / 60)} h, efetivo {fmtInteiro(a.efetivo_total)})
                </span>
              </li>
            ))}
          </ul>
        </Secao>
      )}

      {fotos.length > 0 && (
        <Secao titulo={`Fotos (${fmtInteiro(fotos.length)})`}>
          <div className="flex flex-wrap gap-2">
            {fotos.map((f, i) => (
              <Miniatura key={f.codigo} foto={f} onClick={() => setLightbox(i)} />
            ))}
          </div>
        </Secao>
      )}

      <div className="border-t border-border pt-2">
        <button type="button" onClick={() => setEditando((e) => !e)} aria-expanded={editando} className="se-link">
          {editando ? 'Fechar edição' : 'Editar dados'}
        </button>
        {editando && <FormularioEdicao rdc={rdc} onSalvo={() => setEditando(false)} />}
      </div>

      {ultimaDecisao && (
        <p role="status" className="rounded-control bg-success-bg px-3 py-2 text-sm text-success-text">
          Decisão registrada: {ultimaDecisao}.
        </p>
      )}

      {(rdc.status === 'Enviado' || rdc.status === 'Em revisão') && (
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <label htmlFor={idObs} className="se-field">
            Motivo (obrigatório para revisão ou cancelamento)
          </label>
          <textarea id={idObs} value={obs} onChange={(e) => setObs(e.target.value)} rows={2} className="se-input" />
          {confirmarCancelamento ? (
            <div className="flex flex-wrap items-center gap-2 rounded-control bg-danger-bg p-2" role="group" aria-label="Confirmar cancelamento">
              <span className="text-sm text-danger-text">Cancelar este RDC?</span>
              <button type="button" onClick={() => decidir('Cancelado')} disabled={validar.isPending} className="se-button se-button--danger se-button--sm">
                Confirmar cancelamento
              </button>
              <button type="button" onClick={() => setConfirmarCancelamento(false)} className="se-link">
                Voltar
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => decidir('Validado')} disabled={validar.isPending} className="se-button se-button--success">
                Validar
              </button>
              <button type="button" onClick={() => decidir('Em revisão')} disabled={validar.isPending} className="se-button se-button--warning">
                Liberar revisão
              </button>
              <button type="button" onClick={() => setConfirmarCancelamento(true)} disabled={validar.isPending} className="se-button se-button--outline">
                Cancelar RDC…
              </button>
            </div>
          )}
          {validar.isError && <Banner tipo="erro">Não foi possível registrar a decisão.</Banner>}
        </div>
      )}

      {lightbox !== null && <Lightbox fotos={fotos} indice={lightbox} onFechar={() => setLightbox(null)} onNavegar={setLightbox} />}
    </Card>
  )
}

export default function Detalhamento() {
  const { admin, tratarErroRpc } = useAuth()
  const { ini, fim, secundarios } = useFilters()
  const consulta = useExportar(admin, ini, fim)
  const editar = useEditar(admin)

  const [ordem, setOrdem] = useState<{ coluna: Coluna; dir: 1 | -1 }>({ coluna: 'data_rdc', dir: -1 })
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [ativo, setAtivo] = useState<string | null>(null)
  const [contratoLote, setContratoLote] = useState('')

  const { dados: dadosOk, semDados } = useUltimoSucesso(consulta)
  const recorte = useMemo(() => (dadosOk ? filtrar(dadosOk, secundarios) : null), [dadosOk, secundarios])

  const linhas = useMemo(() => {
    if (!recorte) return []
    const copia = [...recorte.rdcs]
    copia.sort((a, b) => {
      const va = a[ordem.coluna] ?? ''
      const vb = b[ordem.coluna] ?? ''
      return va < vb ? -ordem.dir : va > vb ? ordem.dir : 0
    })
    return copia
  }, [recorte, ordem])

  function alternarOrdem(coluna: Coluna) {
    setOrdem((o) => (o.coluna === coluna ? { coluna, dir: o.dir === 1 ? -1 : 1 } : { coluna, dir: 1 }))
  }

  function alternarSelecao(codigo: string) {
    setSelecionados((s) => {
      const novo = new Set(s)
      if (novo.has(codigo)) novo.delete(codigo)
      else novo.add(codigo)
      return novo
    })
  }

  async function aplicarContratoLote() {
    if (!contratoLote || selecionados.size === 0) return
    const resposta = await editar.mutateAsync({ codigos: [...selecionados], campos: { contrato: contratoLote }, motivo: 'Definição em lote pelo painel' })
    if (!resposta.ok) tratarErroRpc(resposta.erro)
    else setSelecionados(new Set())
  }

  const selecionado = linhas.find((r) => r.codigo === ativo) ?? null
  const atividadesSelecionado = useMemo(
    () => (selecionado ? (recorte?.atividades ?? []).filter((a) => a.rdc === selecionado.codigo) : []),
    [recorte, selecionado],
  )
  const fotosSelecionado = useMemo(
    () => (selecionado ? (recorte?.fotos ?? []).filter((f) => f.rdc === selecionado.codigo) : []),
    [recorte, selecionado],
  )

  if (!recorte) return <EstadoTela erro={semDados} />

  return (
    <div className="grid grid-cols-1 items-start gap-4 @[64rem]:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
      <Card className="min-w-0">
        <CardHeader
          titulo="Registros RDC"
          subtitulo={`${fmtInteiro(linhas.length)} no recorte · clique ou Enter abre o detalhe`}
          acoes={
            selecionados.size > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-sm" role="group" aria-label="Ação em lote">
                <span className="text-text-secondary">{fmtInteiro(selecionados.size)} selecionado(s)</span>
                <input
                  aria-label="Número do contrato para os selecionados"
                  placeholder="Número do contrato"
                  value={contratoLote}
                  onChange={(e) => setContratoLote(e.target.value)}
                  className="se-input w-44"
                />
                <button type="button" onClick={aplicarContratoLote} disabled={!contratoLote || editar.isPending} className="se-button se-button--sm">
                  Definir contrato
                </button>
              </div>
            )
          }
        />
        {editar.isError && <Banner tipo="erro">Não foi possível aplicar o contrato aos selecionados.</Banner>}
        <div className="se-table-wrap max-h-[32rem]">
          <table className="se-table min-w-[680px]">
            <thead>
              <tr>
                <th scope="col" className="w-10">
                  <span className="sr-only">Selecionar</span>
                </th>
                {COLUNAS.map(([coluna, rotulo]) => {
                  const ativa = ordem.coluna === coluna
                  return (
                    <th key={coluna} scope="col" aria-sort={ativa ? (ordem.dir === 1 ? 'ascending' : 'descending') : 'none'}>
                      <button type="button" className="se-table__sort" onClick={() => alternarOrdem(coluna)}>
                        {rotulo}
                        <span aria-hidden="true" className={ativa ? '' : 'opacity-40'}>
                          {ativa ? (ordem.dir === 1 ? '▲' : '▼') : '↕'}
                        </span>
                      </button>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {linhas.map((r) => (
                <tr
                  key={r.codigo}
                  tabIndex={0}
                  aria-selected={ativo === r.codigo}
                  onKeyDown={(e) => {
                    if (e.target !== e.currentTarget) return
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setAtivo(r.codigo)
                    }
                  }}
                  className="cursor-pointer hover:bg-background"
                  onClick={() => setAtivo(r.codigo)}
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      aria-label={`Selecionar ${r.codigo}`}
                      checked={selecionados.has(r.codigo)}
                      onChange={() => alternarSelecao(r.codigo)}
                    />
                  </td>
                  <td className="nowrap">{fmtData(r.data_rdc)}</td>
                  <td>
                    <Responsavel nome={r.responsavel} />
                  </td>
                  <td>{r.ativo}</td>
                  <td className="nowrap">{r.om}</td>
                  <td>
                    <Badge tom={tomStatus(r.status)}>{r.status}</Badge>
                  </td>
                  <td>{r.contrato_nome ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {linhas.length === 0 && <p className="se-table-empty">Nenhum RDC no recorte. Ajuste o período ou limpe os filtros.</p>}
        </div>
      </Card>
      {selecionado ? (
        <Detalhe
          key={selecionado.codigo}
          rdc={selecionado}
          atividades={atividadesSelecionado}
          fotos={fotosSelecionado}
          onFechar={() => setAtivo(null)}
        />
      ) : (
        <Card className="text-sm text-text-secondary">Selecione um registro para ver atividades, fotos e validar.</Card>
      )}
    </div>
  )
}
