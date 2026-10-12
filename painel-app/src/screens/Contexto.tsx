import { useMemo, type ReactNode } from 'react'
import { useExportar } from '../api/queries'
import { useUltimoSucesso } from '../api/useUltimoSucesso'
import { useAuth } from '../auth/AuthProvider'
import Card from '../components/ui/Card'
import CardHeader from '../components/ui/CardHeader'
import EstadoTela from '../components/ui/EstadoTela'
import type { TelaProps } from '../components/ui/telas'
import type { Tom } from '../domain/badges'
import { fmtInteiro } from '../domain/formatters'
import { filtrar } from '../domain/filtros'
import { pendencias } from '../domain/pendencias'
import { useFilters } from '../filters/FilterContext'

const BORDA_TOM: Record<Tom, string> = {
  success: 'border-l-success',
  warning: 'border-l-warning',
  danger: 'border-l-danger',
  info: 'border-l-info',
  neutro: 'border-l-border',
}

/**
 * Pendência como card: contagem + rótulo sempre visíveis; a cor da borda só
 * reforça (nunca é a única pista). Zero pendências = tom neutro.
 */
function Pendencia({ qtd, tom, rotulo, descricao, acao }: { qtd: number; tom: Tom; rotulo: string; descricao: string; acao?: ReactNode }) {
  const tomEfetivo: Tom = qtd ? tom : 'neutro'
  return (
    <div className={`flex min-w-0 flex-col gap-1 rounded-card border border-l-4 border-border bg-surface px-4 py-3 ${BORDA_TOM[tomEfetivo]}`}>
      <p className="text-sm text-text-primary">
        <strong className="se-kpi-value mr-1.5 align-baseline">{fmtInteiro(qtd)}</strong>
        {rotulo}
      </p>
      <p className="text-xs text-text-secondary">{descricao}</p>
      {acao && qtd > 0 && <div className="mt-1">{acao}</div>}
    </div>
  )
}

export default function Contexto({ irPara }: TelaProps) {
  const { admin } = useAuth()
  const { ini, fim, secundarios, definirSecundario } = useFilters()
  const consulta = useExportar(admin, ini, fim)
  const { dados: dadosOk, semDados } = useUltimoSucesso(consulta)

  const recorte = useMemo(() => (dadosOk ? filtrar(dadosOk, secundarios) : null), [dadosOk, secundarios])
  const resumo = useMemo(() => (recorte ? pendencias(recorte.rdcs) : null), [recorte])

  if (!resumo) return <EstadoTela erro={semDados} />

  return (
    <Card>
      <CardHeader titulo="Pendências do recorte" subtitulo="Ações de planejamento e validação sobre os RDC do período e filtros atuais." />
      <div className="grid grid-cols-1 gap-3 @[40rem]:grid-cols-3">
        <Pendencia
          qtd={resumo.aguardandoValidacao.length}
          tom="info"
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
          tom="warning"
          rotulo="sem contrato"
          descricao="RDC sem número de contrato; podem ser corrigidos em lote no Detalhamento."
        />
        <Pendencia
          qtd={resumo.ptsSemEspera.length}
          tom="warning"
          rotulo="com PTS sem espera informada"
          descricao="Declararam PTS, mas sem os horários de solicitação e abertura."
        />
      </div>
    </Card>
  )
}
