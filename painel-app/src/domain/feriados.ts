/**
 * Lista exata dos 28 feriados 2026/2027 para São Luís/MA, portada de
 * painel.html (const FERIADOS). O painel não extrapola essa lista para
 * outros anos.
 */
export interface Feriado {
  nome: string
  abrangencia: string
}

const LISTA: Array<[string, string, string]> = [
  ['2026-01-01', 'Confraternização Universal', 'Nacional'],
  ['2026-04-03', 'Paixão de Cristo (Sexta-feira Santa)', 'Nacional'],
  ['2026-04-21', 'Tiradentes', 'Nacional'],
  ['2026-05-01', 'Dia do Trabalho', 'Nacional'],
  ['2026-06-29', 'São Pedro', 'Municipal (São Luís)'],
  ['2026-07-28', 'Adesão do Maranhão à Independência do Brasil', 'Estadual (MA)'],
  ['2026-09-07', 'Independência do Brasil', 'Nacional'],
  ['2026-09-08', 'Aniversário de São Luís', 'Municipal (São Luís)'],
  ['2026-10-12', 'Nossa Senhora Aparecida', 'Nacional'],
  ['2026-11-02', 'Finados', 'Nacional'],
  ['2026-11-15', 'Proclamação da República', 'Nacional'],
  ['2026-11-20', 'Dia Nacional da Consciência Negra', 'Nacional'],
  ['2026-12-08', 'Nossa Senhora da Conceição', 'Municipal (São Luís)'],
  ['2026-12-25', 'Natal', 'Nacional'],
  ['2027-01-01', 'Confraternização Universal', 'Nacional'],
  ['2027-03-26', 'Paixão de Cristo (Sexta-feira Santa)', 'Nacional'],
  ['2027-04-21', 'Tiradentes', 'Nacional'],
  ['2027-05-01', 'Dia do Trabalho', 'Nacional'],
  ['2027-06-29', 'São Pedro', 'Municipal (São Luís)'],
  ['2027-07-28', 'Adesão do Maranhão à Independência do Brasil', 'Estadual (MA)'],
  ['2027-09-07', 'Independência do Brasil', 'Nacional'],
  ['2027-09-08', 'Aniversário de São Luís', 'Municipal (São Luís)'],
  ['2027-10-12', 'Nossa Senhora Aparecida', 'Nacional'],
  ['2027-11-02', 'Finados', 'Nacional'],
  ['2027-11-15', 'Proclamação da República', 'Nacional'],
  ['2027-11-20', 'Dia Nacional da Consciência Negra', 'Nacional'],
  ['2027-12-08', 'Nossa Senhora da Conceição', 'Municipal (São Luís)'],
  ['2027-12-25', 'Natal', 'Nacional'],
]

export const FERIADOS = new Map<string, Feriado>(LISTA.map(([data, nome, abrangencia]) => [data, { nome, abrangencia }]))
