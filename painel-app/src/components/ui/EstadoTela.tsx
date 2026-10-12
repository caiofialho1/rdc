import Card from './Card'

/**
 * Estado de uma tela que ainda não tem nenhum dado bom para mostrar:
 * carregando a 1ª consulta ou falha sem dado anterior. Evita o "Carregando…"
 * eterno quando a consulta falha. Com dado anterior, as telas renderizam
 * normalmente e o aviso de desatualização fica no cabeçalho da tela.
 */
export default function EstadoTela({ erro }: { erro: boolean }) {
  if (erro) {
    return (
      <Card role="alert" className="text-sm text-danger-text">
        Não foi possível carregar os dados deste período. Ajuste o período nos filtros e tente de novo.
      </Card>
    )
  }
  return (
    <Card role="status" aria-live="polite" className="flex flex-col gap-3" aria-busy="true">
      <span className="text-sm text-text-secondary">Carregando dados do período…</span>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-card bg-ice motion-reduce:animate-none" />
        ))}
      </div>
    </Card>
  )
}
