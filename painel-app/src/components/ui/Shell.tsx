import { useCallback, useState } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { FilterProvider } from '../../filters/FilterContext'
import CargaProducao from '../CargaProducao'
import Comparacao from '../../screens/Comparacao'
import Contexto from '../../screens/Contexto'
import Desempenho from '../../screens/Desempenho'
import Desvios from '../../screens/Desvios'
import Detalhamento from '../../screens/Detalhamento'
import CabecalhoTela from './CabecalhoTela'
import Sidebar from './Sidebar'
import type { TelaChave } from './telas'
import { useDialogo } from './useDialogo'
import logoPpl from '../../assets/ppl-logo.png'

const TELAS = [
  { chave: 'contexto', rotulo: 'Contexto', Componente: Contexto },
  { chave: 'desempenho', rotulo: 'Desempenho', Componente: Desempenho },
  { chave: 'comparacao', rotulo: 'Comparação', Componente: Comparacao },
  { chave: 'desvios', rotulo: 'Desvios', Componente: Desvios },
  { chave: 'detalhamento', rotulo: 'Detalhamento', Componente: Detalhamento },
] as const satisfies ReadonlyArray<{ chave: TelaChave; rotulo: string; Componente: unknown }>

export default function Shell() {
  const { admin, sair } = useAuth()
  const [telaAtiva, setTelaAtiva] = useState<TelaChave>('contexto')
  const [cargaAberta, setCargaAberta] = useState(false)
  const [menuAberto, setMenuAberto] = useState(false)
  const fecharMenu = useCallback(() => setMenuAberto(false), [])
  const gavetaRef = useDialogo<HTMLDivElement>(menuAberto, fecharMenu)
  const tela = TELAS.find((t) => t.chave === telaAtiva)!
  const Tela = tela.Componente

  function irPara(chave: TelaChave) {
    setTelaAtiva(chave)
    setMenuAberto(false)
  }

  return (
    <FilterProvider>
      <div className="flex h-dvh flex-col bg-background">
        {/* Barra superior azul-marinho com logo em caixa branca, como no app mobile (.topbar/.top-logo). */}
        <header className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-primary px-4 py-2 text-white lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMenuAberto(true)}
              aria-expanded={menuAberto}
              aria-controls="painel-lateral"
              className="se-button se-button--on-dark se-button--sm lg:hidden"
            >
              Menu e filtros
            </button>
            <span className="flex shrink-0 items-center rounded-control bg-surface px-2 py-1">
              <img src={logoPpl} alt="PPL" className="h-6 w-auto" />
            </span>
            <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">Painel de Controle</h1>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setCargaAberta(true)} className="se-button se-button--on-dark se-button--sm">
              Atualizar carga produção
            </button>
            <span className="hidden text-sm text-white/80 md:inline">{admin?.nome}</span>
            <button type="button" onClick={sair} className="se-link text-white/85 hover:text-white">
              Sair
            </button>
          </div>
        </header>
        <CargaProducao aberto={cargaAberta} onFechar={() => setCargaAberta(false)} />
        <div className="relative flex min-h-0 flex-1">
          {menuAberto && <div className="fixed inset-0 z-20 bg-primary/50 lg:hidden" aria-hidden="true" onClick={fecharMenu} />}
          <div
            id="painel-lateral"
            ref={gavetaRef}
            tabIndex={-1}
            className={`${menuAberto ? 'fixed inset-y-0 left-0 z-30 flex shadow-lg' : 'hidden'} lg:static lg:z-auto lg:flex lg:shadow-none`}
            {...(menuAberto ? { role: 'dialog', 'aria-modal': true, 'aria-label': 'Menu e filtros' } : {})}
          >
            <Sidebar telas={TELAS} telaAtiva={telaAtiva} onSelecionar={(chave) => irPara(chave as TelaChave)} onFechar={menuAberto ? fecharMenu : undefined} />
          </div>
          <main className="@container min-w-0 flex-1 overflow-y-auto p-4 lg:p-6">
            <div className="mx-auto flex max-w-[1600px] flex-col gap-4">
              <CabecalhoTela titulo={tela.rotulo} tela={telaAtiva} />
              <Tela irPara={irPara} />
            </div>
          </main>
        </div>
      </div>
    </FilterProvider>
  )
}
