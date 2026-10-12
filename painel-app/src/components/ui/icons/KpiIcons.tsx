/**
 * Ilustrações animadas por indicador (KpiCard). Cada ícone é um SVG simples
 * (estilo linha, 1.5px) com uma única animação CSS com propósito — nunca
 * decoração gratuita — definida em styles/index.css e desligada por
 * `prefers-reduced-motion` (ver AGENTS.md Slate Executive, regra 9, e a
 * skill frontend-design: "leverage motion deliberately").
 */
import type { SVGProps } from 'react'

type IconeProps = SVGProps<SVGSVGElement>

/** HH trabalhado: barras subindo — esforço se acumulando. */
export function IconeBarras(props: IconeProps) {
  return (
    <svg viewBox="0 0 40 40" width="24" height="24" fill="none" className="kpi-icone-barras" {...props}>
      <rect x="7" y="20" width="6" height="14" rx="1.5" fill="currentColor" />
      <rect x="17" y="12" width="6" height="22" rx="1.5" fill="currentColor" />
      <rect x="27" y="6" width="6" height="28" rx="1.5" fill="currentColor" />
    </svg>
  )
}

/** HH de impacto: anel com lacuna girando — interrupção no fluxo de trabalho. */
export function IconeImpacto(props: IconeProps) {
  return (
    <svg viewBox="0 0 40 40" width="24" height="24" fill="none" className="kpi-icone-impacto" {...props}>
      <circle cx="20" cy="20" r="13" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <circle
        className="kpi-icone-impacto__arco"
        cx="20"
        cy="20"
        r="13"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="22 60"
      />
    </svg>
  )
}

/** Tempo de impacto: relógio com ponteiro girando. */
export function IconeRelogio(props: IconeProps) {
  return (
    <svg viewBox="0 0 40 40" width="24" height="24" fill="none" className="kpi-icone-relogio" {...props}>
      <circle cx="20" cy="20" r="13" stroke="currentColor" strokeWidth="2" />
      <line x1="20" y1="20" x2="20" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="kpi-icone-relogio__ponteiro" />
      <circle cx="20" cy="20" r="1.6" fill="currentColor" />
    </svg>
  )
}

/** Espera PTS: areia caindo na clepsidra. */
export function IconeEspera(props: IconeProps) {
  return (
    <svg viewBox="0 0 40 40" width="24" height="24" fill="none" className="kpi-icone-espera" {...props}>
      <path d="M12 8h16M12 32h16M12 8c0 7 16 10 16 0M12 32c0-7 16-10 16 0" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="20" cy="18" r="1.3" fill="currentColor" />
      <circle cx="20" cy="22" r="1.3" fill="currentColor" />
      <circle cx="20" cy="26" r="1.3" fill="currentColor" />
    </svg>
  )
}

/** Bloqueios: cadeado com brilho pulsando discretamente. */
export function IconeBloqueio(props: IconeProps) {
  return (
    <svg viewBox="0 0 40 40" width="24" height="24" fill="none" className="kpi-icone-bloqueio" {...props}>
      <rect x="11" y="18" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M15 18v-4a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" />
      <circle className="kpi-icone-bloqueio__brilho" cx="20" cy="25" r="1.8" fill="currentColor" />
    </svg>
  )
}

/** Registros no recorte: páginas em leque — contagem acumulando. */
export function IconeRegistros(props: IconeProps) {
  return (
    <svg viewBox="0 0 40 40" width="24" height="24" fill="none" className="kpi-icone-registros" {...props}>
      <rect x="13" y="10" width="16" height="20" rx="1.5" stroke="currentColor" strokeWidth="1.6" strokeOpacity="0.4" />
      <rect x="11" y="8" width="16" height="20" rx="1.5" fill="var(--surface)" stroke="currentColor" strokeWidth="1.8" />
      <line x1="15" y1="14" x2="23" y2="14" stroke="currentColor" strokeWidth="1.4" />
      <line x1="15" y1="18" x2="23" y2="18" stroke="currentColor" strokeWidth="1.4" />
      <line x1="15" y1="22" x2="20" y2="22" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}
