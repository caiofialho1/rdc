# Revisão do Painel de Controle — 10/10/2026

Aplicação da skill `executive-dashboard-design`. Público considerado: Planejamento e administradores dos contratos. Decisões: identificar esforço registrado, investigar impactos, validar RDC e completar informações de contrato e PTS.

## Hierarquia e alterações

1. Período, filtros, fonte e data/hora da última consulta bem-sucedida.
2. Seis indicadores de esforço, registros, impactos, PTS e bloqueios.
3. Prioridades do recorte: registros aguardando validação, sem contrato e com PTS sem espera informada. O botão de pendências aplica a situação “Aguardando validação” e abre a tabela, preservando os demais filtros.
4. Seção de gráficos com duas roscas de composição por disciplina e uma série temporal de HH trabalhado e impacto.
5. Calendário de emissão e tabelas de investigação e ação.

Os gráficos antigos e seus resumos auxiliares foram substituídos por três visuais derivados das atividades e dos totais de impacto dos RDC. A navegação por teclado das tabelas e dos registros continua disponível. No celular, os KPIs passam a uma coluna.

## Catálogo de indicadores

| Indicador | Fórmula / unidade | Contexto e interpretação |
|---|---|---|
| HH trabalhado | Σ(efetivo × duração em minutos) / 60; HH | Esforço informado nas atividades; não mede produção ou produtividade. |
| Registros de campo | Contagem de RDC no recorte | Validados / total do recorte; “Válidos” exclui cancelados e versões substituídas, mas inclui aguardando validação e revisão liberada. |
| HH de impacto estimado | Σ(duração dos impactos × maior efetivo do RDC) / 60; HH | Sem filtro de disciplina, mantém o total do RDC. Com disciplina selecionada, apresenta a parcela rateada na proporção do HH trabalhado dessa disciplina. A razão impacto / trabalho não é taxa de indisponibilidade. |
| Tempo de impacto | Σ(duração dos impactos) / 60; h | Intervalos simultâneos são somados, não deduplicados. |
| Espera PTS | Média das esperas informadas nos RDC com PTS; h/min | Mostra a amostra sobre o total com PTS. Sem PTS, sem declaração e sem horário são estados distintos. |
| Bloqueios | Contagem de RDC com bloqueio = verdadeiro | Informa quantos RDC declararam sim ou não; ausência de declaração aparece como “—”. |

### Comparativo por responsável

- O gráfico de barras horizontais empilha, para cada responsável com RDC no recorte, `Σ HH trabalhado` e `Σ HH de impacto estimado`, ambos em horas. O empilhamento é uma codificação visual solicitada para comparar as séries; a soma do comprimento não representa um novo KPI de trabalho realizado. As séries começam em zero. Com disciplina selecionada, o HH trabalhado usa apenas suas atividades e o HH de impacto é rateado pela participação dessa disciplina no HH do respectivo RDC, como no KPI.

Não há metas, baseline de produção ou escala de pessoal disponíveis. Nenhuma meta ou tendência foi inferida. A direção desejada de HH e bloqueios depende do escopo de trabalho; não foi atribuída avaliação de desempenho pela cor desses números. A validação é uma pendência operacional observável.

## Fonte, recortes e limites

- As tabelas usam uma escala de texto e preenchimento, do azul mais forte ao mais suave: seção (`--title-1`, `--fill-1`), cabeçalho (`--title-3`, `--fill-3`) e corpo (`--title-4`, `--fill-4`); metadados usam `--title-5` quando o fundo permite contraste suficiente. As cores de estados, feriados, fins de semana e marcos do calendário mantêm seus significados próprios.
- As colunas numéricas das tabelas de responsáveis, impactos e RDC compartilham largura de 100 px e preenchimento horizontal de 8 px. Cabeçalhos numéricos longos quebram linha; o espaço restante favorece colunas de texto e as tabelas continuam roláveis quando necessário.
- Botões, campos, busca, filtros ativos e controles do detalhe usam raio uniforme de 3 px, conforme `executive-dashboard-design/references/design-system.md`. Cartões, seções e tabelas permanecem retangulares; o foco visível de teclado foi preservado.
- Subtítulos, metadados de seção, descrições dos cartões de KPI, textos introdutórios e legendas explicativas foram retirados da vista principal. Títulos, valores, unidades, período, controles, estados de erro e informações de cada RDC permanecem. Contextos dos KPIs ficam disponíveis no atributo `title`; datas do calendário continuam com descrições acessíveis.
- O login foi padronizado como cartão único centralizado, com logotipo PPL destacado, título direto, campos e botão na mesma escala visual do painel. O crédito “Desenvolvido por Fialho Consultoria de Planejamento LTDA.” usa o nome já presente no rodapé do app. O formulário aceita Enter em qualquer campo e mantém mensagem de erro acessível.
- Os cabeçalhos 01–06 compartilham altura mínima de 52 px e preenchimento interno de 4 × 12 px (6 × 12 px no celular). Cabeçalhos abertos e fechados usam o mesmo espaçamento; os intervalos entre seções foram reduzidos para aproveitar melhor a altura do painel.
- Fonte: RPC `rdc_admin_exportar`, no Supabase, com autenticação administrativa; métricas definidas em `supabase/migracao_v8_pts_gps_painel.sql`. Consulta ao entrar, alterar datas ou atualizar; filtros locais recalculam a consulta carregada.
- Granularidade: RDC por data de execução; atividades e impactos relacionados pelo código. O filtro de disciplina limita o HH trabalhado às suas atividades. Nos gráficos e no KPI, o HH de impacto do RDC é rateado entre disciplinas pela participação de cada uma no HH trabalhado daquele RDC, sem duplicar o total. RDC com impacto e sem atividade classificável aparece em “Sem disciplina”; filtros de PTS, bloqueios e tabelas de impactos seguem relativos ao RDC completo.
- As roscas exibem a composição de HH trabalhado e de impacto em horas, com anel espesso, total central e percentuais dentro das fatias, sem linhas de chamada. A legenda compacta preserva valor e percentual por disciplina, inclusive para fatias pequenas sem rótulo interno. No desktop, ficam empilhadas à direita do gráfico de linhas; em telas menores, passam para baixo dele. O gráfico de linhas usa a data de execução do RDC e alterna entre dias, semanas de segunda a domingo e meses. Na visão diária, mostra sempre o ciclo completo de medição (21 a 20) que contém a data final do filtro geral; quando esse ciclo ultrapassa o período consultado para o painel, faz uma segunda consulta apenas para o gráfico. As visões semanal e mensal continuam no período geral. Disciplina, responsável e contrato têm filtros próprios no gráfico de linhas, aplicados depois dos filtros gerais; as roscas e KPIs não mudam com esses filtros locais. Datas sem RDC aparecem como lacunas, não como zero; a tabela abaixo lista somente períodos com registro. Recortes semanais/mensais extensos têm controle de zoom horizontal. As séries trabalhado e impacto têm cores e traços próprios.
- A seção 02 usa um componente React isolado (`painel-charts.js`) e Apache ECharts com renderização SVG. React 18.3.1 e ECharts 5.6.0 estão fixados em `assets/vendor`, com licenças incluídas. O painel permanece utilizável como HTML local, sem build ou CDN. Cada gráfico acompanha o recorte atual, observa mudanças de tamanho e libera a instância ECharts quando desmontado.
- Dias sem RDC são ausência de registro, não execução zero.
- O calendário não conhece escala nem férias; dias sem registro não comprovam falta ou inadimplência. A contagem auxiliar de dias úteis sem RDC sob cada responsável foi retirada da interface.
- Os 28 feriados de 2026 e 2027 foram incorporados exatamente da lista fornecida para São Luís/MA (nacional, estadual e municipal). O painel não extrapola essa lista para outros anos. Feriados aparecem em dourado, fins de semana em azul acinzentado, sem letra ou símbolo dentro de células sem RDC; nome e abrangência constam no título da data e na descrição acessível das células. Se houver RDC, a célula mostra ✓ ou a quantidade normalmente, inclusive em feriados e fins de semana.
- Na Emissão diária, se o período selecionado termina hoje ou em uma data futura do mês corrente, o calendário se estende até o último dia do mês. Os dias acrescentados são marcados como futuros e podem ser alcançados pelo botão “Ver próximos dias”. A extensão não muda a consulta nem os KPIs.
- A Emissão diária mostra o botão “Ver próximos dias” quando há datas futuras; o texto introdutório foi retirado. A área acima da grade reservada aos rótulos verticais mede 60 px quando há marcos visíveis e desaparece nos recortes sem marcos.
- Uma linha vertical azul neon tracejada de 2 px percorre a coluna de hoje. O dia 21 marca o início do ciclo de medição; o dia 20 do mês seguinte marca o término. Linhas verde e magenta neon, também de 2 px, identificam esses marcos. Cada linha tem apenas um rótulo vertical curto (“Hoje”, “Início” ou “Término”), sem caixa de preenchimento, em um tom legível da cor correspondente, alinhado à linha acima da grade; o título das datas mostra a regra e o intervalo concreto, inclusive na virada de ano. As linhas acompanham o redimensionamento da tabela. No celular, a coluna dos responsáveis permanece visível durante a rolagem horizontal, com nomes abreviados sem alterar a altura das linhas. As marcações não alteram métricas ou filtros.
- O banco já normaliza totais ausentes de atividades e impactos como zero (`coalesce`). Esta revisão não altera o contrato de dados nem audita duplicatas da base real. PTS e bloqueio preservam os estados ausentes disponíveis na resposta.
- Após falha na consulta, os resultados anteriores recebem aviso persistente junto à fonte e mantêm seu período original. Uma consulta bem-sucedida remove o aviso. A exportação fica indisponível antes da primeira carga e durante uma atualização.

## Validação

Executado `python tests/test_painel.py`, com Playwright e Microsoft Edge em modo headless. Todas as chamadas externas são interceptadas; os registros são sintéticos e não foram adicionados ao produto ou à base.

- Totais de HH, impactos, contagens, amostra PTS e dados preparados para exportação reconciliados.
- Recortes de situação e disciplina, botão de pendências, ordenação e abertura por teclado verificados.
- Falha de negócio, falha de rede, resultado vazio e recuperação verificados.
- As três visualizações, seus totais, o rateio por disciplina, a agregação diária/semanal/mensal, o ciclo diário completo (inclusive virada de ano), a segunda consulta do ciclo, os filtros locais e o estado vazio foram verificados com dados sintéticos.
- Layout sem transbordamento horizontal da página nas larguras 320, 390, 768, 1024 e 1440 px; as tabelas possuem rolagem própria.
- Capturas desktop/mobile inspecionadas; nenhum erro JavaScript durante o teste.

Limite: validação local com dados sintéticos, sem autenticação nem consulta à base de produção. Arquivos alterados localmente; publicação não realizada.
