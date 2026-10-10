# Design system — executivo

## Tokens padrão (customizáveis por marca)
| Token | Valor | Uso |
|---|---|---|
| `--color-text` | `#111111` | Texto principal |
| `--color-graphite` | `#303030` | Destaques e série principal |
| `--color-accent` | `#A68A52` | Série de referência e ênfase |
| `--color-muted` | `#666666` | Texto secundário e eixos |
| `--color-border` | `#E5E5E5` | Bordas |
| `--color-page` | `#F7F7F5` | Fundo geral |
| `--color-surface` | `#FFFFFF` | Cards e painéis |
| `--color-plot` | `#F0F1F2` | Área de plotagem |
| `--color-grid` | `#D9DDE1` | Linhas auxiliares |
| `--font-family` | `Arial, sans-serif` | Tipografia |
| `--radius-control` | `3px` | Botões e controles |
| `--space-unit` | `4px` | Escala de espaçamento |

## Tipografia e espaçamento
- Título da página: 24–30 px; seção: 18–22 px; título de card: 14–16 px; rótulos de gráfico: 11–13 px, ajustados à densidade.
- Preferir escala de espaçamento 4, 8, 12, 16, 24, 32 px; padding de card 16–24 px.
- Alinhar títulos, cards e áreas de gráfico em grid consistente. Evitar muitos tamanhos de fonte.
- Preservar contraste WCAG AA quando aplicável, inclusive em séries e rótulos.

## Componentes recomendados
`DashboardShell`, `Header`, `FilterBar`, `KpiCard`, `ChartPanel`, `DataTable`, `InsightPanel`, `StatusIndicator`, `EmptyState`, `ErrorState`.

## ECharts — estilo base
- `grid.containLabel = true`; reservar espaço real para legendas e rótulos.
- `splitLine` com cor `#D9DDE1`, largura aproximada de 0.6–1 px.
- `axisLine` com cor `#666666`, largura aproximada de 1.2–1.5 px.
- `tooltip.trigger = 'axis'` em séries temporais comparáveis.
- Usar paleta semanticamente estável, evitando atribuir a mesma cor a significados diferentes.
- Rótulos opcionais e seletivos, sem sobreposição; tooltip para detalhes.
- Área de plotagem com `#F0F1F2`, preservando contraste visual.

## Responsividade
Desktop: KPIs em 3–5 colunas conforme largura; gráficos 2 colunas quando legíveis. Tablet: 2 colunas. Mobile: 1 coluna, controles compactos e legendas reposicionadas. Priorizar scroll vertical; evitar scroll horizontal no dashboard (tabelas podem ter contêiner de rolagem identificado).
