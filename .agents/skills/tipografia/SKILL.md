---
name: tipografia
description: Aplicar o padrão de tipografia corporativa em relatórios, apresentações, dashboards e interfaces HTML/React quando houver decisões sobre fontes, hierarquia, tamanhos, espaçamento ou legibilidade.
---

# Padrão de Tipografia para Relatórios Corporativos

**Versão:** 1.0  
**Aplicação:** documentos Word/PDF, apresentações, relatórios executivos, dashboards Power BI e interfaces HTML/React.

## 1. Objetivo

Estabelecer uma identidade tipográfica consistente, com foco em legibilidade, hierarquia da informação, precisão numérica e aparência corporativa discreta.

## 2. Família tipográfica oficial

**Fonte principal: Inter** — recomendada como padrão unificado para documentos, indicadores, tabelas, gráficos e interfaces.

| Peso | Valor CSS | Aplicação |
|---|---:|---|
| Regular | 400 | Textos, descrições e notas |
| Medium | 500 | Rótulos, cabeçalhos de tabela e destaques moderados |
| Semibold | 600 | Títulos, subtítulos, KPIs |
| Bold | 700 | Destaques de alta prioridade, com moderação |

**Fontes alternativas:** Aptos para documentos do Microsoft 365; Arial para máxima compatibilidade; IBM Plex Sans para relatórios técnicos; Source Sans 3 para textos extensos.

**Fallback digital:** `Inter, Arial, sans-serif`.

> Evitar misturar muitas famílias: preferencialmente uma fonte principal e, no máximo, uma alternativa para situações específicas.

## 3. Hierarquia tipográfica

### Documentos Word e PDF (tamanhos em pt)

| Elemento | Tamanho | Peso | Diretriz |
|---|---:|---:|---|
| Título do relatório | 20–24 pt | 600 | Claro, conciso, preferencialmente em uma ou duas linhas |
| Título de seção | 13–15 pt | 600 | Separação visual consistente |
| Subtítulo | 11–12 pt | 600 | Subordinação evidente ao título |
| Corpo do texto | 10–11 pt | 400 | Entrelinha de 1,15–1,3 |
| Cabeçalho de tabela | 9–10 pt | 600 | Contraste com os dados |
| Conteúdo de tabela | 9–10 pt | 400–500 | Números alinhados à direita |
| Legendas e fontes | 8–9 pt | 400 | Sempre legíveis na impressão |

### Dashboards HTML/React (tamanhos em px)

| Elemento | Tamanho | Peso | Diretriz |
|---|---:|---:|---|
| Título da página | 24–30 px | 600 | Hierarquia principal |
| Título de seção | 16–20 px | 600 | Distinto do conteúdo |
| Título de gráfico | 14–16 px | 600 | Descritivo e objetivo |
| KPI principal | 28–36 px | 600 | Preferir algarismos tabulares |
| Corpo do texto | 14–16 px | 400 | Entrelinha de 1,4–1,6 |
| Rótulos e eixos | 11–13 px | 400–500 | Evitar sobreposições |
| Conteúdo de tabela | 12–14 px | 400–500 | Alinhamento por tipo de dado |
| Rodapé / fonte | 11–12 px | 400 | Contraste suficiente |

> Em Power BI, ajustar os tamanhos conforme dimensão da página, densidade visual e distância de leitura. Não reduzir rótulos a ponto de dificultar a interpretação.

## 4. Diretrizes de diagramação

- Utilizar **alinhamento à esquerda** para textos e títulos.
- Alinhar **valores numéricos à direita**, com casas decimais consistentes.
- Preferir **algarismos tabulares** para KPIs, colunas e comparações, quando disponíveis.
- Definir uma escala de espaçamento consistente: **4, 8, 12, 16, 24 e 32 px** em interfaces digitais.
- Manter margens internas confortáveis em cartões, tabelas e gráficos.
- Evitar caixa alta em parágrafos; reservar para pequenas etiquetas e categorias.
- Não utilizar negrito em blocos inteiros de texto.
- Priorizar contraste, legibilidade e conteúdo sobre elementos decorativos.
- Não utilizar botões ou cartões excessivamente arredondados; preferir cantos retos ou raio discreto (0–4 px).

## 5. Padronização dos gráficos

1. Usar títulos que identifiquem claramente o indicador e o período.
2. Priorizar rótulos legíveis, sem colisões ou truncamentos desnecessários.
3. Aplicar fundo cinza-claro sutil, em vez de branco puro, quando adequado.
4. Adotar linhas de grade finas e discretas; eixos X e Y podem ter traço levemente mais forte.
5. Remover bordas, sombras e legendas redundantes.
6. Manter unidades e formatos constantes: `R$`, `%`, `m²`, `HH`, datas e separadores decimais.
7. Usar até duas casas decimais apenas quando houver ganho analítico.
8. Destacar o resultado principal e utilizar cores de alerta somente quando representarem status ou desvio.
9. Reservar espaço entre títulos, área de plotagem, eixos e legendas.

## 6. Paleta corporativa de referência

| Papel | Cor | HEX |
|---|---|---|
| Títulos principais | Preto | `#111111` |
| Textos fortes | Grafite | `#303030` |
| Textos secundários | Cinza médio | `#666666` |
| Destaques institucionais | Dourado | `#A68A52` |
| Linhas e divisórias | Cinza claro | `#E5E5E5` |
| Fundo de relatório | Branco suave | `#F7F7F5` |
| Superfícies de alto contraste | Branco | `#FFFFFF` |

Usar o dourado como acento, não como cor padrão de textos longos. Em gráficos, garantir que a paleta continue compreensível sem depender exclusivamente de cor.

## 7. Exemplo de CSS reutilizável

```css
:root {
  --font-corporate: 'Inter', Arial, sans-serif;
  --color-title: #111111;
  --color-text: #303030;
  --color-muted: #666666;
  --color-accent: #A68A52;
  --color-border: #E5E5E5;
  --color-background: #F7F7F5;
}

body {
  font-family: var(--font-corporate);
  font-size: 14px;
  line-height: 1.5;
  color: var(--color-text);
  background: var(--color-background);
}

h1 { font-size: 28px; font-weight: 600; line-height: 1.2; }
h2 { font-size: 20px; font-weight: 600; line-height: 1.3; }
h3 { font-size: 16px; font-weight: 600; line-height: 1.35; }

.kpi-value {
  font-size: 32px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}

.chart-label { font-size: 12px; font-weight: 500; }
.report-note { font-size: 12px; color: var(--color-muted); }

th { font-size: 13px; font-weight: 600; text-align: left; }
td { font-size: 13px; font-weight: 400; }
.numeric { text-align: right; font-variant-numeric: tabular-nums; }
```

**Nota:** carregar/licenciar a família Inter no projeto antes de utilizá-la; caso indisponível, o sistema aplicará a fonte alternativa configurada.

## 8. Checklist de qualidade

- [ ] Tipografia padronizada em todas as páginas e componentes.
- [ ] Hierarquia visual evidente entre títulos, subtítulos e dados.
- [ ] Tamanhos legíveis em tela e na impressão.
- [ ] Alinhamentos e casas decimais consistentes.
- [ ] Gráficos sem colisão de rótulos ou excesso de linhas.
- [ ] Espaçamentos internos e externos uniformes.
- [ ] Contraste suficiente entre texto e fundo.
- [ ] Cores institucionais aplicadas com moderação.
- [ ] Exportação em PDF revisada quanto a quebras, fontes e tabelas.

## 9. Diretriz final

Para estabelecer **uma identidade única em todos os canais**, utilizar **Inter** como fonte institucional. Em materiais que exijam compatibilidade universal com ambientes Microsoft sem instalação de fontes, utilizar **Arial** como alternativa operacional. Aplicar sempre a mesma lógica de hierarquia, pesos, espaçamento e formatação numérica.

---

## 9. Tipografia para aplicativos mobile (Android, iOS e PWA)

**Fonte principal:** Inter (Regular 400, Medium 500, Semibold 600 e Bold 700). Em apps nativos, as fontes de sistema — SF Pro no iOS e Roboto no Android — também são escolhas apropriadas, principalmente quando a integração visual com o sistema operacional é prioritária.

| Elemento | Tamanho mobile | Peso | Observação |
|---|---:|---:|---|
| Título da tela | 22–24 px | 600 | Preferir até duas linhas |
| Título de seção | 18 px | 600 | Hierarquia clara |
| Subtítulo | 16 px | 500 | Usar com parcimônia |
| Corpo de texto | 16 px | 400 | Altura de linha 1,45–1,55 |
| Campo de formulário | 16 px | 400 | Evita zoom automático em alguns navegadores móveis |
| Texto de botão | 15–16 px | 600 | Contraste adequado |
| Rótulo do campo | 14 px | 500 | Sempre visível, sem depender só do placeholder |
| Texto secundário | 14 px | 400 | Contraste acessível |
| Legenda ou metadado | 12–13 px | 400 | Não usar para conteúdo essencial |
| KPI | 24–32 px | 600 | Números tabulares |

### Regras de interface e acessibilidade

- Usar uma única família principal, preferencialmente Inter, com hierarquia baseada em tamanho e peso.
- Permitir ajuste de tamanho de fonte pelo usuário e evitar alturas fixas em caixas de texto.
- Alvos de toque: preferencialmente 44–48 px de altura, com espaçamento suficiente entre ações.
- Espaçamento base de 4 px, com intervalos comuns de 8, 12, 16 e 24 px.
- Textos e valores críticos devem ser legíveis sem zoom; evitar tamanho menor que 14 px em atividades de campo.
- Manter contraste mínimo de 4,5:1 para texto normal e 3:1 para texto grande, conforme WCAG AA.
- Para valores financeiros e indicadores, usar `font-variant-numeric: tabular-nums`.
- Em gráficos mobile, preferir poucos rótulos, abreviações claras e rolagem ou detalhamento quando necessário; não reduzir indiscriminadamente a tipografia.
- Para aplicativos de campo RDC/RDO, dar prioridade à leitura, à conclusão rápida dos formulários e à visibilidade dos estados de sincronização.

### Tokens CSS recomendados

```css
:root {
  --font-mobile: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
  --text-primary: #111111;
  --text-secondary: #666666;
  --surface: #F7F7F5;
  --border: #E5E5E5;
  --accent: #A68A52;
  --type-screen: 1.5rem;
  --type-section: 1.125rem;
  --type-body: 1rem;
  --type-label: .875rem;
  --type-caption: .8125rem;
  --type-kpi: 1.75rem;
}
body { font-family: var(--font-mobile); font-size: var(--type-body); line-height: 1.5; color: var(--text-primary); }
input, textarea, select { font: inherit; font-size: 1rem; }
button { font: 600 1rem/1.25 var(--font-mobile); min-height: 44px; border-radius: 0; }
.kpi { font-size: var(--type-kpi); font-weight: 600; font-variant-numeric: tabular-nums; }
```

**Nota:** Em aplicações React Native, Flutter e apps nativos, utilizar a escala tipográfica acima adaptada às unidades lógicas e às configurações de acessibilidade da plataforma (sp no Android, points no iOS). Em sites e PWAs, usar rem e respeitar o zoom do navegador.
