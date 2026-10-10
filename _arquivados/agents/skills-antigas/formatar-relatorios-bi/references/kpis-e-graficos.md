# KPIs e escolha de gráficos

## Contrato dos indicadores

Selecionar conforme escopo e dados disponíveis. Usar o catálogo como opções, não como obrigação de incluir tudo. Nomear unidade, corte e universo. Documentar metas e limites; não importar metas antigas de outro contrato.

Retornar “N/D” para cálculo indisponível, “N/A” para não aplicável e “Sem meta” quando faltar referência. Para denominador zero, não apresentar 0% por conveniência. Quando planejado for zero e realizado positivo, mostrar realizado e “Execução sem previsão”; analisar origem antes de classificar desempenho.

## Catálogo para planejamento, obras e manutenção

| KPI / decisão | Cálculo e unidade | Visual primário | Cuidado de interpretação |
| --- | --- | --- | --- |
| Avanço físico: quanto do escopo foi concluído? | Σ(peso de escopo × fração concluída) / Σ(pesos); % | Curva S real × baseline; resumo em bullet | Usar pesos aprovados na mesma base; não misturar m², t e unidades; nomear revisões de escopo |
| Desvio físico: estamos aderentes? | Real − previsto na mesma data; p.p. | Barras divergentes por frente | Distinguir p.p. de variação relativa; não derivar dias de atraso apenas do desvio percentual |
| Atingimento da produção: entregamos o programado? | Real no escopo programado / planejado do período; % | Colunas agrupadas semanais ou bullet por frente | Separar disciplinas e unidades; acumulado não é produção semanal |
| Ritmo necessário: qual produção precisamos manter? | Escopo remanescente / períodos produtivos restantes; unidade/período | Barras ritmo atual × necessário e marcador de capacidade | Informar calendário, restrições e premissas; prazo encerrado exige tratamento próprio |
| Capacidade × demanda: o plano é viável? | Mesma unidade; gap = capacidade − demanda | Barras/pontos pareados e desvio | Distinguir capacidade teórica, disponível e realizada; déficit é negativo nesta convenção |
| Cumprimento da programação: atendemos o compromisso? | Atividades previstas no período e concluídas conforme critério / atividades previstas no período; % | Bullet e linha semanal | Definir congelamento, conclusão, cancelamentos e reprogramações; contar atividades únicas |
| Produtividade: qual rendimento dos recursos? | Produção / HH efetivamente aplicados; m²/HH, t/HH ou un./HH | Linha ou barras/pontos por frente | Comparar serviços equivalentes; distinguir HH disponível de aplicado; consolidar pela razão de somas |
| Consumo específico: qual esforço por unidade? | HH aplicados / produção; HH/unidade | Linha × referência ou barras | Menor pode ser melhor; sem produção, mostrar HH e pendência, sem percentual falso |
| Faturamento/medição: atingimos a meta financeira? | Valor medido ou faturado / meta da mesma competência; % | Colunas valor × meta; resumo em bullet | Medido, aprovado, faturado e recebido são estágios distintos |
| Desvio de custo: quanto acima do orçamento? | Real − orçamento comparável; R$ e, se base > 0, % | Barras divergentes; waterfall quando parcelas reconciliadas | Menor custo pode refletir menor entrega; comparar ao trabalho executado quando possível |
| Margem: qual resultado sobre a receita? | (Receita − custos/despesas/tributos definidos) / receita; % | Linha × meta e resultado monetário | Explicitar composição; receita zero torna % indisponível; consolidar por razão de somas |
| SPI: eficiência de prazo pelo valor agregado | EV / PV; adimensional | Linha × referência 1,00 | Exigir EV, PV, baseline e critério válidos; não chamar qualquer real/previsto de SPI |
| CPI: eficiência de custo pelo valor agregado | EV / AC; adimensional | Linha × referência 1,00 | Exigir EV/AC na mesma base monetária; não confundir produção física com EV |
| Backlog: quanto trabalho permanece? | Saldo de escopo ou HH estimados por item; idade em dias separadamente | Barras horizontais e tabela | HH estimados não são consumidos; preservar itens fora do top N em detalhe |
| Impactos: o que compromete a execução? | Horas/perdas por categoria; ocorrências separadas | Pareto de horas ou barras ordenadas | Não duplicar intervalos simultâneos; distinguir horas de calendário, equipe e HH; ocorrências não são duração |
| Efetivo/HH: recursos correspondem ao plano? | Pessoas ou HH real e previsto por período/função | Colunas agrupadas; heatmap para muitas funções × períodos | Pessoas, HH e presença diferem; mais efetivo não prova eficiência |
| IAMO: aderência de mão de obra | HH real / HH previsto; % | Bullet e linha semanal/função | Com jornada igual, equivaler a MO real/MO prevista; com jornadas distintas, usar HH; meta/banda conforme contrato |
| APR: OMs previstas receberam apropriação? | OMs previstas com HH real > 0 / OMs previstas no recorte; % | Bullet e tabela das OMs sem apropriação | Contar interseção, não todas as realizadas; para requisito diário, avaliar OM × data; apropriação não prova conclusão |
| Databooks entregues: atendemos o compromisso? | Entregas exigíveis no recorte, completas e entregues / exigíveis no recorte; % | Bullet e tabela por ativo/OM/prazo | Definir completo/exigível; separar enviado, recebido, aprovado e reprovado |
| Termos enviados: falta enviar documentos? | Documentos emitidos e enviados / emitidos válidos no recorte; % | Barra 100% por estado e tabela | Preservar OM, ativo, emissão e origem quando pedidos; envio desconhecido não é “não enviado” |
| Qualidade documental: aceitação sem retrabalho | Aceitos na primeira submissão / documentos com primeira análise concluída; % | Bullet e barras dos motivos de devolução | Pendentes fora do denominador; controlar versões e unidade documento |

Definir EV (valor agregado do trabalho executado), PV (valor planejado do trabalho previsto) e AC (custo real), na mesma data e base, antes de usar SPI/CPI.

Para atingimento da programação, usar o mesmo universo no numerador e denominador; apresentar execução extra separadamente. Se o contrato usar produção total / plano, nomear essa convenção e mostrar o extra para explicar o índice. Não excluir nem incorporar o extra silenciosamente.

## Matriz de decisão visual

| Pergunta / dados | Escolha principal | Alternativa ou condição |
| --- | --- | --- |
| Comparar categorias / ranking | Barras horizontais | Pontos para comparações próximas; tabela para códigos e observações |
| Real × previsto em poucas categorias | Barras agrupadas ou pontos pareados | Bullet para muitas categorias ou foco em meta |
| Evolução temporal | Linhas | Colunas para volumes discretos; pequenos múltiplos para muitas séries |
| Acumulados | Curva S real × baseline; projeção tracejada se modelada | Desvio em painel separado; pesos e corte explícitos |
| Valor × meta | Bullet: barra real e marcador de meta | Barra simples com marcador; evitar velocímetro/anel como padrão |
| Composição de total | Barras empilhadas; 100% para proporção | Rosca só para 2–4 parcelas simples, com valores/total, quando vantajoso; barras para precisão |
| Desvio positivo/negativo | Barras divergentes em torno de zero | Pontos; explicitar convenção de sinais |
| Formação de um resultado | Waterfall com início, parcelas e total reconciliado | Barras divergentes se parcelas não formarem total |
| Priorizar causas | Barras ordenadas; Pareto quando acumulado ajudar | Pareto exige mesma unidade e acumulado = parcela acumulada / total, em % |
| Relação entre variáveis | Dispersão, unidades nos dois eixos | Facetas por grupo; correlação não prova causa |
| Distribuição | Histograma ou boxplot com n e critérios | Pontos para amostras pequenas; informar classes/outliers |
| Função × semana / ativo × período | Heatmap com escala e valores essenciais | Tabela para poucos cruzamentos; não depender só da cor |
| Durações, marcos e prazos | Gantt com baseline e corte | Tabela de marcos se datas-chave forem a decisão; não inventar caminho crítico |
| Status, OM, TAG e observação | Tabela, texto de status e ordenação útil | Barras de resumo + tabela; preservar rastreabilidade |

## Regras de cálculo e apresentação

- Comparar meta/real da mesma população e janela. Mês parcial exige marca de parcialidade ou meta proporcional sob premissa válida.
- Em “Outros”, informar agrupamento e preservar base completa. Não esconder pendências críticas em top N.
- Somar valores aditivos e recalcular razões; avaliar contagem distinta no contexto correto. Distinct count pode não somar subtotais.
- Definir maior é melhor, menor é melhor ou faixa ideal; documentar limites inclusivos/exclusivos. Status sem regra deve ficar neutro.
- Não limitar produção/faturamento a 100%; sobrecumprimento pode ser real. Investigar avanço de escopo acima de 100% sem corrigir silenciosamente.
- Usar pt-BR: 1.234,56; 92,3%; R$ 1,25 mi; 8,0 p.p.; HH; m². Fixar casas por indicador e detalhar precisão quando necessário.
- Separar análise descritiva e previsão; identificar premissas e incerteza.
