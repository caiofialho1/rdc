# Indicadores do painel RDC

Revisão de 09/10/2026 conforme a skill formatar-relatorios-bi. Implementação: painel.html e painel.css.

## Contrato dos dados

Fonte: RPC rdc_admin_exportar e métricas SQL em supabase/migracao_v8_pts_gps_painel.sql. Unidade de registro: código do RDC; atividades e impactos se relacionam pelo código rdc. OM e contrato permanecem texto. O período utiliza data_rdc, não a data de recebimento ou validação. O filtro padrão exclui Cancelado e Substituído; outros status são selecionáveis. As contagens refletem os registros/versões que o filtro inclui.

| Decisão / indicador | Cálculo e unidade | Universo / exceções | Referência e visual |
| --- | --- | --- | --- |
| Esforço aplicado / HH trabalhado | Soma de efetivo_total × duracao_min / 60 | Atividades dos RDC no filtro; com disciplina, apenas as atividades dela | Sem meta; destaque e barras temporais com origem zero. Não é avanço físico. |
| Pendência documental / RDC | Contagem de registros; aguardando = status Enviado; proporção validada = Validado / registros | Mesma população no numerador e denominador; recorte vazio sem taxa exibida | Sem meta; quantidade, texto e barra de composição. |
| Dimensão dos impactos / HH de impacto estimado | Soma por RDC de min_impacto × efetivo_max / 60 | Estimativa pelo maior efetivo. Impactos simultâneos são somados. | Razão = soma HH impacto / soma HH trabalhado, se denominador positivo e sem filtro de disciplina. Não é participação em uma jornada total nem prova de perda real. |
| Duração registrada / horas de impacto | Soma duracao_min / 60 | Durações dos impactos dos RDC selecionados; não deduplica intervalos/equipes | Sem meta; indicador de apoio e ranking de responsáveis. |
| Liberação / espera média PTS | Soma espera_pts_min / quantidade de RDC com pts=true e espera preenchida | Inclui espera zero informada. Ausência = travessão; mostra tamanho da amostra. Arredonda minutos antes de formatar horas. | Sem meta; indicador e resumo de PTS. Mesma regra na tabela de responsáveis. |
| Bloqueio / RDC com bloqueio | Contagem bloqueio=true | Cobertura = registros com booleano true/false. Cobertura zero = desconhecido, não zero; independente de PTS. | Sem meta; quantidade e cobertura textual. |
| Distribuição / disciplina e contrato | Soma HH por categoria; participação = soma categoria / soma total | Ordenação decrescente; lista completa junto ao gráfico; Outros soma excedentes ao limite de 12 barras | Barras horizontais e tabela; não classifica mais HH como melhor desempenho. |
| Referência descritiva / média temporal | Soma HH / número de dias ou meses com RDC | Até 62 dias: diário; acima: mensal. Meses parciais mantêm o recorte. Sem RDC = N/D na tabela/consulta, sem inferir execução zero. | Linha tracejada, valor e cobertura; não é meta nem projeção. |

O calendário é presença de registros, não comprovação de cumprimento de uma obrigação. O resumo de responsáveis compara dias registrados a todos os dias do período, inclusive domingos.

## Verificação local

Dados fictícios, separados da aplicação e do banco: 8 RDC, 128 HH trabalhados, 16 HH de impacto estimado, razão de 12,5%, 4 horas de impactos e 6 de 7 dias com registro. Conferidos totais e dados preparados para exportação (incluindo OM com zeros iniciais), filtro de disciplina, ausência versus zero em bloqueio, duração 59,6 min = 1h00, estado vazio, navegação do gráfico por setas/Escape e tabelas de categorias.

17 verificações por largura, incluindo 15 categorias com nomes longos e agrupamento em Outros, sem falhas nos cenários executados.

Renderização local em Edge: larguras de 320, 390, 768, 1024 e 1440 px; sem rolagem horizontal da página e sem rótulos SVG fora de seus limites nos cenários examinados. Autenticação, consulta ao banco e download XLSX real não foram exercitados nesta revisão; nenhuma gravação foi feita no Supabase. Impressão do navegador mantém o comportamento existente de resumo; detalhes completos permanecem nas tabelas e na exportação.

## Verificação do ajuste específico do gráfico

Cenário local reconstruído dos valores geométricos do SVG enviado, sem inferir os metadados dos RDC reais. Conferidos escala 0–500 HH para o maior valor de 438,5 HH, dez rótulos numéricos, zeros, ausência de registros, consulta fora da plotagem e colisão de rótulos. Quatro larguras (320, 390, 768 e 945 px), agrupamento mensal e janela de 61 dias: sem erros JavaScript, sem rótulos SVG fora dos limites e sem rolagem horizontal da página nos testes. A rolagem fica contida no gráfico.

### Preferência aplicada: colunas empilhadas e rosca

Por solicitação do usuário, a série temporal empilha HH trabalhado (base azul) e HH de impacto estimado (topo laranja), com escala calculada pela soma. Essa soma não é HH disponível; a referência tracejada continua sendo a média do trabalho. Rótulos de ambos os segmentos ficam ao lado, com guias, incluindo zeros. A maior participação em HH usa rosca de duas parcelas: disciplina líder e demais disciplinas, com percentual central e valores na legenda. Manter o ranking detalhado abaixo. Total zero não gera percentual fictício.

Conferidos empilhamento e alinhamento dos segmentos, totais preservados, proporções 62,5%/37,5%, rótulos sem colisões, uma disciplina (100%) e total zero. Renderização inspecionada em desktop e celular; verificações de layout em 320, 390 e 1440 px.
