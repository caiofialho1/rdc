---
version: alpha
name: RDC — Planejamento e controle de campo
description: Identidade visual baseada na captura original e nas preferências aprovadas para gráficos industriais.
colors:
  primary: "#102E49"
  on-primary: "#FFFFFF"
  text: "#183752"
  muted: "#526B82"
  production: "#2B78D8"
  impact: "#ED7938"
  impact-text: "#A74C20"
  neutral: "#F4F6F9"
  chart-surface: "#F8FAFC"
  chart-plot: "#EDF3F8"
  chart-grid: "#D2DDE8"
  chart-axis: "#597087"
typography:
  headline:
    fontFamily: Arial
    fontSize: 30px
    fontWeight: 700
    lineHeight: 1.1
  body:
    fontFamily: Arial
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
  chart-label:
    fontFamily: Arial
    fontSize: 11px
    fontWeight: 400
    lineHeight: 1.4
  chart-value:
    fontFamily: Arial
    fontSize: 12px
    fontWeight: 700
    lineHeight: 1.4
rounded:
  control: 6px
  card: 10px
  bar-terminal: 5px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  desktop-margin: 32px
  mobile-margin: 16px
components:
  page:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.control}"
  chart-card:
    backgroundColor: "{colors.chart-surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.card}"
    padding: 22px
  chart-plot:
    backgroundColor: "{colors.chart-plot}"
    textColor: "{colors.muted}"
    typography: "{typography.chart-label}"
  chart-value:
    backgroundColor: "{colors.chart-plot}"
    textColor: "{colors.text}"
    typography: "{typography.chart-value}"
  chart-impact-label:
    backgroundColor: "{colors.chart-plot}"
    textColor: "{colors.impact-text}"
  chart-production-bar:
    backgroundColor: "{colors.production}"
  chart-impact-bar:
    backgroundColor: "{colors.impact}"
  chart-grid:
    backgroundColor: "{colors.chart-grid}"
  chart-axis:
    backgroundColor: "{colors.chart-axis}"
---

## Overview

Painel de manutenção industrial para comparar mão de obra trabalhada, interferências e distribuição por disciplina. A referência concreta é a captura original `Referencia_Original.png`: barras azuis planas, impactos em laranja e rótulos compactos. O redesign preserva essa linguagem, acrescentando ritmo consistente e melhor leitura das magnitudes.

Preferência explícita do usuário: fundos de gráficos suaves e sem branco, linhas de grade finas e eixos X e Y mais fortes. A identidade serve a leitura de dados, sem efeitos decorativos nas barras. Registros demonstrativos devem continuar identificados.

## Colors

Azul-marinho identifica estrutura e ações principais. Azul de produção aparece em todas as disciplinas porque a categoria já está nomeada; cores diferentes não representam informações adicionais. Laranja é reservado à série de impacto. O texto laranja mais escuro mantém leitura dos valores pequenos.

Cards dos gráficos usam #F8FAFC e a área quantitativa #EDF3F8. Grade #D2DDE8 apoia comparação; eixos #597087 identificam a origem. Texto usa #183752 e metadados #526B82.

## Typography

Arial com Helvetica/sans-serif de fallback. Números do painel devem usar tabular-nums. Valores próximos às barras usam 11–12 px em negrito moderado; rótulos e escalas usam 10–11 px. Todas as quantidades usam pt-BR e a unidade HH é explícita. A informação principal precisa continuar legível sem hover.

## Layout

Manter o painel, filtros e indicadores existentes. Gráficos lado a lado no desktop, proporção aproximada 1,88:1; empilhar até 800 px. Canvas de 280 px de altura por gráfico, ajustando a largura e resolução ao dispositivo. Reservar margem de rótulos antes de calcular a área quantitativa. Valores por disciplina acompanham a extremidade da barra, sem ficar isolados numa coluna distante.

## Elevation & Depth

Hierarquia por camadas tonais, bordas leves e espaços. As barras são planas; profundidade não deve alterar a percepção da magnitude.

## Shapes

Barras verticais têm cantos superiores arredondados até 5 px e base quadrada alinhada ao zero. Barras horizontais têm extremidade direita arredondada e origem quadrada. Ajustar raio para barras pequenas, preservando comprimento proporcional. Largura máxima das colunas de 27 px; altura das barras horizontais de 26 px. Espaçamento constante dentro de cada grupo.

## Components

- Grade: 0,6 px, cor chart-grid; horizontal no gráfico diário e vertical no gráfico por disciplina.
- Eixos X e Y: 1,4 px, cor chart-axis, desenhados sobre a grade para manter a origem nítida.
- Escalas: iniciar em zero e usar limite superior arredondado. HH trabalhado e HH de impacto usam a mesma escala no gráfico diário.
- Rótulos: quantidade azul acima da coluna, impacto acima da coluna laranja quando houver espaço; por disciplina, HH e participação juntos na extremidade.
- Tooltip: consultar por ponteiro, toque ou teclado. Oferecer tabela textual no gráfico diário e descrição acessível no gráfico de disciplinas.
- Estado vazio: não inventar magnitudes. Mostrar o estado vazio já existente.
- Animação: opcional e curta, respeitando prefers-reduced-motion. Nesta versão, alteração direta sem animação.

## Do's and Don'ts

- Usar a foto como referência de geometria e papéis de cor, preservando os dados do projeto real.
- Preservar base zero, escala, filtros e valores; nunca simular crescimento por efeitos visuais.
- Usar azul uniforme nas disciplinas e laranja exclusivo para impactos.
- Manter grade discreta e eixos identificáveis.
- Não adicionar 3D, sombras decorativas ou gradientes às barras.
- Não tornar o hover a única forma de consultar informações.
- Preservar SharePoint, Supabase, autenticação e outras integrações existentes ao aplicar este contrato a um projeto real.
