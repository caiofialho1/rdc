import type { AtividadeRow } from '../api/schemas'

/** Nome por extenso das disciplinas do app mobile (DISCIPLINAS em index.html). */
export const NOME_DISCIPLINA: Record<AtividadeRow['disciplina'], string> = {
  PAC: 'Pintura',
  REC: 'Recuperação',
  'TEL/COB': 'Telhado / cobertura',
  ANDAIME: 'Andaime',
}

export interface DescricaoAtividade {
  /** Serviço do catálogo do app (ex.: "ACABAMENTO PU", "OUTROS"). */
  servico: string
  /** Tipo de andaime, só quando o serviço o exige (APOIADO, SUSPENSO, BALANÇO). */
  tipoAndaime: string | null
  /** Texto digitado pelo encarregado em "Descreva o serviço executado" (serviço OUTROS). */
  descricao: string | null
  /** Serviço OUTROS sem o texto obrigatório (RDC antigo ou importado): pendência, não vazio. */
  descricaoPendente: boolean
  /** Informação complementar opcional da atividade. */
  observacao: string | null
}

const texto = (v: string | null) => (v && v.trim() ? v.trim() : null)

/**
 * O que foi executado na atividade, como o encarregado registrou no app: o serviço do
 * catálogo e, quando houver, a descrição livre (OUTROS), o tipo de andaime e a observação.
 * Campo vazio fica nulo — nunca é preenchido com texto que o RDC não tem.
 */
export function descricaoAtividade(a: AtividadeRow): DescricaoAtividade {
  const outros = a.servico.trim().toUpperCase() === 'OUTROS'
  const descricao = texto(a.descricao_outros)
  return {
    servico: a.servico,
    tipoAndaime: texto(a.tipo_andaime),
    descricao,
    descricaoPendente: outros && descricao == null,
    observacao: texto(a.observacao),
  }
}
