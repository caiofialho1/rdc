export type TelaChave = 'executivo' | 'producao' | 'desvios' | 'detalhamento'

/** Props comuns às telas: navegação programática (ex.: atalho de pendências → Detalhamento). */
export interface TelaProps {
  irPara?: (tela: TelaChave) => void
}
