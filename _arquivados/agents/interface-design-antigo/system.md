# RDC · Central de controle de campo

Guia do painel reconstruído a pedido do usuário com a skill `interface-design`. Implementação atual: `painel.html` e `painel.css`. Este guia registra os padrões de interface mais recentes; mudanças na paleta exigem direção explícita do usuário.

## Domínio e intenção

O administrador acompanha a execução de manutenção industrial por RDC, contrato, disciplina, responsável e ativo. O painel ajuda a responder quanto HH foi trabalhado, quais interferências ocorreram, quem emitiu registros, quanto tempo aguardou PTS e quais registros precisam de validação.

Sensação: central de operação técnica, séria e clara. A assinatura é a comparação do trabalho em azul e das interferências em laranja, com HH aplicado em destaque. Navegação, números, gráficos e registros devem refletir decisões da rotina de campo, sem métricas ou efeitos decorativos.

## Paleta e profundidade

Reutilizar os tokens CSS do projeto. Cores fundamentais: `--navy: #102E49` para estrutura e ação; `--s1: #2B78D8` para HH trabalhado; `--s2: #ED7938` e `--s2-ink: #A74C20` para impactos; `--page: #F4F6F9`; `--card: #FFFFFF`; `--chart-surface: #F8FAFC`; `--plot: #EDF3F8`; `--grid: #D2DDE8`; `--axis: #597087`; `--ink: #183752`; `--muted: #526B82`; `--line: #E1E7ED`; `--focus: #77A9ED`.

O azul-marinho também forma o trilho lateral, a chamada principal de HH e o botão Atualizar. Superfícies tonais e bordas leves definem os níveis. Sombras ficam nas sobreposições. O laranja só comunica impacto ou uma pequena marca de orientação no título. Barras são planas e começam no zero. Disciplinas usam azul uniforme.

## Tipografia, espaçamento e controles

Arial/Helvetica, sem fonte remota. Corpo de 14 px, entrelinha 1,5. Título da página: 28 px, negrito; títulos de seção: 16–24 px; rótulos e metadados: pelo menos 12 px; números principais: 28–36 px. Dar hierarquia por peso, contraste e espaço. Quantidades seguem pt-BR e usam algarismos tabulares.

Base de espaçamento de 4 px, com escala de 4, 8, 12, 16, 24 e 32 px. Raio zero em cards, controles, filtros, estados, navegação e barras, conforme a skill `Skill/formatar-relatorios-bi/SKILL.md`. Inputs, selects e ações têm altura mínima de 44 px. Usar HTML nativo, manter foco visível, estados de hover e desabilitado, `aria-pressed` nos períodos, `aria-busy` no carregamento e movimento reduzido quando solicitado pelo navegador.

## Estrutura do painel

- Desktop: trilho lateral azul-marinho de 224 px, reduzido a 200/184 px em larguras intermediárias. O trilho indica a seção atual, oferece atalhos para todas as áreas e mantém acesso ao app RDC.
- Até 800 px: o trilho vira navegação horizontal rolável abaixo do cabeçalho. O conteúdo ocupa a largura da tela. Navegar por um atalho abre o detalhamento correspondente e leva o foco ao título.
- Acesso: cartão em duas colunas com o contexto de operação à esquerda e login à direita; empilhado no celular. A autenticação permanece a mesma do painel.
- Cabeçalho de resultados: período e total de RDC/atividades. Seis cartões compactos de mesmo nível: HH trabalhado em azul-marinho; RDC, HH de impacto, duração de impactos, espera PTS e bloqueios ao lado. Cada cartão reúne nome, valor/unidade e contexto curto.
- Gráficos: seção “O ritmo da operação”, com evolução temporal e distribuição por disciplina. Contratos, impactos por responsável e PTS abrem no próximo bloco; emissão, responsáveis, impactos e registros têm seções próprias numeradas.
- Filtros: datas, períodos e Atualizar sempre visíveis. Área, contrato e demais critérios em uma seção recolhível. Filtros ativos ficam visíveis em botões removíveis. Limpar restaura a situação padrão sem alterar as datas.
- Exportar Excel é uma ação secundária no cabeçalho. Tabelas, seleção em lote, detalhes do RDC e foto continuam ligados aos mesmos dados e funções.

## Gráficos e responsividade

Os SVGs usam as variáveis da paleta. `ResizeObserver` ajusta cada gráfico à largura do card. Evolução diária compartilha a escala de HH trabalhado e impacto, com base zero. Até 62 dias, mostrar por dia; acima disso, somar por mês. Em períodos extensos, permitir rolagem dentro do gráfico, sem alargar a página. Tooltip, teclado e tabela textual mantêm os valores acessíveis.

Na evolução, a linha tracejada indica a média de HH trabalhado por período exibido, considerando somente dias ou meses com RDC (a cobertura fica explícita); ausência de registro não equivale a execução zero; o valor e a unidade ficam legíveis acima do gráfico. No gráfico de disciplinas, mostrar a maior participação em rosca (disciplina líder × demais), com percentual central, valores e legenda textual. O ranking abaixo mantém barras azuis de mesma escala, com trilhos neutros por linha, para comparar os valores sem introduzir novas cores.

Barras horizontais mantêm valor e participação junto à extremidade. Nomes longos quebram em linhas; em cards com menos de 460 px, os nomes ficam acima das barras. As colunas empilhadas têm 30 px; colunas e barras horizontais têm extremidades retas. Grade de 0,6 px e eixos de 1,2 px. Grade discreta, eixos legíveis, sem gradiente e sem animação que altere a leitura.

## Estados e verificação

Manter fórmulas documentadas em `indicadores.md` e preservar filtros, autenticação, integração com Supabase, exportação, consulta, edição e validação. Distinguir zero informado de dado indisponível. Estados vazio, carregando e erro devem ser explícitos. O painel de produção não recebe dados de exemplo.

Após alterações visuais, conferir tela de acesso e painel em 320, 390, 768, 1024 e 1440 px. Verificar ausência de rolagem horizontal da página, texto sem corte, navegação por teclado, abertura dos detalhes, filtros, conteúdo dos gráficos, planilhas e tratamento do estado vazio. O redesenho que estabeleceu este guia passou por essa revisão local com dados demonstrativos.

## Revisão BI — 09/10/2026

O HH indica esforço aplicado, sem inferir avanço físico, produtividade ou aprovação por meta. HH de impacto é estimado pelo maior efetivo do RDC; a soma de durações não elimina concomitâncias. O filtro de disciplina limita as atividades e seu HH, enquanto impactos, PTS e bloqueios permanecem no nível dos RDC selecionados; nesse recorte não mostrar a razão entre impacto integral e HH de uma disciplina.

No celular, distribuir os indicadores em duas colunas. Manter valores das barras visíveis, nomes completos com quebra de linha, e tabelas de todas as categorias, inclusive as agrupadas em Outros. Descrições dos impactos não recebem reticências.

### Gráfico temporal — ajuste específico do SVG

Plotagem diária/mensal com altura de 336 px (300 px em cards estreitos), escala em zero e cerca de cinco intervalos regulares. Valores e datas sempre legíveis, inclusive por rolagem horizontal nos períodos maiores. Reservar no mínimo 84 px por categoria, ampliando pela medida dos rótulos. Mostrar zero quando há RDC com total zero; mostrar “Sem RDC” apenas quando não há registros. A consulta por toque/teclado ocupa uma faixa abaixo da plotagem.

### Preferência aplicada: colunas empilhadas e rosca

Por solicitação do usuário, a série temporal empilha HH trabalhado (base azul) e HH de impacto estimado (topo laranja), com escala calculada pela soma. Essa soma não é HH disponível; a referência tracejada continua sendo a média do trabalho. Rótulos de ambos os segmentos ficam ao lado, com guias, incluindo zeros. A maior participação em HH usa rosca de duas parcelas: disciplina líder e demais disciplinas, com percentual central e valores na legenda. Manter o ranking detalhado abaixo. Total zero não gera percentual fictício.

Conferidos empilhamento e alinhamento dos segmentos, totais preservados, proporções 62,5%/37,5%, rótulos sem colisões, uma disciplina (100%) e total zero. Renderização inspecionada em desktop e celular; verificações de layout em 320, 390 e 1440 px.

## Densidade compacta dos cartões

Preferência solicitada pelo usuário: cartões menores e textos resumidos. A partir de 1400 px, seis indicadores em uma linha; entre 681 e 1399 px, três colunas; até 680 px, duas colunas. Padding de 16 px (12 px até 560 px), gap de 12 px, valores de 28 px e descrições de 12 px. Cantos retos e identidade azul-marinho/laranja preservados. Ícones dos indicadores omitidos em telas estreitas para dar espaço aos rótulos.

Cartões de gráficos: padding de 16 px, gap de 16 px e altura independente do vizinho. Rosca com 120 px de largura. Cabeçalhos expansíveis com mínimo de 72 px. Textos curtos no resumo; fórmulas completas em “Como é calculado”, mantendo visíveis as ressalvas de estimativa, soma e ausência de registros.

Verificação com a mesma base fictícia: em 1440 px, bloco de indicadores de 366 para 172 px (53% menor) e início dos gráficos de 1063 para 779 px. Cinco larguras verificadas (320–1440 px), sem erros JavaScript, rolagem horizontal da página ou rótulos SVG fora dos limites. Seis indicadores, totais, colunas empilhadas e rosca preservados.
