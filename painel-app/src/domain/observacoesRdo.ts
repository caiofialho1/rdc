/**
 * Observações para o RDO: uma linha-resumo por RDC no formato usado pelo Planejamento
 * (Data, Hora, Equipamento, OM, Horario_Solicitacao, Horario_Abertura, Impacto,
 * Descricao_Macro_RDO). A descrição longa é quebrada em linhas de até `largura` caracteres:
 * a linha que continua termina em "(cont.)" e a seguinte começa com "(cont.)", repetindo só
 * Data, Equipamento e OM.
 *
 * Regras (sem inventar dado):
 * - Hora = horário em que o RDC chegou ao banco (recebido_em).
 * - Impacto PTS: espera da PTS acima da meta (META_ESPERA_PTS_MIN) conta como "IMPACTO PTS"
 *   com a espera inteira, salvo se o encarregado já registrou um impacto LIBERAÇÃO DE PTS
 *   (aí vale o registrado, para não contar duas vezes).
 * - Impactos registrados entram pelo tipo, com a soma dos minutos de cada tipo.
 * - Campo ausente fica fora do texto; nada é preenchido por suposição.
 */
import type { ImpactoRow, RdcRow } from '../api/schemas'
import type { Recorte } from './filtros'
import { fmtData } from './formatters'
import { META_ESPERA_PTS_MIN } from './hh'
import { maoDeObraPorFuncao } from './maoDeObra'

export interface LinhaObsRdo {
  Data: string
  Hora: string
  Equipamento: string
  OM: string
  Horario_Solicitacao: string
  Horario_Abertura: string
  Impacto: string
  Descricao_Macro_RDO: string
}

const pad = (n: number) => String(n).padStart(2, '0')

/** HH:MM:SS na hora local (mesma regra de fmtHora do painel). */
export function horaSeg(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** 41 → "41min"; 177 → "2h57min"; 120 → "2h". */
export function duracaoCurta(min: number): string {
  const m = Math.round(min)
  const h = Math.floor(m / 60)
  const r = m % 60
  return h ? `${h}h${r ? `${pad(r)}min` : ''}` : `${r}min`
}

const PLURAL: Record<string, [string, string]> = {
  Ajudante: ['ajudante', 'ajudantes'],
  Pintor: ['pintor', 'pintores'],
  Jatista: ['jatista', 'jatistas'],
  Mecânico: ['mecânico', 'mecânicos'],
  'Montador de Andaime': ['montador de andaime', 'montadores de andaime'],
  'Alpinista N1': ['alpinista N1', 'alpinistas N1'],
  Soldador: ['soldador', 'soldadores'],
}

/** Serviço do catálogo (MAIÚSCULAS) em texto corrido, mantendo siglas como SA2, PU, ST3. */
function servicoCorrido(s: string): string {
  return s
    .split(/\s+/)
    .map((p) => (/\d/.test(p) || ['PU', 'PTS'].includes(p) ? p : p.toLocaleLowerCase('pt-BR')))
    .join(' ')
}

/** Rótulo do impacto como no RDO: "IMPACTO PTS", "IMPACTO CHUVA", "IMPACTO VALE", "IMPACTO OUTROS (texto)". */
export function rotuloImpacto(descricao: string): string {
  const t = descricao.trim().replace(/\s+/g, ' ')
  const outros = t.match(/^OUTROS\s*[—–-]\s*(.+)$/)
  if (outros) return `IMPACTO OUTROS (${outros[1]})`
  // Impacto antigo, de texto livre, pode estar em minúsculas: o rótulo sai sempre em maiúsculas.
  const T = t.toLocaleUpperCase('pt-BR')
  if (T === 'LIBERAÇÃO DE PTS' || T === 'PTS / LIBERAÇÃO') return 'IMPACTO PTS'
  if (/^IMPACTO\b/.test(T)) return T
  return `IMPACTO ${T || 'SEM DESCRIÇÃO'}`
}

function impactosDoRdc(r: RdcRow, impactos: ImpactoRow[], metaPts: number): Array<{ rotulo: string; min: number }> {
  const porRotulo = new Map<string, number>()
  for (const i of impactos) {
    const rotulo = rotuloImpacto(i.descricao)
    porRotulo.set(rotulo, (porRotulo.get(rotulo) ?? 0) + i.duracao_min)
  }
  if (r.pts && r.espera_pts_min != null && r.espera_pts_min > metaPts && !porRotulo.has('IMPACTO PTS')) {
    porRotulo.set('IMPACTO PTS', r.espera_pts_min)
  }
  return [...porRotulo.entries()].map(([rotulo, min]) => ({ rotulo, min }))
}

/** Texto corrido do RDC, antes da quebra em linhas. */
export function descricaoMacro(r: RdcRow, recorte: Recorte, metaPts = META_ESPERA_PTS_MIN): { texto: string; impacto: string } {
  const atividades = recorte.atividades.filter((a) => a.rdc === r.codigo).sort((a, b) => a.ordem - b.ordem)
  const impactos = impactosDoRdc(
    r,
    recorte.impactos.filter((i) => i.rdc === r.codigo),
    metaPts,
  )
  const partes: string[] = []

  if (r.pts === true) {
    partes.push(
      r.pts_solicitacao && r.pts_abertura
        ? `PTS: Solicitação às ${horaSeg(r.pts_solicitacao)}, Abertura às ${horaSeg(r.pts_abertura)}.`
        : 'PTS: sem horários informados.',
    )
  } else if (r.pts === false) {
    partes.push('Sem PTS.')
  }

  const servicos = [
    ...new Set(
      atividades.map((a) => {
        const base = a.descricao_outros?.trim() || servicoCorrido(a.servico)
        return a.tipo_andaime ? `${base} (${a.tipo_andaime.toLocaleLowerCase('pt-BR')})` : base
      }),
    ),
  ]
  if (servicos.length) partes.push(`Serviços: ${servicos.join('; ')}.`)

  partes.push(`Executante: ${r.responsavel}.`)

  const { linhas, picoSemFuncao } = maoDeObraPorFuncao(atividades)
  const efetivo = linhas.filter((l) => l.pico > 0).map((l) => `${l.pico} ${(PLURAL[l.funcao] ?? [l.funcao, l.funcao])[l.pico === 1 ? 0 : 1]}`)
  if (picoSemFuncao > 0) efetivo.push(`${picoSemFuncao} sem função informada`)
  if (efetivo.length) partes.push(`Efetivo: ${efetivo.join(' + ')}.`)

  if (r.bloqueio === true) {
    partes.push(`Bloqueio: ${r.bloqueio_ativo ?? 'ativo não informado'}${r.bloqueio_hora ? ` às ${horaSeg(r.bloqueio_hora)}` : ''}.`)
  }

  const obs = atividades.map((a) => a.observacao?.trim()).filter((o): o is string => !!o)
  if (obs.length) partes.push(`Obs.: ${obs.map((o) => o.replace(/\s+/g, ' ').replace(/\.$/, '')).join('; ')}.`)

  const listaImpactos = impactos.map((i) => `${i.rotulo} (${duracaoCurta(i.min)} impactados)`).join('; ')
  partes.push(impactos.length ? `Impactos: sim — ${listaImpactos}.` : 'Impactos: não.')

  return {
    texto: partes.join(' '),
    impacto: impactos.length ? `Sim — ${impactos.map((i) => i.rotulo).join('; ')}` : 'Não',
  }
}

/** Quebra em linhas de até `largura` caracteres, sem cortar palavras. */
export function quebrar(texto: string, largura: number): string[] {
  const linhas: string[] = []
  let atual = ''
  for (const palavra of texto.split(' ')) {
    if (atual && (atual + ' ' + palavra).length > largura) {
      linhas.push(atual)
      atual = palavra
    } else {
      atual = atual ? `${atual} ${palavra}` : palavra
    }
  }
  if (atual) linhas.push(atual)
  return linhas
}

export function observacoesRdo(recorte: Recorte, largura = 125, metaPts = META_ESPERA_PTS_MIN): LinhaObsRdo[] {
  const rdcs = recorte.rdcs
    .filter((r) => r.status !== 'Cancelado' && r.status !== 'Substituído')
    .sort((a, b) => a.data_rdc.localeCompare(b.data_rdc) || a.recebido_em.localeCompare(b.recebido_em))
  const saida: LinhaObsRdo[] = []
  for (const r of rdcs) {
    const { texto, impacto } = descricaoMacro(r, recorte, metaPts)
    const pedacos = quebrar(texto, largura)
    pedacos.forEach((p, i) => {
      const primeira = i === 0
      const ultima = i === pedacos.length - 1
      saida.push({
        Data: fmtData(r.data_rdc),
        Hora: primeira ? horaSeg(r.recebido_em) : '',
        Equipamento: r.ativo,
        OM: r.om,
        Horario_Solicitacao: primeira && r.pts ? horaSeg(r.pts_solicitacao) : '',
        Horario_Abertura: primeira && r.pts ? horaSeg(r.pts_abertura) : '',
        Impacto: primeira ? impacto : '',
        Descricao_Macro_RDO: `${primeira ? '' : '(cont.) '}${p}${ultima ? '' : ' (cont.)'}`,
      })
    })
  }
  return saida
}
