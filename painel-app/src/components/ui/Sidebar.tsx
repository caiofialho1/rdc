import { useMemo } from 'react'
import * as XLSX from 'xlsx'
import { useExportar } from '../../api/queries'
import type { StatusRdc } from '../../api/schemas'
import { useUltimoSucesso } from '../../api/useUltimoSucesso'
import { useAuth } from '../../auth/AuthProvider'
import { planilhasExportacao } from '../../domain/exportacao'
import { filtrar, valoresUnicos, type FiltrosSecundarios } from '../../domain/filtros'
import { fmtData } from '../../domain/formatters'
import { anosDisponiveis, medicaoAtual, medicaoDoMes } from '../../domain/ciclo'
import { useFilters } from '../../filters/FilterContext'

export interface ItemNav {
  chave: string
  rotulo: string
}

interface SidebarProps {
  telas: readonly ItemNav[]
  telaAtiva: string
  onSelecionar: (chave: string) => void
  /** Presente quando a lateral está aberta como gaveta (telas < 1024 px). */
  onFechar?: () => void
}

function Selecao({
  rotulo,
  valor,
  opcoes,
  todos,
  onChange,
}: {
  rotulo: string
  valor: string | undefined
  opcoes: string[]
  todos: string
  onChange: (v: string | undefined) => void
}) {
  return (
    <label className="se-field">
      {rotulo}
      <select value={valor ?? ''} onChange={(e) => onChange(e.target.value || undefined)} className="se-input">
        <option value="">{todos}</option>
        {opcoes.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  )
}

/**
 * Navegação entre telas + filtros principais do painel, visíveis em qualquer
 * tela. Ordem por importância: período (dispara a consulta) → recorte
 * (filtros em memória) → busca → exportação.
 */
export default function Sidebar({ telas, telaAtiva, onSelecionar, onFechar }: SidebarProps) {
  const { admin } = useAuth()
  const { ini, fim, definirPeriodo, secundarios, definirSecundario, limpar } = useFilters()
  const consulta = useExportar(admin, ini, fim)
  const { dados: dadosOk, carregando } = useUltimoSucesso(consulta)

  const recorte = useMemo(() => (dadosOk ? filtrar(dadosOk, secundarios) : null), [dadosOk, secundarios])
  const areas = dadosOk ? valoresUnicos(dadosOk.rdcs, (r) => r.area) : []
  const responsaveis = dadosOk ? valoresUnicos(dadosOk.rdcs, (r) => r.responsavel) : []
  const contratos = dadosOk ? valoresUnicos(dadosOk.rdcs, (r) => r.contrato) : []
  const status = dadosOk ? valoresUnicos(dadosOk.rdcs, (r) => r.status) : []

  const anos = useMemo(() => anosDisponiveis(), [])
  const atual = useMemo(() => medicaoAtual(), [])
  // O período sempre é uma medição inteira (21→20): ano e mês saem da data final.
  const ano = Number(fim.slice(0, 4))
  const mes = Number(fim.slice(5, 7))
  const meses = Array.from({ length: 12 }, (_, i) => medicaoDoMes(ano, i + 1)).filter((m) => m.fim <= atual.fim)
  const qtdAtivos = (Object.keys(secundarios) as Array<keyof FiltrosSecundarios>).filter((k) => secundarios[k]).length

  function exportarExcel() {
    if (!recorte) return
    const abas = planilhasExportacao(recorte)
    const wb = XLSX.utils.book_new()
    for (const [nome, linhas] of Object.entries(abas)) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(linhas.length ? linhas : [{}]), nome)
    }
    XLSX.writeFile(wb, `RDC_${ini}_a_${fim}.xlsx`)
  }

  return (
    <aside className="flex h-full w-[min(18rem,86vw)] shrink-0 flex-col gap-5 overflow-y-auto border-r border-border bg-surface p-4 lg:w-64">
      {onFechar && (
        <div className="-mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-text-primary">Menu e filtros</span>
          <button type="button" onClick={onFechar} className="se-link" data-autofoco>
            Fechar
          </button>
        </div>
      )}

      <nav aria-label="Telas do painel" className="flex flex-col gap-0.5">
        {telas.map((t) => (
          <button
            key={t.chave}
            type="button"
            onClick={() => onSelecionar(t.chave)}
            aria-current={telaAtiva === t.chave ? 'page' : undefined}
            className={`rounded-control border-l-[3px] px-3 py-2 text-left text-sm font-medium ${
              telaAtiva === t.chave
                ? 'border-accent bg-chart-background text-text-primary'
                : 'border-transparent text-text-secondary hover:bg-chart-background hover:text-text-primary'
            }`}
          >
            {t.rotulo}
          </button>
        ))}
      </nav>

      <div className="flex flex-col gap-4 border-t border-border pt-4">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-xs font-semibold tracking-wide text-text-secondary uppercase">Período</legend>
          <div className="grid grid-cols-[5.5rem_1fr] gap-2">
            <label className="se-field">
              Ano
              <select
                value={ano}
                onChange={(e) => {
                  const novoAno = Number(e.target.value)
                  // Mantém o mês; se ele ainda não começou no ano escolhido, vai para a medição atual.
                  const m = medicaoDoMes(novoAno, mes)
                  const alvo = m.fim <= atual.fim ? m : atual
                  definirPeriodo(alvo.ini, alvo.fim)
                }}
                className="se-input"
              >
                {anos.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
            <label className="se-field">
              Mês medição
              <select
                value={mes}
                onChange={(e) => {
                  const m = medicaoDoMes(ano, Number(e.target.value))
                  definirPeriodo(m.ini, m.fim)
                }}
                className="se-input"
              >
                {meses.map((m) => (
                  <option key={m.chave} value={Number(m.chave.slice(5, 7))}>
                    {m.rotulo.split('/')[0]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-xs text-text-secondary tabular">
            {fmtData(ini)} a {fmtData(fim)}
          </p>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 text-xs font-semibold tracking-wide text-text-secondary uppercase">Recorte</legend>
          <Selecao rotulo="Área" valor={secundarios.area} opcoes={areas} todos="Todas" onChange={(v) => definirSecundario('area', v)} />
          <Selecao
            rotulo="Responsável"
            valor={secundarios.responsavel}
            opcoes={responsaveis}
            todos="Todos"
            onChange={(v) => definirSecundario('responsavel', v)}
          />
          <Selecao rotulo="Contrato" valor={secundarios.contrato} opcoes={contratos} todos="Todos" onChange={(v) => definirSecundario('contrato', v)} />
          <Selecao
            rotulo="Status"
            valor={secundarios.status}
            opcoes={status}
            todos="Todos"
            onChange={(v) => definirSecundario('status', v as StatusRdc | undefined)}
          />
          <label className="se-field">
            Buscar
            <input
              type="search"
              placeholder="Código, OM, ativo, responsável…"
              value={secundarios.busca ?? ''}
              onChange={(e) => definirSecundario('busca', e.target.value || undefined)}
              className="se-input"
            />
          </label>
          <button
            type="button"
            onClick={limpar}
            disabled={qtdAtivos === 0}
            title="Remove área, responsável, contrato, status e busca; o período é mantido."
            className="se-link self-start disabled:cursor-not-allowed disabled:no-underline disabled:opacity-60"
          >
            Limpar filtros{qtdAtivos > 0 ? ` (${qtdAtivos})` : ''}
          </button>
        </fieldset>

        <button type="button" onClick={exportarExcel} disabled={!recorte || carregando} className="se-button w-full text-center">
          Exportar Excel
        </button>
      </div>
    </aside>
  )
}
