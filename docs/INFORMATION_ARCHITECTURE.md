# Arquitetura de informação (Painel de Controle)

Reorganiza as 8 seções do `painel.html` antigo em 5 telas de storytelling (Painel executivo → Desempenho → Comparação → Desvios → Detalhamento), sem perder capacidade de dado ou filtro. Implementação em `painel-app/src/screens/`.

| Seção antiga (painel.html) | Tela nova | O que é preservado | O que muda |
|---|---|---|---|
| Barra de filtros + "01 Balanço do período" | **Painel executivo** (tela inicial; substituiu a antiga Contexto em 2026-10-12) | Filtro global (período, área, responsável, disciplina, contrato, situação, busca) dispara `rdc_admin_exportar`; layout do protótipo Stitch "Painel Executivo": KPIs consolidados → resumo de pendências (aguardando validação / sem contrato / PTS sem espera, com atalho que filtra por `Enviado`) → diagnóstico (evolução diária, HH por disciplina, Pareto de impactos, espera de PTS por área) → responsáveis de campo → tabela de RDC paginada; banner de "dados desatualizados" em falha de atualização | Paleta própria do protótipo (tokens `--exec-*`); metas/SLA/classificações do protótipo ficam de fora (não existem no banco) |
| "02 Gráficos" (donuts + série temporal) | **Desempenho** | KPIs de HH/impacto/PTS/bloqueios; série temporal diária/semanal/mensal pelo ciclo 21→20; filtros locais de disciplina/responsável/contrato no gráfico, sem afetar KPIs | Composição por disciplina passa de rosca para a forma mais adequada ao número de categorias (ver `KPI_CATALOG.md`); nenhum dado novo |
| "03 Emissão diária" (calendário) | **Desempenho** (bloco de calendário) | Matriz responsável×dia, feriados/fins de semana, marcos do ciclo, "ver próximos dias" | Reestilizado |
| "04 Responsáveis" | **Desempenho** (ou Desvios, conforme espaço) | Tabela + comparação de HH trabalhado vs. impacto por responsável | — |
| "05 Impactos" | **Desvios** | Tabela de impactos, agrupável, abre detalhe do RDC | — |
| "07 Produção × RDC" | **Comparação** | Escopo de data **independente** do filtro global, lazy-load ao abrir, situação de reconciliação (`Produção com RDC`/`sem RDC`/`RDC sem produção`) | Passa a ser a tela central de "Comparação", não uma seção secundária |
| "08 Produção por responsável" | **Comparação** | Escopo de data independente, participação %, `etapas_sem_preco` sempre visível | — |
| "06 Registros RDC" + modal de detalhe | **Detalhamento** | Tabela agrupável, seleção em lote → `rdc_admin_editar`, modal com histórico/validação → `rdc_validar`, fotos com GPS/lightbox | — |
| Botão "Atualizar carga produção" | ação global (acessível de qualquer tela, não é uma tela de storytelling) | Fluxo idêntico: `rdc_admin_mc_status` (diff) → parse XLSX client-side → `rdc_admin_mc_importar` por planilha alterada | Reestilizado; lógica de parsing portada para `domain/xlsxCarga.ts` |

## Modelo de filtros (preservado)

- Filtros globais (barra lateral) recarregam `rdc_admin_exportar` quando o período muda; os demais filtram em memória sobre o resultado já carregado.
- Comparação (Produção × RDC / por responsável) mantém escopo de data **próprio**, lembrado por navegador, independente do filtro global.
- Falha de atualização nunca apaga dados bons: mantém o período e os dados anteriores, com aviso persistente; exportação fica desabilitada antes da primeira carga e durante atualização em curso.
- Sub-filtros locais de um gráfico (ex.: disciplina no gráfico de série temporal) não retroagem sobre KPIs ou outras seções.

## Navegação

5 telas (Painel executivo, Desempenho, Comparação, Desvios, Detalhamento) + Login, sem biblioteca de rotas — estado interno simples (aba ativa), já que é um painel interno de uma única sessão, sem necessidade de URLs profundas por tela.
