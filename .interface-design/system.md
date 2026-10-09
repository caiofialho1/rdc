# RDC · Central de controle de campo

Guia do painel reconstruído a pedido do usuário com a skill `interface-design`. Implementação atual: `painel.html` e `painel.css`. Este guia registra os padrões de interface mais recentes; mudanças na paleta exigem direção explícita do usuário.

## Domínio e intenção

O administrador acompanha a execução de manutenção industrial por RDC, contrato, disciplina, responsável e ativo. O painel ajuda a responder quanto HH foi trabalhado, quais interferências ocorreram, quem emitiu registros, quanto tempo aguardou PTS e quais registros precisam de validação.

Sensação: central de operação técnica, séria e clara. A assinatura é a comparação do trabalho em azul e das interferências em laranja, com produção em destaque. Navegação, números, gráficos e registros devem refletir decisões da rotina de campo, sem métricas ou efeitos decorativos.

## Paleta e profundidade

Reutilizar os tokens CSS do projeto. Cores fundamentais: `--navy: #102E49` para estrutura e ação; `--s1: #2B78D8` para HH trabalhado; `--s2: #ED7938` e `--s2-ink: #A74C20` para impactos; `--page: #F4F6F9`; `--card: #FFFFFF`; `--chart-surface: #F8FAFC`; `--plot: #EDF3F8`; `--grid: #D2DDE8`; `--axis: #597087`; `--ink: #183752`; `--muted: #526B82`; `--line: #E1E7ED`; `--focus: #77A9ED`.

O azul-marinho também forma o trilho lateral, a chamada principal de produção e o botão Atualizar. Superfícies tonais e bordas leves definem os níveis. Sombras ficam nas sobreposições. O laranja só comunica impacto ou uma pequena marca de orientação no título. Barras são planas e começam no zero. Disciplinas usam azul uniforme.

## Tipografia, espaçamento e controles

Arial/Helvetica, sem fonte remota. Corpo de 14 px, entrelinha 1,5. Título da página: 28–40 px, negrito; títulos de seção: 17–24 px; rótulos e metadados: 10–12 px; números principais: até 54 px. Dar hierarquia por peso, contraste e espaço. Quantidades seguem pt-BR e usam algarismos tabulares.

Base de espaçamento de 4 px, com escala de 4, 8, 12, 16, 24 e 32 px. Raio de cards: 16 px; controles: 8 px. Inputs, selects e ações têm altura mínima de 44 px. Usar HTML nativo, manter foco visível, estados de hover e desabilitado, `aria-pressed` nos períodos, `aria-busy` no carregamento e movimento reduzido quando solicitado pelo navegador.

## Estrutura do painel

- Desktop: trilho lateral azul-marinho de 224 px, reduzido a 200/184 px em larguras intermediárias. O trilho indica a seção atual, oferece atalhos para todas as áreas e mantém acesso ao app RDC.
- Até 800 px: o trilho vira navegação horizontal rolável abaixo do cabeçalho. O conteúdo ocupa a largura da tela. Navegar por um atalho abre o detalhamento correspondente e leva o foco ao título.
- Acesso: cartão em duas colunas com o contexto de operação à esquerda e login à direita; empilhado no celular. A autenticação permanece a mesma do painel.
- Cabeçalho de resultados: período e total de RDC/atividades. HH trabalhado aparece em um card azul-marinho dominante, com atividades e dias do recorte. Registros e HH de impacto ocupam o nível seguinte; tempo de impacto, espera PTS e bloqueios ficam agrupados numa faixa de apoio.
- Gráficos: seção “O ritmo da operação”, com evolução temporal e distribuição por disciplina. Contratos, impactos por responsável e PTS abrem no próximo bloco; emissão, responsáveis, impactos e registros têm seções próprias numeradas.
- Filtros: datas, períodos e Atualizar sempre visíveis. Área, contrato e demais critérios em uma seção recolhível. Filtros ativos ficam visíveis em botões removíveis. Limpar restaura a situação padrão sem alterar as datas.
- Exportar Excel é uma ação secundária no cabeçalho. Tabelas, seleção em lote, detalhes do RDC e foto continuam ligados aos mesmos dados e funções.

## Gráficos e responsividade

Os SVGs usam as variáveis da paleta. `ResizeObserver` ajusta cada gráfico à largura do card. Evolução diária compartilha a escala de HH trabalhado e impacto, com base zero. Até 62 dias, mostrar por dia; acima disso, somar por mês. Em períodos extensos, permitir rolagem dentro do gráfico, sem alargar a página. Tooltip, teclado e tabela textual mantêm os valores acessíveis.

Barras horizontais mantêm valor e participação junto à extremidade. Nomes longos quebram em linhas; em cards com menos de 460 px, os nomes ficam acima das barras. As colunas têm até 27 px e cantos superiores arredondados; barras horizontais têm base quadrada e ponta arredondada. Grade discreta, eixos legíveis, sem gradiente e sem animação que altere a leitura.

## Estados e verificação

Preservar fórmulas, filtros, autenticação, integração com Supabase, exportação, consulta, edição e validação. Distinguir zero informado de dado indisponível. Estados vazio, carregando e erro devem ser explícitos. O painel de produção não recebe dados de exemplo.

Após alterações visuais, conferir tela de acesso e painel em 320, 390, 768, 1024 e 1440 px. Verificar ausência de rolagem horizontal da página, texto sem corte, navegação por teclado, abertura dos detalhes, filtros, conteúdo dos gráficos, planilhas e tratamento do estado vazio. O redesenho que estabeleceu este guia passou por essa revisão local com dados demonstrativos.
