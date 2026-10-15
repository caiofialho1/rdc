/**
 * Ícones das funções de mão de obra do app (FUNCOES em domain/maoDeObra.ts).
 * Conjunto coeso: traço 1,7 px em currentColor, cantos arredondados, e só a parte
 * "que trabalha" de cada ferramenta no tom de destaque (--accent) — a tinta do rolo, o
 * abrasivo do jato, a faísca da solda, a diagonal do andaime. Sem animação: aparecem em
 * listas e tabelas, onde movimento distrairia da leitura.
 */
import type { ReactNode } from 'react'

const traco = { stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const
const destaque = 'var(--accent)'

const DESENHOS: Record<string, ReactNode> = {
  // Capacete de obra: quem apoia todas as frentes.
  Ajudante: (
    <>
      <path d="M5 16a7 7 0 0 1 14 0" {...traco} />
      <path d="M3 16.5h18" {...traco} />
      <path d="M10 9.4V12M14 9.4V12" stroke={destaque} strokeWidth={1.7} strokeLinecap="round" />
      <path d="M10 9.4a7 7 0 0 1 4 0" {...traco} />
    </>
  ),
  // Rolo de pintura com a tinta no rolo.
  Pintor: (
    <>
      <rect x="3.5" y="3.5" width="13" height="5.5" rx="1.6" fill={destaque} />
      <rect x="3.5" y="3.5" width="13" height="5.5" rx="1.6" {...traco} />
      <path d="M16.5 6.25H19.5v5.25H11v3" {...traco} />
      <rect x="9.25" y="14.5" width="3.5" height="6" rx="1" {...traco} />
    </>
  ),
  // Bico de jateamento lançando abrasivo.
  Jatista: (
    <>
      <path d="M2.5 9.5h6l4.5 1.6v1.8L8.5 14.5h-6z" {...traco} />
      <path d="M5.5 9.5v5" {...traco} />
      <circle cx="16" cy="12" r="1.1" fill={destaque} />
      <circle cx="18.6" cy="9" r="1.1" fill={destaque} />
      <circle cx="18.6" cy="15" r="1.1" fill={destaque} />
      <circle cx="21.2" cy="11.9" r="1.1" fill={destaque} />
      <circle cx="21" cy="6.6" r="0.9" fill={destaque} />
      <circle cx="21" cy="17.4" r="0.9" fill={destaque} />
    </>
  ),
  // Chave de boca com porca.
  Mecânico: (
    <>
      <path d="M14.6 3.6a4.3 4.3 0 0 0-5 5.8L3.9 15.1a2 2 0 0 0 2.8 2.8l5.7-5.7a4.3 4.3 0 0 0 5.8-5L15.6 9.8l-2.6-.8-.8-2.6z" {...traco} />
      <path d="M18.5 15.2l2.6 1.5v3l-2.6 1.5-2.6-1.5v-3z" fill={destaque} />
    </>
  ),
  // Torre de andaime com a diagonal de travamento.
  'Montador de Andaime': (
    <>
      <path d="M6 3v18M18 3v18M4 21h4M16 21h4" {...traco} />
      <path d="M6 7h12M6 14h12" {...traco} />
      <path d="M6 14 18 7" stroke={destaque} strokeWidth={1.7} strokeLinecap="round" />
    </>
  ),
  // Mosquetão com a trava em destaque e a corda.
  'Alpinista N1': (
    <>
      <rect x="6.5" y="6" width="9" height="15" rx="4.5" {...traco} />
      <path d="M15.5 10.5 12.6 15" stroke={destaque} strokeWidth={1.9} strokeLinecap="round" />
      <path d="M11 6V4.5c0-1.4 1-2 2.2-2 1.6 0 2.3 1 2.3 2.4" {...traco} />
    </>
  ),
  // Tocha de solda e a faísca no ponto de fusão.
  Soldador: (
    <>
      <path d="M3 21l7.5-7.5" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" />
      <path d="M10.5 13.5 13 11" {...traco} />
      <path d="M17 3.5v3M17 9.5v3M12.5 8h3M18.5 8h3M14 5l1.6 1.6M18.4 9.4 20 11M20 5l-1.6 1.6M15.6 9.4 14 11" stroke={destaque} strokeWidth={1.6} strokeLinecap="round" />
    </>
  ),
}

/** Efetivo sem função discriminada (RDC anterior à v3): silhueta com interrogação. */
const SEM_FUNCAO = (
  <>
    <circle cx="9" cy="7.5" r="3.2" {...traco} />
    <path d="M3.5 20a5.5 5.5 0 0 1 11 0" {...traco} />
    <path d="M17 9.2a2.2 2.2 0 1 1 3 2c-.7.3-1 .8-1 1.5" {...traco} />
    <circle cx="19" cy="15.6" r="0.9" fill="currentColor" />
  </>
)

/**
 * Ícone da função num ladrilho de 24 px. `apagado` para funções sem efetivo (tabela de mão
 * de obra), mantendo o desenho reconhecível. O nome da função é sempre texto ao lado.
 */
export function IconeFuncao({ funcao, apagado = false, tamanho = 24 }: { funcao: string; apagado?: boolean; tamanho?: number }) {
  const desenho = DESENHOS[funcao] ?? SEM_FUNCAO
  const semFuncao = !(funcao in DESENHOS)
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-control border ${
        semFuncao ? 'border-warning-border bg-warning-bg text-warning-text' : 'border-border bg-surface text-text-primary'
      } ${apagado ? 'opacity-45 grayscale' : ''}`}
      style={{ width: tamanho, height: tamanho }}
    >
      <svg viewBox="0 0 24 24" width={tamanho - 6} height={tamanho - 6}>
        {desenho}
      </svg>
    </span>
  )
}
