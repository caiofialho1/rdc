import { useEffect, useMemo } from 'react'
import { useExportar } from '../../api/queries'
import { useUltimoSucesso } from '../../api/useUltimoSucesso'
import { useAuth } from '../../auth/AuthProvider'
import { filtrar, type FiltrosSecundarios } from '../../domain/filtros'
import { fmtData, fmtHora, fmtInteiro } from '../../domain/formatters'
import { useFilters } from '../../filters/FilterContext'
import Banner from './Banner'
import type { TelaChave } from './telas'

const ROTULOS_FILTRO: Record<keyof FiltrosSecundarios, string> = {
  area: 'Área',
  responsavel: 'Responsável',
  disciplina: 'Disciplina',
  contrato: 'Contrato',
  status: 'Status',
  busca: 'Busca',
}

/**
 * Nota de escopo para telas cujos dados NÃO seguem todos os filtros globais —
 * evita que o usuário leia um número achando que ele respeita um filtro que
 * não foi aplicado (ver docs/INFORMATION_ARCHITECTURE.md).
 */
const NOTA_ESCOPO: Partial<Record<TelaChave, string>> = {
  producao: 'Produção segue o período e os filtros de área, responsável, contrato, disciplina e busca (status não se aplica). Área e contrato vêm do RDC vinculado: com esses filtros, a produção sem RDC sai do recorte.',
}

/**
 * Cabeçalho comum a todas as telas: título, período consultado, contagem do
 * recorte, horário da última consulta bem-sucedida, filtros ativos
 * (removíveis) e avisos de atualização/falha. Usa a mesma consulta em cache
 * das telas (mesma queryKey) — nenhuma chamada de rede extra.
 */
export default function CabecalhoTela({ titulo, tela }: { titulo: string; tela: TelaChave }) {
  const { admin, tratarErroRpc } = useAuth()
  const { ini, fim, secundarios, definirSecundario } = useFilters()
  const consulta = useExportar(admin, ini, fim)
  const { dados, carregando, desatualizado } = useUltimoSucesso(consulta)

  // Sessão inválida desloga — em efeito, não durante a renderização.
  const erroRpc = consulta.data && !consulta.data.ok ? consulta.data.erro : null
  useEffect(() => {
    if (erroRpc) tratarErroRpc(erroRpc)
  }, [erroRpc, tratarErroRpc])

  const totalRecorte = useMemo(() => (dados ? filtrar(dados, secundarios).rdcs.length : null), [dados, secundarios])
  const ativos = (Object.keys(ROTULOS_FILTRO) as Array<keyof FiltrosSecundarios>).filter((k) => secundarios[k])
  const atualizadoEm = dados && consulta.dataUpdatedAt ? fmtHora(new Date(consulta.dataUpdatedAt).toISOString()) : null

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-xl font-semibold text-text-primary">{titulo}</h2>
        <p className="text-sm text-text-secondary" aria-live="polite">
          Período <strong className="tabular font-semibold text-text-primary">{fmtData(ini)}</strong> a{' '}
          <strong className="tabular font-semibold text-text-primary">{fmtData(fim)}</strong>
          {totalRecorte != null && (
            <>
              {' · '}
              <strong className="tabular font-semibold text-text-primary">{fmtInteiro(totalRecorte)}</strong> RDC no recorte
            </>
          )}
          {carregando ? ' · atualizando…' : atualizadoEm ? ` · consultado às ${atualizadoEm}` : ''}
        </p>
      </div>

      {ativos.length > 0 && (
        <ul className="flex flex-wrap items-center gap-1.5" aria-label="Filtros ativos">
          {ativos.map((k) => (
            <li key={k}>
              <span className="se-chip border border-border bg-surface font-medium text-text-primary">
                <span className="text-text-secondary">{ROTULOS_FILTRO[k]}:</span> {secundarios[k]}
                <button
                  type="button"
                  onClick={() => definirSecundario(k, undefined)}
                  aria-label={`Remover filtro ${ROTULOS_FILTRO[k]}`}
                  className="-mr-1 ml-0.5 rounded-control px-1 text-text-secondary hover:bg-ice hover:text-text-primary"
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {NOTA_ESCOPO[tela] && <p className="text-xs text-text-secondary">{NOTA_ESCOPO[tela]}</p>}

      {desatualizado && <Banner tipo="atencao">Não foi possível atualizar. Veja abaixo a última consulta que carregou com sucesso.</Banner>}
    </div>
  )
}
