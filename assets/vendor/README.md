# Bibliotecas locais do painel

O `painel.html` é executado diretamente no navegador, sem build. Estes arquivos são versões fixadas para que os gráficos funcionem sem CDN em tempo de uso:

| Arquivo | Origem | Licença |
| --- | --- | --- |
| `react-18.3.1.min.js` | https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js | `react-LICENSE.txt` |
| `react-dom-18.3.1.min.js` | https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js | `react-dom-LICENSE.txt` |
| `echarts-5.6.0.min.js` | https://cdn.jsdelivr.net/npm/echarts@5.6.0/dist/echarts.min.js | `echarts-LICENSE.txt` |
| `xlsx-0.20.3.full.min.js` | https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js | `xlsx-LICENSE.txt` (Apache-2.0) |

React e ECharts servem à seção de gráficos em `painel-charts.js`. O SheetJS (`xlsx`) só é usado em `painel-carga.js`, para ler no navegador as memórias de cálculo escolhidas pelo administrador no botão "Atualizar carga produção"; nada é enviado a terceiros.
