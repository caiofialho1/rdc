---
name: formatar-relatorios-bi
description: Definir KPIs, escolher gráficos e criar, formatar ou revisar relatórios profissionais com análise de dados, BI, UI/UX e storytelling. Usar em relatórios executivos, planejamento, manutenção, obras, medições, produção, custos, recursos, databooks e dashboards; em pedidos para organizar textos, dados, rótulos e espaçamentos ou melhorar gráficos em Power BI, Excel, HTML/React, PDF, Word e apresentações. Aplicar visual sóbrio, fundos discretos, grades finas, eixos definidos e botões retangulares sem arredondamento.
---

# Relatórios profissionais e BI

Atuar como especialista de dados, BI e design de informação. Entregar evidência organizada para decisão: o que aconteceu, comparação com o compromisso, onde está o desvio e qual ação precisa ocorrer. Priorizar verdade analítica e legibilidade sobre ornamentação.

## Preferências obrigatórias

- Não usar botões arredondados, cápsulas ou pills. Aplicar raio zero aos botões; usar também cartões, filtros e contêineres retangulares como padrão. Não confundir essa regra com marcadores circulares necessários a um gráfico.
- Usar fundo de gráfico levemente tonalizado, sem branco puro como padrão; grade fina e discreta; eixos X/Y visualmente mais fortes que a grade e mais fracos que os dados.
- Reservar espaço entre títulos, subtítulos, legendas, plotagem, rótulos, notas e bordas. Não aceitar sobreposição, corte ou texto comprimido.
- Dar protagonismo aos dados. Evitar 3D decorativo, velocímetros por padrão, sombras intensas, degradês decorativos, excesso de cores e animação sem função.
- Respeitar o escopo atual. Se o pedido for somente status de envio, não acrescentar custo, prazo ou produtividade.

## Recursos

- Ler [kpis-e-graficos.md](references/kpis-e-graficos.md) para definir fórmulas, agregações, metas e gráficos.
- Ler [sistema-visual.md](references/sistema-visual.md) antes de compor ou alterar layout.
- Usar [tokens-relatorio.css](assets/tokens-relatorio.css) como ponto de partida em HTML/CSS; adaptar a marca sem mudar geometria e hierarquia.
- Ler [validacao.md](references/validacao.md) antes da entrega; aplicar casos de controle pertinentes.

## Procedimento

### 1. Definir decisão e contrato dos dados

Identificar público, pergunta principal, período, corte, formato, tamanho final e decisão esperada. Inspecionar arquivos, marca atual e estrutura existente. Perguntar apenas por informação que impeça a correção; avançar com decisões reversíveis e explicitar suposições.

Registrar granularidade, identificador, origem, unidade, calendário, filtros, baseline e significado de cada status. Conferir duplicidades, vazios, totais e relações muitos-para-muitos. Manter OM/TAG como texto para preservar identificadores. Distinguir execução, competência de medição e emissão documental.

Não inventar dados, metas, logos, conclusões ou causas. Identificar demonstrações como fictícias. Separar falta de dados, zero real e não aplicável; não transformar ausência de meta em desempenho aprovado.

### 2. Definir KPIs antes dos gráficos

Selecionar indicadores associados a uma decisão. Usar 3–5 KPIs no resumo executivo como ponto de partida, não como obrigação; priorizar menos quando o pedido for específico.

Produzir um dicionário compacto no planejamento da entrega:

| Campo | Conteúdo obrigatório |
| --- | --- |
| Decisão e KPI | Pergunta atendida e nome inequívoco |
| Cálculo | Fórmula, numerador, denominador e agregação |
| Recorte | Unidade, granularidade, período, filtros e fonte |
| Comparação | Meta/baseline válida, referência temporal e sentido desejável |
| Status | Limites documentados; indicar proposta quando não definidos |
| Exceções | Denominador zero, ausência, parcialidade e mudança de escopo |
| Visual | Gráfico primário, justificativa e alternativa útil |

Recalcular taxas pela soma dos numeradores / soma dos denominadores, não pela média simples de percentuais. Ponderar avanço físico por escopo válido, não pelo número bruto de tarefas. Separar resultado, processo e contexto. Não classificar mais gasto, mais pessoas ou mais HH como resultado positivo automaticamente.

Conservar definições em nota, aba metodológica ou documentação editável; não obrigar a inclusão do dicionário inteiro na página final.

### 3. Selecionar evidência visual

Definir para cada visual: pergunta, dados, codificação visual, unidade, comparação, título, rótulos, anotação e tamanho final. Usar a matriz da referência.

- Preferir barras/pontos para comparação; linhas para tempo; bullet ou barra com marcador para meta; barras divergentes para desvios; tabela para identificadores e observações.
- Começar barras em zero e usar escalas iguais em painéis comparáveis. Informar recorte de eixo em linhas quando necessário, sem exagerar diferenças.
- Mostrar meta/baseline e distinguir real, previsto e projeção. Não prolongar realizado além do corte. Mostrar lacunas reais sem interpolação silenciosa.
- Evitar eixo duplo como padrão; usar painéis alinhados para unidades diferentes. Não somar unidades incompatíveis nem inferir causa de correlação.
- Preferir rótulos diretos. Em conflito, ampliar espaço, mudar orientação, usar pequenos múltiplos ou reduzir rótulos secundários; manter valores essenciais visíveis e detalhe em tabela. Não cortar informação crítica ou diminuir fonte indefinidamente.

### 4. Organizar com storytelling

Construir ordem de leitura e pesos visuais, adaptando ao meio:

1. **Contexto:** título, contrato/ativo quando necessário, período e atualização.
2. **Mensagem principal:** conclusão factual de uma linha apoiada nos dados; usar título descritivo quando não houver evidência suficiente.
3. **Resultado e compromisso:** KPIs essenciais com valor, unidade, meta, desvio e status textual.
4. **Evidência:** um gráfico dominante que explica o resultado e visuais de apoio com perguntas distintas.
5. **Exceções:** maiores desvios, observações e causas comprovadas; marcar hipóteses como hipóteses.
6. **Ação:** decisão, responsável e prazo somente quando informados; indicar pendente em vez de inventar atribuições.
7. **Rastreabilidade:** fonte, corte, filtros relevantes e limitações que mudam a interpretação.

Evitar repetir números sem outra finalidade. Ordenar exceções por impacto/urgência e manter ordem temporal nas séries. Não usar “crítico” sem critério documentado. Escrever títulos como “Realizado 8 p.p. abaixo do previsto” somente quando sustentados pelo cálculo.

### 5. Aplicar design e implementar no meio solicitado

Usar identidade fornecida ou existente no arquivo. Se faltar marca, usar padrão neutro; não apresentar cor presumida como oficial. Separar cor da marca, série e status. Usar cor + texto/símbolo para estados.

Integrar skills de planilhas para Excel, documentos para Word, PDF para PDF, apresentações para slides e visualização para web quando disponíveis. Usar DESIGN.md quando solicitado para persistir parâmetros. Esta skill não substitui validações técnicas nem exige instalar ferramentas novas.

Para Power BI, fornecer visuais, campos, medidas, filtros, ordenação e formatação. Gerar DAX/M somente conhecendo o esquema ou declarar nomes como modelo. Não alegar edição de PBIX inexistente. Para web, preservar valores sem hover, oferecer teclado/foco e adaptar a ordem de leitura ao celular. Para estáticos, não incluir botões sem função.

### 6. Revisar e entregar

Reconciliar totais e definições com a fonte. Renderizar no tamanho de uso e inspecionar todos os gráficos, tabelas e páginas; corrigir sobreposição, truncamento, fonte pequena e legendas distantes. Verificar impressão/exportação; em web, celular e desktop. Não afirmar aprovação visual sem inspecionar renderização; declarar limitações do ambiente.

Entregar o artefato solicitado e explicação curta das mudanças e verificações. Preservar dados e definições editáveis para atualizações. Não substituir gráficos precisos por imagem gerada por IA.
