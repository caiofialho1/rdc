# Prompt para aplicar o visual do painel RDC

Copie o texto a seguir no Codex, Claude ou agente que terá acesso ao seu projeto. Anexe `Template_RDC_Preview.jpg` e forneça a pasta `src` ou o pacote completo como referência.

---

Atue como especialista sênior em UI/UX e desenvolvimento frontend, com domínio de HTML, CSS, JavaScript e do framework já utilizado no meu projeto.

Refaça a camada visual do meu painel RDC usando os arquivos anexos como parâmetro. A referência principal é `Template_RDC_Preview.jpg`; consulte `Template_RDC.html` para observar a experiência, `DESIGN.md` para a identidade visual, `design-tokens.json` para os parâmetros e `src/styles.css` para os estilos detalhados. A imagem original é a referência de geometria e papéis de cor das barras, além dos campos e indicadores.

## Objetivo

Criar um painel gerencial claro e profissional para planejamento e controle de manutenção industrial. Facilitar a leitura de produção, utilização de mão de obra, registros de RDC e impactos operacionais. A interface deve funcionar em computador, tablet e celular.

## Antes de modificar

Inspecione o código existente, os componentes, as consultas e a estrutura de dados. Identifique os pontos de entrada da tela e reutilize o framework e a biblioteca de gráficos já presentes. Implemente diretamente no projeto, sem criar um sistema paralelo.

Faça a refatoração visual preservando as regras de negócio, fórmulas, filtros, validações, rotas, permissões, autenticação e integrações existentes. Preserve conexões com SharePoint, Supabase ou qualquer outra fonte atualmente usada. Não altere schema, tabelas, políticas de acesso ou backend para acomodar o layout. Caso uma mudança funcional seja indispensável, explique o motivo antes de executá-la.

## Referência visual

- Fundo principal cinza claro `#F4F6F9`; superfícies brancas `#FFFFFF`.
- Azul-marinho `#102E49` no cabeçalho, nos botões principais e no indicador de HH trabalhado.
- Azul `#2B78D8` para barras de produção e séries principais; laranja `#ED7938` para impactos. Nos gráficos, use texto de impacto `#A74C20`, preservando contraste legível.
- Texto principal `#112F4B`; texto secundário `#708296`; bordas `#E1E7ED`.
- Fonte Arial, com Helvetica e sans-serif como alternativas. Números tabulares nos indicadores.
- Cards com cantos de 9–10 px, bordas sutis e sombras leves. Evite efeitos decorativos que reduzam a legibilidade.
- Largura máxima do conteúdo: 1500 px. Margens laterais de 32 px no desktop, 20 px no tablet e 16 px no celular.
- Espaçamento consistente entre seções e componentes. Título principal em torno de 30 px no desktop e 25 px no celular; valores de indicadores entre 28 e 35 px.
- Ícones consistentes de uma biblioteca real. A referência usa Phosphor Icons. Preserve o logotipo oficial existente quando disponível, sem inventar uma marca.

## Estilo dos gráficos — preferência obrigatória

Use cards de gráficos com fundo suave `#F8FAFC` e área de plotagem azul-acinzentada `#EDF3F8`, evitando fundo branco. As linhas de grade devem ser discretas, finas (aproximadamente 0,6 px), em `#D2DDE8`. Os eixos X e Y devem ser mais fortes (aproximadamente 1,4 px), em `#597087`. Exibir escalas e unidades legíveis, manter o zero como base das barras e evitar bordas extras. No gráfico por disciplina, usar escala numérica horizontal, grade vertical fina e eixo vertical para as categorias. Preserve esse estilo em todos os gráficos do painel.

Use barras planas e proporcionais, com origem quadrada e extremidade arredondada em até 5 px. No gráfico diário, arredonde somente os cantos superiores, mantenha espaçamento constante por grupo e largura máxima aproximada de 27 px. Trabalho e impacto devem compartilhar a mesma escala. Coloque os valores acima das respectivas barras; para períodos densos, use tabela e tooltip acessíveis sem sobrepor rótulos.

No gráfico horizontal, todas as disciplinas usam o mesmo azul, com barras de aproximadamente 26 px de altura e cantos arredondados somente à direita. Coloque o valor de HH e a participação percentual juntos, próximos à extremidade de cada barra. Use texto `#183752` para valores e `#526B82` para rótulos e escalas. Preserve espaço para os valores ao calcular a área de plotagem.

## Skills e padrão DESIGN.md

Quando disponíveis, utilize a skill `design-md` para manter o contrato visual e as skills de visualização de dados para escolher e implementar os gráficos. Leia `DESIGN.md` antes de editar, preservando as preferências explícitas do usuário. O projeto inclui a ferramenta oficial `@google/design.md`, do repositório `google-labs-code/design.md`; execute `npm run design:lint` para validar o contrato. Esse padrão descreve a identidade visual e não substitui a biblioteca de gráficos nem a verificação no navegador. Adapte os componentes à biblioteca já usada no projeto real.

## Organização da página

1. Cabeçalho compacto identificando o painel.
2. Título “Painel de campo”, breve descrição, horário real da última atualização e ação “Exportar Excel”.
3. Bloco de filtros com título e ação “Limpar filtros”.
4. Linha com período selecionado e quantidade de RDC encontrados.
5. Seis indicadores: HH trabalhado; RDC emitidos; HH de impacto; horas de impacto; espera média pela PTS; bloqueios.
6. Dois gráficos: HH trabalhado e HH de impacto por dia; HH trabalhado por disciplina.
7. Detalhamento dos registros acessível por expansão, sem ocupar a visão inicial.

## Filtros e comportamento

Preserve os campos De, Até, Área, Responsável, Disciplina, Situação e Buscar por OM, ativo ou código. Preserve os atalhos Hoje, 7 dias, 30 dias, Este mês e Mês anterior, calculados com a data real e o fuso da aplicação. Datas no formato brasileiro `dd/mm/aaaa`, números no padrão `pt-BR` e unidades explícitas.

Todos os indicadores, gráficos, contagens e a exportação devem respeitar exatamente os mesmos filtros. O botão Atualizar deve consultar ou recalcular a fonte existente, apresentar um estado de carregamento e informar o resultado real. O arquivo Excel deve ser um `.xlsx` válido; preserve a exportação existente se ela já atender ao requisito.

A busca deve manter o foco e ser eficiente. Mostrar estados de carregamento, resultado vazio, erro e sucesso. Validar datas invertidas. Tratar períodos longos sem omitir dias silenciosamente. Excluir cancelados e versões antigas conforme a regra real de situação.

## Indicadores e dados

Use exclusivamente a base real do projeto. Os números e registros do template são demonstrativos e não devem substituir a base, entrar em produção ou se tornar constantes nos cálculos.

Preserve as fórmulas existentes. Diferencie HH de horas de impacto. Não invente metas, variações ou avaliações de desempenho. Diferencie ausência de dado de zero: mostrar “—” para informação indisponível e “0” para zero conhecido. A ausência de registros de PTS não permite concluir que a espera foi zero.

Mantenha a contagem de RDC distintos e a contagem de atividades separadas. Atualize as observações de cada indicador de acordo com os registros filtrados. Se o negócio possui uma lógica específica para HH de impacto ou efetivo, mantenha essa lógica.

## Responsividade e acessibilidade

- Acima de 1200 px: seis indicadores na mesma linha; gráficos em duas colunas, com proporção aproximada 1,88:1.
- Entre 561 e 1200 px: três indicadores por linha e filtros reorganizados conforme o espaço.
- Até 560 px: dois indicadores por linha, filtros em uma ou duas colunas e gráficos empilhados.
- Evite rolagem horizontal da página. Tabelas podem ter rolagem local sem ocultar controles importantes.
- Filtros e botões devem ser confortáveis para toque; usar áreas de interação de pelo menos 44 px no celular quando possível.
- Rótulos acessíveis, foco visível, navegação por teclado e contraste adequado. Evite depender apenas de cor.
- Gráficos com nomes acessíveis e acesso aos valores por tabela ou alternativa textual. Disponibilize informações também para usuários sem hover.
- Respeite a preferência de movimento reduzido.

## Entrega e validação

Entregue os arquivos alterados e o código completo necessário para aplicar a interface no projeto. Organize estilos em tokens e componentes reutilizáveis; adapte ao padrão existente sem impor novas dependências desnecessárias.

Valide no navegador em desktop, tablet e celular. Teste filtros combinados, busca, período sem registros, reset, carregamento, erro e exportação. Compare os totais antes e depois usando a mesma base e os mesmos filtros. Confira especialmente que zero e dados ausentes continuam diferentes.

Apresente uma prévia final e explique objetivamente o que mudou. Informe qualquer limitação de validação. Não declare integração concluída sem testá-la.

Execute a implementação até concluir a tela e as verificações necessárias. Faça perguntas somente quando faltar uma informação que impeça uma alteração correta.
