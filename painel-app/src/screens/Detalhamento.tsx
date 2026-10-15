import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useExportar } from '../api/queries'
import { useUltimoSucesso } from '../api/useUltimoSucesso'
import { useEditar, useValidar } from '../api/mutations'
import { useFotoBlobUrl } from '../api/fotos'
import type { AtividadeRow, CamposEditaveis, FotoRow, ImpactoRow, RdcRow, StatusRdc } from '../api/schemas'
import { useAuth } from '../auth/AuthProvider'
import Badge from '../components/ui/Badge'
import Banner from '../components/ui/Banner'
import Card from '../components/ui/Card'
import CardHeader from '../components/ui/CardHeader'
import EstadoTela from '../components/ui/EstadoTela'
import Lightbox from '../components/ui/Lightbox'
import { IconeFuncao } from '../components/ui/icons/FuncaoIcons'
import Responsavel from '../components/ui/Responsavel'
import { descricaoAtividade, NOME_DISCIPLINA, type DescricaoAtividade } from '../domain/atividades'
import { tomStatus } from '../domain/badges'
import { disciplinasPorRdc, fotosPorRdc } from '../domain/diagnostico'
import { filtrar } from '../domain/filtros'
import { funcoesDaAtividade, maoDeObraPorFuncao, semFuncao } from '../domain/maoDeObra'
import { fmtData, fmtDH, fmtHora, fmtHoras, fmtInteiro, fmtPercentual } from '../domain/formatters'
import { useFilters } from '../filters/FilterContext'

type Coluna = 'data_rdc' | 'responsavel' | 'ativo' | 'status' | 'contrato'

const COLUNAS: Array<[Coluna, string]> = [
  ['data_rdc', 'Data'],
  ['responsavel', 'Responsável'],
  ['ativo', 'Ativo / OM'],
  ['status', 'Status'],
  ['contrato', 'Contrato'],
]

/** PTS e bloqueio numa célula: ausência de declaração é "—", nunca "Não". */
function PtsBloqueio({ rdc }: { rdc: RdcRow }) {
  const pts =
    rdc.pts == null
      ? null
      : rdc.pts
        ? `PTS${rdc.espera_pts_min == null ? ' (sem horário)' : ` · ${fmtInteiro(rdc.espera_pts_min)} min`}`
        : 'Sem PTS'
  if (pts == null && rdc.bloqueio == null) return <>—</>
  return (
    <span className="flex flex-col gap-0.5 text-xs">
      <span>{pts ?? 'PTS —'}</span>
      {rdc.bloqueio === true && <span className="font-semibold text-text-primary">Bloqueio{rdc.bloqueio_ativo ? ` · ${rdc.bloqueio_ativo}` : ''}</span>}
    </span>
  )
}

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

/** Barra horizontal do % do HH do RDC (0–100%); o valor exato segue em texto na mesma linha. */
function BarraHh({ parte, cor }: { parte: number; cor: string }) {
  return (
    <span className="block h-2.5 rounded-[2px] bg-surface-soft" aria-hidden="true">
      {parte > 0 && <span className={`block h-full rounded-[2px] ${cor}`} style={{ width: `${Math.max(parte * 100, 1.5)}%` }} />}
    </span>
  )
}

/**
 * Quantitativo de mão de obra por função no RDC: as 7 funções do app sempre aparecem,
 * zeradas quando não houve efetivo. "Pico" é a maior quantidade da função numa mesma
 * atividade (a equipe se repete entre atividades, por isso não se soma); o HH, por ser
 * pessoa × tempo, soma e fecha com o HH trabalhado — é ele que a barra compara.
 */
function MaoDeObra({ atividades }: { atividades: AtividadeRow[] }) {
  const { linhas, hhSemFuncao, picoSemFuncao } = useMemo(() => maoDeObraPorFuncao(atividades), [atividades])
  const hhTotal = linhas.reduce((s, l) => s + l.hh, 0) + hhSemFuncao
  // Mesmo critério de efetivo_max (vw_rdc_metricas), sobre as atividades exibidas.
  const efetivoMax = atividades.reduce((m, a) => Math.max(m, a.efetivo_total), 0)
  const parte = (hh: number) => (hhTotal > 0 ? hh / hhTotal : 0)
  const linhasTabela = [
    ...linhas.map((l) => ({ ...l, semFuncao: false })),
    ...(picoSemFuncao > 0 ? [{ funcao: 'Sem função informada', pico: picoSemFuncao, hh: hhSemFuncao, semFuncao: true }] : []),
  ]

  return (
    <section aria-labelledby="mao-de-obra-titulo" className="flex min-w-0 flex-col gap-2.5 rounded-card border border-border bg-chart-background p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h4 id="mao-de-obra-titulo" className="text-xs font-semibold tracking-wide text-text-secondary uppercase">
          Mão de obra por função
        </h4>
        <p className="text-sm text-text-secondary">
          <span className="tabular text-[16px] font-semibold text-text-primary">{fmtInteiro(efetivoMax)}</span> pessoas no pico ·{' '}
          <span className="tabular text-[16px] font-semibold text-text-primary">{fmtHoras(hhTotal)}</span> HH
        </p>
      </div>
      <table className="w-full table-fixed border-collapse text-sm">
        <colgroup>
          <col className="w-[38%]" />
          <col />
          <col className="w-11" />
          <col className="w-13" />
          <col className="w-[4.25rem]" />
        </colgroup>
        <thead>
          <tr className="border-b border-border text-[10px] text-text-secondary">
            <th scope="col" className="pb-1 text-left font-medium">
              Função
            </th>
            <th scope="col" className="pb-1 text-left font-medium">
              <span className="sr-only">Participação no HH (barra)</span>
            </th>
            <th scope="col" className="pb-1 text-right font-medium" title="Maior quantidade da função numa mesma atividade">
              Pico
            </th>
            <th scope="col" className="pb-1 text-right font-medium">
              HH
            </th>
            <th scope="col" className="pb-1 text-right font-medium">
              % HH
            </th>
          </tr>
        </thead>
        <tbody className="tabular">
          {linhasTabela.map((l) => {
            const zerada = l.pico === 0
            return (
              <tr key={l.funcao} className="border-b border-border/70 last:border-0">
                <th
                  scope="row"
                  className={`truncate py-1.5 pr-2 text-left font-normal ${l.semFuncao ? 'text-warning-text' : zerada ? 'text-text-secondary' : 'text-text-primary'}`}
                  title={l.funcao}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <IconeFuncao funcao={l.semFuncao ? 'Sem função' : l.funcao} apagado={zerada} />
                    <span className="truncate">{l.funcao}</span>
                  </span>
                </th>
                <td className="py-1.5 pr-2">
                  <BarraHh parte={parte(l.hh)} cor={l.semFuncao ? 'bg-planned' : 'bg-actual'} />
                </td>
                <td className={`py-1.5 text-right ${zerada ? 'text-text-secondary' : 'font-semibold text-text-primary'}`}>{fmtInteiro(l.pico)}</td>
                <td className={`py-1.5 text-right ${zerada ? 'text-text-secondary' : ''}`}>{fmtHoras(l.hh)}</td>
                <td className="py-1.5 text-right text-text-secondary">{hhTotal > 0 ? fmtPercentual(parte(l.hh)) : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="mt-auto text-[10px] leading-snug text-text-secondary">
        Barra = participação da função no HH do RDC. Pico = maior quantidade numa mesma atividade (a equipe se repete entre atividades, por isso não se soma).
      </p>
    </section>
  )
}

/**
 * Linha da identificação do RDC, no mesmo ritmo da tabela de mão de obra ao lado:
 * rótulo em negrito na cor do texto, valor em tom mais suave, filete entre linhas.
 */
function Campo({ rotulo, alerta = false, className = '', children }: { rotulo: string; alerta?: boolean; className?: string; children: ReactNode }) {
  return (
    <>
      <dt className="border-b border-border/70 py-1.5 pr-4 font-semibold text-text-primary">{rotulo}</dt>
      <dd className={`min-w-0 border-b border-border/70 py-1.5 break-words ${alerta ? 'text-warning-text' : 'text-text-secondary'} ${className}`}>{children}</dd>
    </>
  )
}

const HORA_MS = 3_600_000

/** Dia da semana por extenso da data do RDC (a data é dia civil, sem fuso). */
function diaSemana(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long' })
}

/** Métrica do topo do detalhe: valor em destaque, rótulo curto embaixo. */
function Metrica({ valor, unidade, rotulo }: { valor: string; unidade?: string; rotulo: string }) {
  return (
    <div className="min-w-0 px-3 py-2.5 first:pl-4">
      <p className="tabular text-[17px] leading-tight font-semibold text-text-primary">
        {valor}
        {unidade && <span className="ml-0.5 text-xs font-medium text-text-secondary">{unidade}</span>}
      </p>
      <p className="mt-0.5 truncate text-[10px] text-text-secondary">{rotulo}</p>
    </div>
  )
}

interface Escala {
  marcas: number[]
  pos: (t: number) => number
}

/** Janela do turno em horas cheias, cobrindo todas as atividades e impactos do RDC. */
function escalaDoTurno(intervalos: Array<{ inicio: string; fim: string }>): Escala | null {
  const tempos = intervalos.flatMap((i) => [new Date(i.inicio).getTime(), new Date(i.fim).getTime()]).filter(Number.isFinite)
  if (!tempos.length) return null
  const ini = new Date(Math.min(...tempos))
  ini.setMinutes(0, 0, 0)
  const t0 = ini.getTime()
  const t1 = t0 + Math.max(1, Math.ceil((Math.max(...tempos) - t0) / HORA_MS)) * HORA_MS
  const passo = (t1 - t0) / HORA_MS > 8 ? 2 : 1
  const marcas: number[] = []
  for (let t = t0; t <= t1; t += passo * HORA_MS) marcas.push(t)
  return { marcas, pos: (t) => ((t - t0) / (t1 - t0)) * 100 }
}

/** Trilho de tempo: linhas de hora ao fundo e uma barra no intervalo [ini, fim]. */
function Trilho({ ini, fim, escala, cor }: { ini: string; fim: string; escala: Escala; cor: string }) {
  const a = escala.pos(new Date(ini).getTime())
  const b = escala.pos(new Date(fim).getTime())
  return (
    <span className="relative block h-2.5 rounded-[2px] bg-surface-soft" aria-hidden="true">
      {escala.marcas.map((t) => (
        <span key={t} className="absolute inset-y-0 w-px bg-border" style={{ left: `${escala.pos(t)}%` }} />
      ))}
      <span className={`absolute inset-y-0 rounded-[2px] ${cor}`} style={{ left: `${a}%`, width: `${Math.max(b - a, 0.8)}%` }} />
    </span>
  )
}

/**
 * Efetivo da atividade empilhado por função, à esquerda da barra do turno: ícone, nome e
 * quantidade. Pessoas sem função discriminada (RDC anterior à v3) aparecem à parte, em alerta.
 */
function Equipe({ funcoes, semFuncao: sem }: { funcoes: Array<{ funcao: string; qtd: number }>; semFuncao: number }) {
  if (!funcoes.length && !sem) return <span className="text-[10px] text-text-secondary">Sem efetivo</span>
  return (
    <ul className="flex min-w-0 flex-col gap-1" aria-label="Efetivo por função">
      {funcoes.map((f) => (
        <li key={f.funcao} className="flex min-w-0 items-center gap-1.5 text-xs">
          <IconeFuncao funcao={f.funcao} />
          <span className="min-w-0 flex-1 leading-tight text-text-secondary">{f.funcao}</span>
          <span className="font-semibold text-text-primary tabular">{fmtInteiro(f.qtd)}</span>
        </li>
      ))}
      {sem > 0 && (
        <li className="flex min-w-0 items-center gap-1.5 text-xs">
          <IconeFuncao funcao="Sem função" />
          <span className="min-w-0 flex-1 leading-tight text-warning-text">Sem função</span>
          <span className="font-semibold text-warning-text tabular">{fmtInteiro(sem)}</span>
        </li>
      )}
    </ul>
  )
}

/**
 * O que o encarregado escreveu sobre a atividade: a descrição livre do serviço OUTROS e a
 * observação. O filete azul liga o texto à barra da atividade na régua. Sem texto no RDC,
 * nada é exibido — exceto OUTROS sem descrição, que é pendência do registro.
 */
function Execucao({ d }: { d: DescricaoAtividade }) {
  if (!d.descricao && !d.descricaoPendente && !d.observacao) return null
  return (
    <dl className="flex flex-col gap-1.5 rounded-[3px] border-l-2 border-actual bg-chart-background py-1.5 pr-3 pl-2.5">
      {(d.descricao || d.descricaoPendente) && (
        <div className="min-w-0">
          <dt className="text-[10px] font-medium text-text-secondary">Serviço executado</dt>
          <dd className={`text-sm leading-snug break-words whitespace-pre-line ${d.descricao ? 'text-text-primary' : 'text-warning-text'}`}>
            {d.descricao ?? 'Serviço “OUTROS” registrado sem descrição.'}
          </dd>
        </div>
      )}
      {d.observacao && (
        <div className="min-w-0">
          <dt className="text-[10px] font-medium text-text-secondary">Observação</dt>
          <dd className="text-sm leading-snug break-words whitespace-pre-line text-text-primary">{d.observacao}</dd>
        </div>
      )}
    </dl>
  )
}

/**
 * Atividades e impactos do RDC numa mesma régua de horas: barra azul onde a equipe
 * trabalhou, laranja onde parou. Horários, duração e efetivo seguem em texto ao lado;
 * abaixo da barra, a descrição do serviço executado.
 */
function Turno({ atividades, impactos }: { atividades: AtividadeRow[]; impactos: ImpactoRow[] }) {
  const ordenadas = useMemo(() => [...atividades].sort((a, b) => a.ordem - b.ordem), [atividades])
  const paradas = useMemo(() => [...impactos].sort((a, b) => a.inicio.localeCompare(b.inicio)), [impactos])
  const escala = useMemo(() => escalaDoTurno([...ordenadas, ...paradas]), [ordenadas, paradas])

  if (!ordenadas.length && !paradas.length) {
    return (
      <Secao titulo="Turno">
        <p className="text-sm text-text-secondary">RDC sem atividades nem impactos registrados.</p>
      </Secao>
    )
  }

  return (
    <section
      aria-labelledby="turno-titulo"
      className="border-t border-border pt-3 [--equipe:7.75rem] @[34rem]/detalhe:[--equipe:10rem]"
    >
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h4 id="turno-titulo" className="text-xs font-semibold tracking-wide text-text-secondary uppercase">
          Turno · {fmtInteiro(ordenadas.length)} atividade(s){paradas.length > 0 && ` · ${fmtInteiro(paradas.length)} impacto(s)`}
        </h4>
        <span className="flex items-center gap-3 text-[10px] text-text-secondary" aria-hidden="true">
          <span className="flex items-center gap-1">
            <span className="h-2 w-3 rounded-[2px] bg-actual" /> Atividade
          </span>
          {paradas.length > 0 && (
            <span className="flex items-center gap-1">
              <span className="h-2 w-3 rounded-[2px] bg-impact" /> Impacto
            </span>
          )}
        </span>
      </div>

      {escala && (
        <div className="grid grid-cols-[1.5rem_minmax(0,1fr)]" aria-hidden="true">
          <span />
          <span
            className={`relative mb-1 ml-[calc(var(--equipe)+0.75rem)] block h-4 text-[10px] text-text-secondary tabular ${
              escala.marcas.length > 5 ? '[&>span:nth-child(even)]:hidden @[34rem]/detalhe:[&>span:nth-child(even)]:block' : ''
            }`}
          >
            {escala.marcas.map((t, i) => (
              <span
                key={t}
                className={`absolute top-0 ${i === 0 ? '' : i === escala.marcas.length - 1 ? '-translate-x-full' : '-translate-x-1/2'}`}
                style={{ left: `${escala.pos(t)}%` }}
              >
                {fmtHora(new Date(t).toISOString()).slice(0, 2)}h
              </span>
            ))}
          </span>
        </div>
      )}

      <ol className="flex flex-col gap-3">
        {ordenadas.map((a) => {
          const funcoes = funcoesDaAtividade(a)
          const naoDiscriminado = semFuncao(a)
          const d = descricaoAtividade(a)
          return (
            <li key={a.codigo} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-y-1">
              <span className="pt-px text-xs font-semibold text-text-secondary tabular">{fmtInteiro(a.ordem)}</span>
              <div className="flex min-w-0 flex-col gap-1.5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-sm">
                  <span className="min-w-0 break-words">
                    <Badge tom="neutro">
                      <abbr title={NOME_DISCIPLINA[a.disciplina]} className="no-underline">
                        {a.disciplina}
                      </abbr>
                    </Badge>{' '}
                    <span className="font-medium text-text-primary">{d.servico}</span>
                    {d.tipoAndaime && <span className="whitespace-nowrap text-text-secondary"> · {d.tipoAndaime}</span>}
                  </span>
                  <span className="text-xs text-text-secondary tabular">
                    {fmtHora(a.inicio)}–{fmtHora(a.fim)} · {fmtHoras(a.duracao_min / 60)} h · {fmtInteiro(a.efetivo_total)} pessoa(s)
                  </span>
                </div>
                <div className="grid grid-cols-[var(--equipe)_minmax(0,1fr)] items-center gap-x-3">
                  <Equipe funcoes={funcoes} semFuncao={naoDiscriminado} />
                  {escala ? <Trilho ini={a.inicio} fim={a.fim} escala={escala} cor="bg-actual" /> : <span />}
                </div>
                <Execucao d={d} />
              </div>
            </li>
          )
        })}
        {paradas.map((i) => (
          <li key={i.codigo} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-y-1">
            <span className="pt-1.5" aria-hidden="true">
              <span className="block h-2 w-2 rounded-full bg-impact" />
            </span>
            <div className="flex min-w-0 flex-col gap-1.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-sm">
                <span className="min-w-0 font-medium text-impact-text">
                  <span className="sr-only">Impacto: </span>
                  {i.descricao}
                </span>
                <span className="text-xs text-text-secondary tabular">
                  {fmtHora(i.inicio)}–{fmtHora(i.fim)} · {fmtHoras(i.duracao_min / 60)} h
                </span>
              </div>
              {escala && (
                <div className="grid grid-cols-[var(--equipe)_minmax(0,1fr)] items-center gap-x-3">
                  <span className="text-[10px] text-text-secondary">Equipe parada</span>
                  <Trilho ini={i.inicio} fim={i.fim} escala={escala} cor="bg-impact" />
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

function Detalhe({
  rdc,
  atividades,
  impactos,
  fotos,
  onFechar,
}: {
  rdc: RdcRow
  atividades: AtividadeRow[]
  impactos: ImpactoRow[]
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

  // Abaixo de ~72rem de conteúdo o detalhe fica abaixo da tabela: leva o usuário até ele
  // ('nearest' não mexe na rolagem quando ele já está visível ao lado da tabela).
  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'nearest' })
  }, [])

  async function decidir(decisao: 'Validado' | 'Em revisão' | 'Cancelado') {
    setConfirmarCancelamento(false)
    const resposta = await validar.mutateAsync({ codigo: rdc.codigo, decisao, obs: obs || undefined })
    if (!resposta.ok) tratarErroRpc(resposta.erro)
    else setUltimaDecisao(decisao)
  }

  const minImpacto = impactos.reduce((s, i) => s + i.duracao_min, 0)
  const decidivel = rdc.status === 'Enviado' || rdc.status === 'Em revisão'
  const pts =
    rdc.pts == null ? '—' : rdc.pts ? `Sim · espera ${rdc.espera_pts_min == null ? 'não informada' : `${fmtInteiro(rdc.espera_pts_min)} min`}` : 'Não'
  const bloqueio = rdc.bloqueio == null ? '—' : rdc.bloqueio ? `Sim · ${rdc.bloqueio_ativo ?? 'ativo não informado'}` : 'Não'

  return (
    <Card
      ref={ref}
      className="@container/detalhe flex scroll-mt-4 flex-col overflow-hidden p-0! @[72rem]:sticky @[72rem]:top-0 @[72rem]:max-h-[calc(100dvh-7.5rem)]"
      aria-labelledby={`detalhe-${rdc.codigo}`}
    >
      <header className="shrink-0 bg-primary px-4 py-3 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] tracking-wide text-white/75 uppercase">
              RDC · <span className="tabular">{fmtData(rdc.data_rdc)}</span> · {diaSemana(rdc.data_rdc)}
              {rdc.revisao > 0 && ` · revisão ${fmtInteiro(rdc.revisao)}`}
            </p>
            <h3 id={`detalhe-${rdc.codigo}`} className="mt-0.5 text-[14px] leading-snug font-semibold break-all">
              {rdc.codigo}
            </h3>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Badge tom={tomStatus(rdc.status)}>{rdc.status}</Badge>
            <button type="button" onClick={onFechar} className="text-sm text-white underline underline-offset-2 hover:text-white/80">
              Fechar
            </button>
          </div>
        </div>
      </header>

      <div className="grid shrink-0 grid-cols-2 divide-x divide-border border-b border-border bg-chart-background @[30rem]/detalhe:grid-cols-4">
        <Metrica valor={fmtHoras(rdc.hh_min / 60)} unidade="HH" rotulo="HH trabalhado" />
        <Metrica valor={fmtInteiro(rdc.efetivo_max)} rotulo="Pessoas no pico" />
        <Metrica valor={fmtInteiro(atividades.length)} rotulo="Atividades" />
        <Metrica valor={fmtHoras(minImpacto / 60)} unidade="h" rotulo={impactos.length ? `Impacto · ${fmtInteiro(impactos.length)} registro(s)` : 'Sem impacto'} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        <div className="grid grid-cols-1 gap-4 @[44rem]/detalhe:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <section
            aria-labelledby="identificacao-titulo"
            className="flex min-w-0 flex-col gap-2.5 rounded-card border border-border bg-chart-background p-3"
          >
            <h4 id="identificacao-titulo" className="text-xs font-semibold tracking-wide text-text-secondary uppercase">
              Identificação do RDC
            </h4>
            <Responsavel nome={rdc.responsavel} tamanho="lg" comFuncao />
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] border-t border-border text-sm [&>*:nth-last-child(-n+2)]:border-b-0">
              <Campo rotulo="Ativo">
                {rdc.ativo}
                {rdc.ativo_descricao && <span className="block text-xs">{rdc.ativo_descricao}</span>}
              </Campo>
              <Campo rotulo="OM" className="tabular">
                {rdc.om}
              </Campo>
              <Campo rotulo="Contrato" alerta={!rdc.contrato_nome}>
                {rdc.contrato_nome ?? 'Sem contrato'}
              </Campo>
              <Campo rotulo="Área">{rdc.area ?? '—'}</Campo>
              <Campo rotulo="PTS">{pts}</Campo>
              <Campo rotulo="Bloqueio">{bloqueio}</Campo>
              <Campo rotulo="Validado por">
                {rdc.validado_por ?? '—'}
                {rdc.validado_em && <span className="ml-1 text-xs">em {fmtDH(rdc.validado_em)}</span>}
              </Campo>
              {rdc.obs_validacao && <Campo rotulo="Motivo">{rdc.obs_validacao}</Campo>}
            </dl>
          </section>
          <MaoDeObra atividades={atividades} />
        </div>

        <Turno atividades={atividades} impactos={impactos} />

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
      </div>

      {(decidivel || ultimaDecisao) && (
        <footer className="flex shrink-0 flex-col gap-2 border-t border-border bg-chart-background p-4">
          {ultimaDecisao && (
            <p role="status" className="rounded-control bg-success-bg px-3 py-2 text-sm text-success-text">
              Decisão registrada: {ultimaDecisao}.
            </p>
          )}
          {decidivel && (
            <>
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
            </>
          )}
        </footer>
      )}

      {lightbox !== null && <Lightbox fotos={fotos} indice={lightbox} onFechar={() => setLightbox(null)} onNavegar={setLightbox} />}
    </Card>
  )
}

const ORDEM_STATUS: StatusRdc[] = ['Enviado', 'Em revisão', 'Validado', 'Rascunho', 'Substituído', 'Cancelado']

export default function Detalhamento() {
  const { admin, tratarErroRpc } = useAuth()
  const { ini, fim, secundarios, definirSecundario } = useFilters()
  const consulta = useExportar(admin, ini, fim)
  const editar = useEditar(admin)

  const [ordem, setOrdem] = useState<{ coluna: Coluna; dir: 1 | -1 }>({ coluna: 'data_rdc', dir: -1 })
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [ativo, setAtivo] = useState<string | null>(null)
  const [contratoLote, setContratoLote] = useState('')

  const { dados: dadosOk, semDados } = useUltimoSucesso(consulta)
  const recorte = useMemo(() => (dadosOk ? filtrar(dadosOk, secundarios) : null), [dadosOk, secundarios])
  // Contagem por status com todos os outros filtros aplicados, menos o próprio status.
  const contagemStatus = useMemo(() => {
    const mapa = new Map<StatusRdc, number>()
    if (!dadosOk) return mapa
    for (const r of filtrar(dadosOk, { ...secundarios, status: undefined }).rdcs) mapa.set(r.status, (mapa.get(r.status) ?? 0) + 1)
    return mapa
  }, [dadosOk, secundarios])

  // Disciplinas de todas as atividades do RDC (não só as do filtro de disciplina).
  const disciplinas = useMemo(() => disciplinasPorRdc(dadosOk?.atividades ?? []), [dadosOk])
  const fotosRdc = useMemo(() => fotosPorRdc(recorte?.fotos ?? []), [recorte])

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

  /** Setas ↑/↓ andam pelas linhas; com o detalhe aberto, ele acompanha a linha focada. */
  function navegar(e: KeyboardEvent<HTMLTableRowElement>, codigo: string) {
    if (e.target !== e.currentTarget) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setAtivo(codigo)
      return
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    const proxima = (e.key === 'ArrowDown' ? e.currentTarget.nextElementSibling : e.currentTarget.previousElementSibling) as HTMLTableRowElement | null
    if (!proxima) return
    e.preventDefault()
    proxima.focus()
    if (ativo && proxima.dataset.codigo) setAtivo(proxima.dataset.codigo)
  }

  const selecionado = linhas.find((r) => r.codigo === ativo) ?? null
  const atividadesSelecionado = useMemo(
    () => (selecionado ? (recorte?.atividades ?? []).filter((a) => a.rdc === selecionado.codigo) : []),
    [recorte, selecionado],
  )
  const impactosSelecionado = useMemo(
    () => (selecionado ? (recorte?.impactos ?? []).filter((i) => i.rdc === selecionado.codigo) : []),
    [recorte, selecionado],
  )
  const fotosSelecionado = useMemo(
    () => (selecionado ? (recorte?.fotos ?? []).filter((f) => f.rdc === selecionado.codigo) : []),
    [recorte, selecionado],
  )

  if (!recorte) return <EstadoTela erro={semDados} />

  const totalSemStatus = [...contagemStatus.values()].reduce((s, n) => s + n, 0)
  const statusPresentes = ORDEM_STATUS.filter((s) => contagemStatus.has(s))
  // Colunas secundárias só aparecem quando a tabela tem largura para elas.
  const largo = 'hidden @[60rem]/tabela:table-cell'
  const medio = 'hidden @[50rem]/tabela:table-cell'

  return (
    <div className={`grid grid-cols-1 items-start gap-4 ${selecionado ? '@[72rem]:grid-cols-[minmax(0,1fr)_minmax(27rem,0.85fr)]' : ''}`}>
      <Card className="@container/tabela min-w-0">
        <CardHeader
          titulo="Registros RDC"
          subtitulo={`${fmtInteiro(linhas.length)} no recorte · clique ou Enter abre o detalhe; ↑ ↓ percorrem as linhas`}
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
        {statusPresentes.length > 1 && (
          <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por status">
            {[undefined, ...statusPresentes].map((s) => {
              const ativoFiltro = secundarios.status === s
              const n = s ? (contagemStatus.get(s) ?? 0) : totalSemStatus
              return (
                <button
                  key={s ?? 'todos'}
                  type="button"
                  aria-pressed={ativoFiltro}
                  onClick={() => definirSecundario('status', s)}
                  className={`flex min-h-7 items-center gap-1.5 rounded-control border px-2.5 py-1 text-xs ${
                    ativoFiltro ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-text-secondary hover:border-blue-soft hover:text-text-primary'
                  }`}
                >
                  {s ?? 'Todos'}
                  <span className={`tabular font-semibold ${ativoFiltro ? 'text-white' : 'text-text-primary'}`}>{fmtInteiro(n)}</span>
                </button>
              )
            })}
          </div>
        )}
        {editar.isError && <Banner tipo="erro">Não foi possível aplicar o contrato aos selecionados.</Banner>}
        <div className={`se-table-wrap ${selecionado ? 'max-h-[32rem] @[72rem]:max-h-[calc(100dvh-17rem)]' : 'max-h-[calc(100dvh-17rem)] min-h-[20rem]'}`}>
          <table className="se-table min-w-[620px]">
            <thead>
              <tr>
                <th scope="col" className="w-10">
                  <span className="sr-only">Selecionar</span>
                </th>
                {COLUNAS.map(([coluna, rotulo]) => {
                  const ativa = ordem.coluna === coluna
                  return (
                    <th
                      key={coluna}
                      scope="col"
                      aria-sort={ativa ? (ordem.dir === 1 ? 'ascending' : 'descending') : 'none'}
                      className={coluna === 'contrato' ? largo : ''}
                    >
                      <button type="button" className="se-table__sort" onClick={() => alternarOrdem(coluna)}>
                        {rotulo}
                        <span aria-hidden="true" className={ativa ? '' : 'opacity-40'}>
                          {ativa ? (ordem.dir === 1 ? '▲' : '▼') : '↕'}
                        </span>
                      </button>
                    </th>
                  )
                })}
                <th scope="col" className={medio}>
                  Disciplina
                </th>
                <th scope="col" className={`num ${largo}`}>
                  Fotos (GPS)
                </th>
                <th scope="col">PTS / Bloqueio</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((r) => (
                <tr
                  key={r.codigo}
                  data-codigo={r.codigo}
                  tabIndex={0}
                  aria-selected={ativo === r.codigo}
                  onKeyDown={(e) => navegar(e, r.codigo)}
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
                  <td>
                    <span className="block font-medium whitespace-nowrap">{r.ativo}</span>
                    <span className="block text-xs whitespace-nowrap text-text-secondary tabular">OM {r.om}</span>
                  </td>
                  <td>
                    <Badge tom={tomStatus(r.status)}>{r.status}</Badge>
                  </td>
                  <td className={largo}>{r.contrato_nome ?? '—'}</td>
                  <td className={medio}>
                    <span className="flex flex-wrap gap-1">
                      {(disciplinas.get(r.codigo) ?? []).map((d) => (
                        <Badge key={d} tom="neutro">
                          {d}
                        </Badge>
                      ))}
                      {!disciplinas.has(r.codigo) && '—'}
                    </span>
                  </td>
                  <td className={`num ${largo}`}>
                    {(() => {
                      const f = fotosRdc.get(r.codigo)
                      return f ? `${fmtInteiro(f.total)} (${fmtInteiro(f.comGps)})` : <span className="text-text-secondary">0</span>
                    })()}
                  </td>
                  <td>
                    <PtsBloqueio rdc={r} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {linhas.length === 0 && <p className="se-table-empty">Nenhum RDC no recorte. Escolha outro mês de medição ou limpe os filtros.</p>}
        </div>
      </Card>
      {selecionado && (
        <Detalhe
          key={selecionado.codigo}
          rdc={selecionado}
          atividades={atividadesSelecionado}
          impactos={impactosSelecionado}
          fotos={fotosSelecionado}
          onFechar={() => setAtivo(null)}
        />
      )}
    </div>
  )
}
