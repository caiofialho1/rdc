// Líderes autorizados a preencher o RDC: [nome, função, matrícula] — mesma
// lista LIDERES do app mobile (index.html). O RDC grava só o nome, então a
// foto é achada pelo nome; quem não está na lista aparece com as iniciais.
const LIDERES: ReadonlyArray<readonly [string, string, string]> = [
  ['Concivan Araújo', 'Supervisor Geral', '7416'],
  ['Leandro Costa', 'Supervisor Alpinista N3', '7029'],
  ['Carlos "Caixão"', 'Técnico Geral', '7136'],
  ['Valdeci "Manga Rosa"', 'Enc. Andaime', '6990'],
  ['Jamilson Santos', 'Enc. Pintura', '5151'],
  ['Aldemir "Branco"', 'Enc. Mecânica', '6701'],
  ['Dorivan Costa', 'Enc. Mecânica', '6977'],
  ['Eliton Araújo', 'Alpinista Industrial N2 Jr', '7206'],
]

// Fotos 128×128 de assets/responsaveis (cópia em src/assets/responsaveis), por matrícula.
const FOTOS = import.meta.glob<string>('../assets/responsaveis/*.jpg', { eager: true, import: 'default' })

function fotoDaMatricula(matricula: string): string | null {
  return FOTOS[`../assets/responsaveis/${matricula}.jpg`] ?? null
}

export function fotoResponsavel(nome: string): string | null {
  const lider = LIDERES.find((l) => l[0] === nome)
  return lider ? fotoDaMatricula(lider[2]) : null
}

export function funcaoResponsavel(nome: string): string {
  return LIDERES.find((l) => l[0] === nome)?.[1] ?? ''
}

/** Iniciais como no app mobile: ignora apelidos entre aspas, até 2 letras. */
export function iniciais(nome: string): string {
  const partes = String(nome || '').replace(/"[^"]*"/g, '').trim().split(/\s+/).filter(Boolean)
  return partes.map((p) => p[0]).slice(0, 2).join('').toUpperCase() || '?'
}
