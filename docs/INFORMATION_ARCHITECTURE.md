# Arquitetura de informação (Painel de Controle)

Reorganiza as 8 seções do `painel.html` antigo em 4 telas de storytelling (Painel executivo → Produção → Desvios → Detalhamento; a tela Comparação passou a se chamar Produção em 2026-10-14; a tela Desempenho foi removida em 2026-10-14 e a emissão diária foi para o Painel executivo), sem perder capacidade de dado ou filtro. Implementação em `painel-app/src/screens/`.

| Seção antiga (painel.html) | Tela nova | O que é preservado | O que muda |
|---|---|---|---|
| Barra de filtros + "01 Balanço do período" | **Painel executivo** (tela inicial; substituiu a antiga Contexto em 2026-10-12) | Filtro global (período, área, responsável, disciplina, contrato, situação, busca) dispara `rdc_admin_exportar`; layout do protótipo Stitch "Painel Executivo": KPIs consolidados → resumo de pendências (aguardando validação / sem contrato / PTS sem espera, com atalho que filtra por `Enviado`) → diagnóstico (evolução diária, HH por disciplina, Pareto de impactos, espera de PTS por área) → responsáveis de campo → emissão diária (calendário responsável×dia) → tabela de RDC paginada; banner de "dados desatualizados" em falha de atualização | Paleta própria do protótipo (tokens `--exec-*`); metas/SLA/classificações do protótipo ficam de fora (não existem no banco) |
| "02 Gráficos" (donuts + série temporal) | **Painel executivo** (diagnóstico; tela Desempenho removida em 2026-10-14) | KPIs de HH/impacto/PTS/bloqueios; série temporal diária/semanal/mensal pelo ciclo 21→20; filtros locais de disciplina/responsável/contrato no gráfico, sem afetar KPIs | Composição por disciplina passa de rosca para a forma mais adequada ao número de categorias (ver `KPI_CATALOG.md`); nenhum dado novo |
| "03 Emissão diária" (calendário) | **Painel executivo** (seção "Emissão diária", entre Responsáveis de campo e Detalhamento) | Matriz responsável×dia, feriados/fins de semana, marcos do ciclo, "ver próximos dias" | Reestilizado |
| "04 Responsáveis" | **Painel executivo** e Desvios | Tabela + comparação de HH trabalhado vs. impacto por responsável | — |
| "05 Impactos" | **Desvios** | Tabela de impactos, agrupável, abre detalhe do RDC | — |
| "07 Produção × RDC" | **Produção** | Situação de reconciliação (`Produção com RDC`/`sem RDC`/`RDC sem produção`) como filtro com contagem na tabela de produção | Contagem por TAG×OM×disciplina×data, a partir de `rdc_admin_producao_resp` |
| "08 Produção por responsável" | **Produção** | Tabela com etapas, ativo, área, contrato, HH, valor e produtividade; agrupamento por responsável, contrato, disciplina, etapa, ativo, área, data ou situação; participação % e `etapas_sem_preco` sempre visíveis | Contrato e área vêm do RDC vinculado (data + responsável + OM + TAG + disciplina) |
| "06 Registros RDC" + modal de detalhe | **Detalhamento** | Tabela agrupável, seleção em lote → `rdc_admin_editar`, modal com histórico/validação → `rdc_validar`, fotos com GPS/lightbox, mão de obra por função (pico e HH por função, de `qtd_*` das atividades) | — |
| Botão "Atualizar carga produção" | ação global (acessível de qualquer tela, não é uma tela de storytelling) | Fluxo idêntico: `rdc_admin_mc_status` (diff) → parse XLSX client-side → `rdc_admin_mc_importar` por planilha alterada | Reestilizado; lógica de parsing portada para `domain/xlsxCarga.ts` |

## Modelo de filtros (preservado)

- Período = **medição** (ciclo 21→20), escolhido por **Ano** + **Mês medição** na barra lateral; o mês é o de fechamento (21/01 a 20/02 = fevereiro). Abre na medição em curso. Não há mais datas livres nem atalhos (Hoje/7 dias/30 dias…), desde 2026-10-14.
- Filtros globais (barra lateral) recarregam `rdc_admin_exportar` quando o período muda; os demais filtram em memória sobre o resultado já carregado.
- Produção segue o período global e os filtros de área, responsável, contrato, disciplina e busca (status não se aplica). O escopo de data próprio da antiga Comparação foi removido em 2026-10-14 para que contrato e área do RDC cubram o mesmo período.
- Falha de atualização nunca apaga dados bons: mantém o período e os dados anteriores, com aviso persistente; exportação fica desabilitada antes da primeira carga e durante atualização em curso.
- Sub-filtros locais de um gráfico (ex.: disciplina no gráfico de série temporal) não retroagem sobre KPIs ou outras seções.

## Navegação

4 telas (Painel executivo, Produção, Desvios, Detalhamento) + Login, sem biblioteca de rotas — estado interno simples (aba ativa), já que é um painel interno de uma única sessão, sem necessidade de URLs profundas por tela.

## Padrão visual (2026-10-14)

Todas as telas seguem o visual do **Painel executivo**: a área de conteúdo (`main.tema-exec` em `Shell.tsx`) redefine os tokens de cor para a paleta `--exec-*` (grafite + verde do logotipo PPL `#B3CE52`, vermelho só para impacto/desfavorável, verde para concluído) e aplica a estrutura de card, tabela e chip do Executivo. Gráficos leem as cores do mesmo contêiner (`styles/cssVar.ts`). Cabeçalho e lateral seguem a paleta do app mobile.

O **Detalhamento** é mestre-detalhe: tabela à esquerda e detalhe do RDC fixo à direita a partir de ~72rem de área útil (abaixo da tabela em telas menores), com filtro rápido por status, faixa de identificação, régua de métricas, mão de obra por função (as 7 funções sempre listadas, barra = participação no HH), linha do tempo do turno (atividades em grafite, impactos em vermelho, na mesma régua de horas) e ações de validação fixas no rodapé do painel.

## Exportar observações RDO (2026-10-14)

Botão na lateral, abaixo de "Exportar Excel". Gera `Observacoes_RDO_<início>_a_<fim>.xlsx` com o período e os filtros atuais, uma linha por RDC (cancelados e substituídos ficam fora), nas colunas Data, Hora, Equipamento, OM, Horario_Solicitacao, Horario_Abertura, Impacto e Descricao_Macro_RDO. Regras em `painel-app/src/domain/observacoesRdo.ts`:

- Hora = horário em que o RDC chegou ao banco (`recebido_em`).
- A descrição junta PTS (horários), serviços, executante, efetivo por função (pico), bloqueio, observações das atividades e impactos. Texto acima de 125 caracteres continua na linha seguinte: a linha termina em "(cont.)", a próxima começa com "(cont.)" e repete só Data, Equipamento e OM.
- Impacto PTS: espera acima da meta de 40 min conta como "IMPACTO PTS" com a espera inteira, a menos que o encarregado tenha registrado um impacto "LIBERAÇÃO DE PTS" (vale o registrado). Demais impactos entram pelo tipo, somando os minutos.
- Número da PTS e refeição ainda não existem no banco; entram quando a migração correspondente for autorizada.
