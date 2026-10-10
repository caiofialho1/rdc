# Bibliotecas locais do painel

O `painel.html` é executado diretamente no navegador, sem build. Estes arquivos são versões fixadas para que os gráficos funcionem sem CDN em tempo de uso:

| Arquivo | Origem | Licença |
| --- | --- | --- |
| `react-18.3.1.min.js` | https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js | `react-LICENSE.txt` |
| `react-dom-18.3.1.min.js` | https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js | `react-dom-LICENSE.txt` |
| `echarts-5.6.0.min.js` | https://cdn.jsdelivr.net/npm/echarts@5.6.0/dist/echarts.min.js | `echarts-LICENSE.txt` |

Os arquivos servem exclusivamente à seção React de gráficos em `painel-charts.js`.
