/**
 * Detalhe de um RDC: identificação, mão de obra por função, turno (atividades, equipe e
 * impactos), fotos, edição e validação. Abre no painel lateral a partir da tabela
 * "Detalhamento dos diários de campo" do Painel executivo.
 */
import { useId, useMemo, useState, type ReactNode } from 'react'
import { useEditar, useValidar } from '../api/mutations'
import { useFotoBlobUrl } from '../api/fotos'
import type { AtividadeRow, CamposEditaveis, FotoRow, ImpactoRow, RdcRow } from '../api/schemas'
import { useAuth } from '../auth/AuthProvider'
import Badge from './ui/Badge'
import Banner from './ui/Banner'
import Lightbox from './ui/Lightbox'
import { IconeFuncao } from './ui/icons/FuncaoIcons'
import Responsavel from './ui/Responsavel'
import { descricaoAtividade, NOME_DISCIPLINA, type DescricaoAtividade } from '../domain/atividades'
import { tomStatus } from '../domain/badges'
import { funcoesDaAtividade, maoDeObraPorFuncao, semFuncao } from '../domain/maoDeObra'
import { fmtData, fmtDH, fmtHora, fmtHoras, fmtInteiro, fmtPercentual } from '../domain/formatters'

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
      <h4 className="mb-1.5 text-[13px] font-bold tracking-wide text-text-primary uppercase">{titulo}</h4>
      {children}
    </div>
  )
}

/**
 * Mini rosca do % HH, com 14 px (cabe na altura da linha do texto). Arco em azul na fração
 * da função; trilho cinza-claro completo quando a função não tem HH.
 */
function MiniRosca({ parte }: { parte: number }) {
  const r = 5
  const c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true" className="shrink-0">
      <circle cx="7" cy="7" r={r} fill="none" stroke="var(--border)" strokeWidth="2.6" />
      {parte > 0 && (
        <circle
          cx="7"
          cy="7"
          r={r}
          fill="none"
          stroke="var(--info)"
          strokeWidth="2.6"
          strokeDasharray={`${Math.max(parte * c, 0.6)} ${c}`}
          transform="rotate(-90 7 7)"
        />
      )}
    </svg>
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
        <h4 id="mao-de-obra-titulo" className="text-[13px] font-bold tracking-wide text-text-primary uppercase">
          Mão de obra por função
        </h4>
        <p className="text-[12px] text-text-secondary">
          <span className="tabular font-bold text-info">{fmtInteiro(efetivoMax)}</span> pessoas no pico ·{' '}
          <span className="tabular font-bold text-info">{fmtHoras(hhTotal)}</span> HH
        </p>
      </div>
      <table className="w-full table-fixed border-collapse text-[12px]">
        <colgroup>
          <col className="w-[38%]" />
          <col />
          <col className="w-11" />
          <col className="w-13" />
          <col className="w-[5.5rem]" />
        </colgroup>
        <thead>
          <tr className="border-b border-border text-[12px] font-bold text-text-primary">
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
                {/* Onde há efetivo, os números ficam em azul; função zerada segue em cinza. */}
                <td className={`py-1.5 text-right ${zerada ? 'text-text-secondary' : 'font-semibold text-info'}`}>{fmtInteiro(l.pico)}</td>
                <td className={`py-1.5 text-right ${zerada ? 'text-text-secondary' : 'font-semibold text-info'}`}>{fmtHoras(l.hh)}</td>
                <td className={`py-1.5 text-right ${zerada ? 'text-text-secondary' : 'font-semibold text-info'}`}>
                  {hhTotal > 0 ? (
                    <span className="inline-flex items-center justify-end gap-1.5 align-middle">
                      <MiniRosca parte={parte(l.hh)} />
                      {fmtPercentual(parte(l.hh))}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
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
      <p className="tabular text-[12px] leading-tight font-bold text-text-primary">
        {valor}
        {unidade && <span className="ml-0.5 text-xs font-medium text-text-secondary">{unidade}</span>}
      </p>
      <p className="mt-0.5 truncate text-[12px] text-text-secondary">{rotulo}</p>
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
          <dt className="text-[12px] font-bold text-text-primary">Serviço executado</dt>
          <dd className={`text-[12px] leading-snug break-words whitespace-pre-line ${d.descricao ? 'text-text-primary' : 'text-warning-text'}`}>
            {d.descricao ?? 'Serviço “OUTROS” registrado sem descrição.'}
          </dd>
        </div>
      )}
      {d.observacao && (
        <div className="min-w-0">
          <dt className="text-[12px] font-bold text-text-primary">Observação</dt>
          <dd className="text-[12px] leading-snug break-words whitespace-pre-line text-text-primary">{d.observacao}</dd>
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
        <p className="text-[12px] text-text-secondary">RDC sem atividades nem impactos registrados.</p>
      </Secao>
    )
  }

  return (
    <section
      aria-labelledby="turno-titulo"
      className="border-t border-border pt-3 [--equipe:7.75rem] @[34rem]/detalhe:[--equipe:10rem]"
    >
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h4 id="turno-titulo" className="text-[13px] font-bold tracking-wide text-text-primary uppercase">
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
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-[12px]">
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
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-[12px]">
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

export default function DetalheRdc({
  rdc,
  atividades,
  impactos,
  fotos,
  onFechar,
  idTitulo,
}: {
  rdc: RdcRow
  atividades: AtividadeRow[]
  impactos: ImpactoRow[]
  fotos: FotoRow[]
  onFechar: () => void
  /** id do título, para o painel lateral que envolve o detalhe usar como aria-labelledby. */
  idTitulo: string
}) {
  const { admin, tratarErroRpc } = useAuth()
  const validar = useValidar(admin)
  const [obs, setObs] = useState('')
  const [editando, setEditando] = useState(false)
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [confirmarCancelamento, setConfirmarCancelamento] = useState(false)
  const [ultimaDecisao, setUltimaDecisao] = useState<string | null>(null)
  const idObs = useId()

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
    <div className="@container/detalhe flex h-full min-h-0 flex-col overflow-hidden bg-surface">
      <header className="shrink-0 bg-primary px-4 py-3 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] tracking-wide text-white/75 uppercase">
              RDC · <span className="tabular">{fmtData(rdc.data_rdc)}</span> · {diaSemana(rdc.data_rdc)}
              {rdc.revisao > 0 && ` · revisão ${fmtInteiro(rdc.revisao)}`}
            </p>
            <h2 id={idTitulo} className="mt-0.5 text-[14px] leading-snug font-bold break-all">
              {rdc.codigo}
            </h2>
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
            className="flex min-w-0 flex-col gap-2.5 rounded-card border border-border bg-chart-background p-3 text-[12px]"
          >
            <h4 id="identificacao-titulo" className="text-[13px] font-bold tracking-wide text-text-primary uppercase">
              Identificação do RDC
            </h4>
            <Responsavel nome={rdc.responsavel} tamanho="lg" comFuncao />
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] border-t border-border text-[12px] [&>*:nth-last-child(-n+2)]:border-b-0">
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
    </div>
  )
}
