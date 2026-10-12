# Auditoria UX/UI — Painel de Controle (`painel-app`) — 11/10/2026

Escopo: interface do `painel-app/` (React 18, TypeScript, Vite 8, Tailwind 4, ECharts 6, TanStack Query, Zod). Nenhuma consulta, RPC, schema, cálculo de KPI, autenticação, `.env` ou estrutura do Supabase foi alterada. Nada foi publicado (`npm run publish` não executado): `painel.html` e `assets/painel/` na raiz continuam com a versão anterior.

## 1. Inventário auditado

| Grupo | Arquivos |
|---|---|
| Configuração | `package.json`, `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `tsconfig*.json`, `.oxlintrc.json`, `index.html` |
| Estilos e tokens | `src/styles/design-tokens.css`, `src/styles/index.css`, `src/styles/cssVar.ts` |
| Entrada e casca | `src/main.tsx`, `src/App.tsx`, `src/components/ui/Shell.tsx`, `src/components/ui/Sidebar.tsx` |
| Componentes | `KpiCard`, `Card`, `ChartCard`, `Badge`, `Banner`, `Lightbox`, `icons/KpiIcons`, `charts/EChart`, `Calendario`, `CargaProducao` |
| Telas | `Login`, `Contexto`, `Desempenho`, `Comparacao`, `Desvios`, `Detalhamento` |
| Filtros e domínio (leitura) | `filters/FilterContext.tsx`, `filters/useEscopoIndependente.ts`, `domain/filtros.ts`, `domain/hh.ts`, `domain/badges.ts`, `domain/formatters.ts`, `domain/calendario.ts`, `domain/pendencias.ts`, `api/queries.ts`, `api/useUltimoSucesso.ts` |
| Testes | `tests/unit/*`, `tests/e2e/painel.spec.ts`, `tests/e2e/fixtures/mocks.ts` |
| Orientação | `AGENTS.md` (raiz e `1. RDC_MOBILE/`), `Modelo/DESIGN.md`, `docs/revisao-painel.md`, `docs/KPI_CATALOG.md`, `docs/INFORMATION_ARCHITECTURE.md`, `painel-app/README.md` |

Ignorados: `node_modules`, `dist`, `.env`, `painel-app/agents/` (material arquivado).

## 2. Conflitos entre documentos orientadores

| Tema | `Modelo/DESIGN.md` | `AGENTS.md` (RDC_MOBILE) | `docs/revisao-painel.md` | Slate Executive (`design-tokens.css`, solicitação atual) | Decisão aplicada |
|---|---|---|---|---|---|
| Cor primária | `#102E49` | `#111111` + dourado `#A68A52` | — | `#222B35` | Slate Executive (padrão único solicitado) |
| Fonte | Arial | Arial/Inter | — | Inter | Inter, Arial como fallback |
| Raios | controle 6 px, card 10 px | card 6 px, controle 4 px | 3 px | 4 px | 4 px (tokens), 3 px em miniaturas |
| Impacto | laranja exclusivo | — | — | `--info` como 2ª série medida | `--info` (mantido o que o código já fazia) |
| Feriado/fim de semana no calendário | — | — | sem símbolo nas células | não usar só cor | Mantido sem símbolo (decisão anterior do usuário), com **legenda** e texto para leitor de tela |

`Modelo/DESIGN.md` descreve outro painel (referência de gráficos industriais); seus princípios de gráfico (base zero, grade discreta, eixos mais fortes, sem 3D) foram seguidos, a paleta não.

## 3. Problemas encontrados

### Crítico
1. **Layout inutilizável abaixo de 1024 px** — lateral fixa de 256 px sempre visível: a 390 px restavam ~130 px de conteúdo. `Shell.tsx`.
2. **Filtro e dado divergentes em Comparação** — no modo "Período do painel", `useEscopoIndependente` usava as datas gravadas no `localStorage` na 1ª vez, não o período atual: o rótulo dizia "período do painel" e a consulta usava outro período.
3. **Contraste de botões de decisão abaixo de AA** — branco sobre `--warning` 2,79:1 ("Liberar revisão") e sobre `--danger` 4,05:1 ("Cancelar"), para texto de 13 px (mínimo 4,5:1).

### Alto
4. Tela presa em "Carregando…" para sempre quando a 1ª consulta falha (Desempenho, Desvios, Detalhamento sem estado de erro).
5. Animações infinitas dos ícones de KPI sem controle de pausa (WCAG 2.2.2) e competindo com o número.
6. Bordas de campos `#DCE3E8` = 1,30:1 (WCAG 1.4.11 exige 3:1); foco do login só pela borda dourada (2,79:1) com `outline-none`.
7. Ordenação da tabela só por clique em `<th>` (sem teclado, sem `aria-sort`); checkboxes sem rótulo.
8. Diálogos (`CargaProducao`, `Lightbox`) sem `role="dialog"`, sem Esc, sem gestão de foco; setas ‹ › sem nome acessível; campo de arquivo sem rótulo.
9. `EChart`: `...option` sobrescrevia os padrões de título/legenda; números de eixo e tooltip no formato en-US (`1,234.5`); ao ficar vazio, o gráfico anterior continuava desenhado por baixo do aviso; SVG sem descrição acessível.
10. Filtros documentados mas ausentes na interface: **Status** (o modelo `FiltrosSecundarios` já suportava). Atalho de pendências → "Enviado" (`INFORMATION_ARCHITECTURE.md`) nunca implementado.
11. Detalhe do RDC: o texto do motivo continuava preenchido ao trocar de registro (risco de validar outro RDC com motivo errado); "Cancelar" irreversível sem confirmação; sem retorno de sucesso.
12. Calendário: feriado e fim de semana diferenciados só por cor, sem legenda; descrição só em `title`.

### Médio
13. Sem indicação de filtros ativos nem de qual atalho de período está aplicado; período invertido (De > Até) aceito em silêncio.
14. Tabela de "Maiores desvios" segue só o período, sem avisar que área/responsável/contrato não se aplicam; Comparação idem.
15. KPIs com alturas desiguais e rótulos quebrando em posições diferentes (valores fora da mesma linha de base); grade fixa por breakpoint de viewport, não pelo espaço real.
16. Títulos de seção 14 px em `--secondary`, iguais em todos os níveis (sem hierarquia página → seção).
17. Participação em `Math.round(x*100)%`, fora do padrão pt-BR de 1 casa (`fmtPercentual`).
18. Tabelas sem colunas numéricas alinhadas à direita/sem quebra; sem estado vazio; cabeçalho fixo via `<tr sticky>`.
19. `tratarErroRpc` chamado durante a renderização em Contexto (efeito colateral em render).
20. `<html lang="en">` num painel em português (pronúncia errada em leitores de tela).

### Baixo
21. "Sair" em texto sublinhado com cor de link padrão; nome do usuário ocupando espaço no celular.
22. Bundle único de 1,39 MB (ECharts sem code-splitting) — já registrado no README.

## 4. Correções realizadas

| Arquivo | Correção | Justificativa |
|---|---|---|
| `styles/index.css` | Foco visível global (`--info`, 4,43:1); `.se-input` com borda `--blue-soft` (3,66:1); `.se-field`, `.se-link`, `.se-button--sm`; variantes de botão nas cores `-text` (6,8–7,1:1); cabeçalho de tabela fixo em `th`, `.num`, `.se-table-wrap`, `.se-table-empty`, botão de ordenação; KPI com rótulo de 2 linhas reservadas e valor sem quebra; animações só em hover/foco; estilos do calendário. Classes de componente em `@layer components` para que utilitários Tailwind prevaleçam | Itens 3, 5, 6, 15, 18 |
| `components/charts/EChart.tsx` | Mescla correta dos padrões; eixos/tooltip pt-BR (`fmtNumero`); `hideOverlap`; tooltip com tokens e `confine`; fundo transparente (o `ChartCard` pinta); `clear()` quando vazio; prop obrigatória `descricao` → `role="img"` + `aria-label`; sem animação com `prefers-reduced-motion` | Item 9 |
| `components/ui/KpiCard.tsx` | `role="group"` rotulado, definição como descrição acessível (`aria-describedby`), hierarquia rótulo → valor+unidade → contexto | Itens 5, 15 |
| `components/ui/Shell.tsx` | Lateral vira gaveta < 1024 px (botão "Menu e filtros", Esc, foco, fundo); `main` como `@container`; cabeçalho comum por tela | Item 1 |
| `components/ui/CabecalhoTela.tsx` (novo) | Título da tela, período, nº de RDC no recorte, horário da última consulta, filtros ativos removíveis, nota de escopo, aviso de desatualização; `tratarErroRpc` em `useEffect` | Itens 13, 14, 19 |
| `components/ui/Sidebar.tsx` | Ordem período → recorte → busca → exportar; `fieldset/legend`; atalho ativo com `aria-pressed`; filtro **Status**; aviso de período invertido; "Limpar filtros (n)" desabilitado sem filtros | Itens 10, 13 |
| `components/ui/CardHeader.tsx`, `EstadoTela.tsx`, `telas.ts`, `useDialogo.ts` (novos) | Cabeçalho padrão de card (15 px/600 + subtítulo + ações que quebram); estado de carregamento/erro sem dado anterior; tipo das telas; Esc + foco para diálogos | Itens 4, 8, 16 |
| `components/ui/Card.tsx` | `forwardRef` | Necessário para foco/rolagem de diálogos e do detalhe |
| `components/ui/Lightbox.tsx` | Diálogo com Esc, setas do teclado, botões nomeados de 44 px, contador "n/N", `alt` descritivo | Item 8 |
| `components/CargaProducao.tsx` | `role="dialog"`, título associado, Esc (bloqueado durante a carga), rótulo do campo de pasta, `progress` rotulado, status anunciado. Lógica de carga intacta | Item 8 |
| `components/Calendario.tsx` | Linha de meses, inicial do dia da semana, marcador "Hoje", legenda, texto `sr-only` por célula (contido na célula para não alargar a página), `th scope="row"`, área rolável com cabeçalho e 1ª coluna fixos, coluna de nomes mais estreita no celular | Item 12 |
| `screens/Contexto.tsx` | Pendências como cards (contagem + rótulo + explicação); atalho "Ver no Detalhamento" aplica Status = Enviado | Item 10 |
| `screens/Desempenho.tsx` | Mantidas as escolhas do gráfico feitas em paralelo (barras ordenadas, rótulo na ponta); estilos de eixo centralizados no `EChart`; KPIs em grade por contêiner (1/2/3/6 colunas); estado de erro | Itens 4, 15 |
| `screens/Desvios.tsx` | Barras empilhadas mantidas (decisão documentada), com nota de que a soma não é KPI; tooltip em HH; nomes truncados no eixo; tabelas com estado vazio, colunas numéricas, nota de escopo | Itens 9, 14, 18 |
| `screens/Comparacao.tsx` | Datas efetivas de cada escopo no subtítulo; rádios agrupados (`name`, `fieldset`); cards de situação responsivos; `fmtPercentual`; estados de carregamento/vazio | Itens 2, 17, 18 |
| `screens/Detalhamento.tsx` | Ordenação por botão com `aria-sort`; linhas com `aria-selected`, Enter/Espaço; checkboxes rotulados; detalhe com `key` (zera motivo/edição ao trocar de RDC); confirmação de cancelamento; mensagem de decisão registrada; motivo com `label`; layout lado a lado só com ≥ 1024 px de conteúdo | Itens 7, 11 |
| `screens/Login.tsx` | Campos `.se-input` (foco visível), `autocomplete` | Item 6 |
| `filters/useEscopoIndependente.ts` | "Período do painel" usa o período global atual | Item 2 |
| `domain/formatters.ts` | `fmtNumero` (pt-BR, até 1 casa) | Item 9 |
| `index.html` | `lang="pt-BR"` | Item 20 |
| `tests/e2e/painel.spec.ts` | Asserção de HH escopada ao card do KPI | O rótulo "8,0 HH" adicionado ao gráfico em paralelo tornava `getByText('8,0')` ambíguo |
| `tests/e2e/layout.spec.ts` (novo) | Sem rolagem horizontal em 1440×900, 1024×768, 768×1024, 390×844 nas 5 telas (+ capturas); gaveta + Esc; atalho de pendências; `aria-sort` por teclado; Esc e retorno de foco no diálogo; descrição dos gráficos e console sem erros | Validação |

## 5. Critérios de padronização

- **Cores**: só tokens de `design-tokens.css` (espelhados em `@theme` de `index.css`). Gráficos leem via `cssVar()`. Nenhum hexadecimal novo em componentes.
- **Tipografia**: Inter; título de tela 20 px/600; título de card 15 px/600 em `--text-primary`; subtítulo 12 px `--text-secondary`; KPI 22–28 px/700 tabular; rótulos de eixo 11 px, categorias 12 px.
- **Raios**: 4 px (cards e controles); 3 px em miniaturas/marcadores.
- **Cards**: `Card`/`ChartCard` + `CardHeader`; ações à direita quebram para baixo.
- **Grades**: por espaço real do conteúdo (`@container` no `main`): KPIs 1 → 2 (≥ 22 rem) → 3 (≥ 40 rem) → 6 (≥ 66 rem); Detalhamento lado a lado ≥ 64 rem.
- **Gráficos**: sempre via `EChart` com `descricao`; barras horizontais ordenadas para comparação categórica; base zero; `barMaxWidth` 22; unidade no subtítulo e no tooltip; nada de pizza para comparação.
- **Tabelas**: `.se-table` dentro de `.se-table-wrap` (rolagem própria), `min-w-*` explícito, `th scope`, `.num` para números, estado vazio textual.
- **Estados**: `EstadoTela` antes da 1ª carga/erro; aviso de desatualização no `CabecalhoTela`; dados anteriores nunca apagados.
- **Status**: `Badge` (fundo claro + texto `-text`), nunca só cor; tom decidido por regra de negócio (`domain/badges.ts`).
- **Escopo**: toda seção que não segue todos os filtros globais diz isso em texto.
- **Acessibilidade**: foco visível em todo controle; diálogos com Esc e foco; animação só sob interação e desligada com `prefers-reduced-motion`.

## 6. Resultados da validação (executados em 11/10/2026)

| Verificação | Antes | Depois |
|---|---|---|
| `npm run build` | OK (aviso de chunk > 500 kB) | OK (mesmo aviso; JS 1.391 kB, CSS 31,6 kB) |
| `npm run lint` (oxlint) | 0 erros, 13 avisos | 0 erros, os mesmos 13 avisos preexistentes |
| `npm run test:unit` | 30/30 | 30/30 |
| `npm run test:e2e` | 8/9 — falha em "Desempenho calcula HH" causada pela edição paralela do gráfico | 18/18 |
| Console do navegador nas 5 telas | — | sem erros nem avisos |

Inspeção visual feita sobre as capturas do Playwright (Chromium, dados simulados de `fixtures/mocks.ts`) em 1440×900, 1024×768, 768×1024 e 390×844. Contraste verificado por cálculo WCAG dos pares de tokens usados.

## 7. Pendências e limitações

- **Filtro de disciplina** continua sem controle na interface. Ligá-lo exige usar `hhImpactoRateadoPorDisciplina` no KPI "HH de impacto" (regra do `KPI_CATALOG.md`); isso mexe em cálculo exibido e ficou para decisão do responsável.
- Calendário ainda sem marcos do ciclo 21→20 e sem "Ver próximos dias" (limitação já listada no README).
- Validação só com dados simulados e um único Chromium; sem leitor de tela real, sem Safari/iOS.
- Os 13 avisos de lint são preexistentes (refs em render em `useUltimoSucesso`, `Date` em render no calendário etc.) e não foram tocados, por envolverem lógica de dados.
- `Desempenho.tsx` foi editado por outra sessão durante esta auditoria (20:49); as escolhas visuais daquela edição foram preservadas.
- Publicação (`npm run publish`) não executada.

## 8. Próximas melhorias recomendadas

1. Decidir e implementar o filtro de disciplina com o rateio do catálogo.
2. Code-splitting do ECharts e das telas (`import()`), para reduzir o bundle de 1,39 MB.
3. Contexto: acrescentar evolução diária de RDC emitidos e de HH (linha), respondendo "como evoluiu?" na 1ª tela.
4. Marcos do ciclo de medição e navegação "próximos dias" no calendário.
5. Seleção "todos" na tabela do Detalhamento para a ação em lote.
6. Corrigir os avisos de lint de `useUltimoSucesso` (estado em vez de ref) com teste de regressão do comportamento "não apagar dados bons".
