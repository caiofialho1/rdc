# Sistema visual de relatórios

## Hierarquia e geometria

Usar grid consistente e alinhar títulos, números, gráficos e tabelas às mesmas guias. Tratar os valores como início; validar no tamanho final.

| Elemento | Tela | Impresso / slide |
| --- | --- | --- |
| Espaçamento base | 4, 8, 12, 16, 24, 32 px | Usar proporções equivalentes, sem converter px diretamente em pt |
| Margem de página | 24–32 px desktop; 16 px celular | 12–16 mm em A4; adaptar ao slide |
| Entre blocos | 24–32 px | 5–8 mm em A4 quando couber |
| Padding de painel | 16–24 px | 4–6 mm |
| Título → subtítulo | 6–8 px | 2–3 mm |
| Cabeçalho do gráfico → plotagem | 12–16 px após legenda | Reservar faixa própria para título/legenda |
| Rótulo → marca | 6–8 px; ampliar conforme fonte | 2–3 mm; validar contraste e corte |
| Fonte / nota | 8–12 px abaixo de eixo/rótulos | Faixa independente do gráfico |
| Botão web | Raio 0; alvo preferencial de 44 × 44 px | Omitir controles sem função no estático |

Dimensionar plotagem depois de reservar título, legenda, eixos, rótulos e fonte. Medir o maior rótulo e valor antes de definir margens. Não posicionar notas sobre dados.

Usar 3–5 KPIs como ponto de partida no desktop; em celular empilhar na ordem narrativa. Evitar cartão pesado para cada KPI. Em A4 vertical, preferir poucas figuras maiores. Se ficar ilegível, reduzir indicadores secundários ou passar detalhe para anexo. Se todos os itens forem obrigatórios e não couberem, explicitar conflito sem omitir linhas.

## Tipografia

Usar Arial como padrão neutro ou a fonte da marca fornecida. Preferir uma família principal e pesos 400/600/700; usar números tabulares quando suportados.

| Papel | Web / painel | A4 |
| --- | --- | --- |
| Título do relatório | 24–28 px | 16–20 pt |
| Valor KPI | 28–36 px | 18–24 pt |
| Título gráfico / seção | 16–18 px | 11–13 pt |
| Corpo / tabela | 13–15 px | 10–11 pt |
| Eixos / rótulos | 12–13 px | 9–10 pt |
| Fonte / nota | 11–12 px | 8–9 pt; não usar essa faixa para dados essenciais |

Em slides, considerar distância de leitura e usar texto maior. Não transpor valores de A4 para slides. Verificar caracteres e substituição de fonte. Evitar CAIXA ALTA em frases longas; texto à esquerda e números à direita em tabelas.

## Cores e marcas

Aplicar identidade fornecida e verificar fonte atual antes de afirmar que uma paleta é oficial. Na ausência de marca, usar padrão neutro:

| Função | Cor | Aplicação |
| --- | --- | --- |
| Página | #F7F7F5 | Fundo geral |
| Plotagem | #F1F2F0 | Fundo discreto de gráfico |
| Texto principal | #111111 | Títulos e valores |
| Texto secundário | #555555 | Contexto e eixos |
| Grade | #DDE0DE | Apoio fino |
| Eixo | #737B78 | Referências X/Y |
| Real / foco | #303030 | Série principal |
| Previsto | #737B78 | Comparação, também por padrão de traço |
| Meta | #86642C | Marcador de referência |
| Favorável | #256445 | Estado com palavra/símbolo |
| Atenção | #8A5A00 | Estado com palavra/símbolo |
| Desfavorável | #A1272D | Estado com palavra/símbolo |

Manter semântica das cores. Preservar cor da série mesmo quando resultado estiver ruim; usar status separado. Preferir uma cor focal e neutros, acrescentando comparação útil. Distinguir real, previsto e projeção também por traço/rótulo. Verificar contraste mínimo de 4,5:1 para texto normal e 3:1 para texto grande e elementos essenciais; repetir ao aplicar marca, transparência e exportação. A grade secundária pode permanecer discreta; não usá-la para comunicar informação essencial.

## Gráficos e rótulos

- Usar grade aproximadamente 0,5–0,75 px e eixos 1–1,25 px como início; manter dados dominantes. Mostrar apenas direções de grade úteis; evitar caixa pesada nos quatro lados.
- Usar séries aproximadamente 2–2,5 px. Destacar marcadores em pontos relevantes ou séries curtas. Evitar suavização que invente trajetória.
- Usar barras de término reto, sem cápsulas. Ajustar espessura ao número de categorias: cerca de 16–24 px de barra horizontal e 8–12 px entre barras como início.
- Preferir rótulos fora da extremidade; dentro somente com contraste, comprimento e margem suficientes. Reservar espaço para negativos, extremos e moeda.
- Quebrar nomes longos sem perder código/identidade; preferir barras horizontais para nomes extensos. Evitar rotação como primeira solução; até 45° somente se necessário e legível.
- Usar ticks regulares, aproximadamente 4–6 quando adequado. Em séries longas, mostrar datas-chave e manter valores essenciais no resumo/tabela. Não rotular todos os pontos se houver colisão.
- Rotular finais das linhas quando possível. Se próximos, escalonar com guias ou usar legenda próxima. Não deslocar valor sem vínculo explícito com a marca.
- Reservar maior valor e anotações; não alterar números para encaixar. Não truncar dados essenciais com reticências no estático.
- Incluir unidade, referência temporal e significado das séries. Usar conclusão no título quando sustentada, recorte no subtítulo e fonte na nota.

## Tabelas e estados

Usar cabeçalho claro, linhas leves e respiro vertical; evitar grade pesada em todas as células. Preservar OM/TAG sem notação científica. Repetir cabeçalho nas páginas seguintes; evitar quebra de linha de tabela entre páginas.

Usar texto de estado: “Enviado”, “Não enviado”, “Envio não informado”, “Aprovado”, “Pendente”. Desconhecido não equivale a não realizado. Em web, tratar loading, vazio, erro, parcial e desatualizado; manter atualização e filtros visíveis.

## Meio e exportação

- Web: contexto → síntese → evidência → exceções → ação no celular. Não reduzir a tela inteira até ficar ilegível. Tabelas largas podem ter rolagem explícita; oferecer leitura por item quando útil. Permitir toque, foco, teclado e valores sem hover.
- Power BI: controlar canvas, padding, interações, rótulos, categorias e contraste; conferir exportação. Aplicar parâmetros sem exigir CSS não suportado.
- Excel: formatar números, eixos e objetos conforme área de impressão; inspecionar PDF exportado.
- PDF/Word/slides: preferir vetores quando suportados; para raster, gerar resolução de uso final, geralmente 300 dpi para impressão. Conferir a 100%, notas, páginas e fontes. Não capturar tela enorme para caber em A4.
