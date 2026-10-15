/**
 * Lê um token de design-tokens.css em tempo de execução, para bibliotecas
 * como o ECharts que precisam de string de cor literal (não aceitam
 * var(--token) em todos os campos). Evita duplicar valores — a regra 7 do
 * AGENTS.md Slate Executive pede "ler valores CSS em tempo de execução ou
 * espelhar os tokens", e aqui optamos pela primeira: nenhuma cor é
 * reescrita fora de design-tokens.css.
 */
export function cssVar(nome: `--${string}`): string {
  // As telas ficam dentro de .tema-exec (Shell.tsx), que redefine os tokens com a
  // paleta do Painel executivo; fora dele (login, testes) vale o :root.
  const alvo = document.querySelector('.tema-exec') ?? document.documentElement
  return getComputedStyle(alvo).getPropertyValue(nome).trim()
}
