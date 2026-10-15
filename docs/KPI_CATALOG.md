# Catálogo de KPIs (Painel de Controle)

Todas as fórmulas usam campos reais de `docs/DATABASE_AUDIT.md`. Nenhuma meta é exibida — ver `docs/BUSINESS_MODEL.md` (nenhuma existe no banco).

| KPI | Fórmula | Unidade | Granularidade | Nulo/ausência | Classificação | Tela |
|---|---|---|---|---|---|---|
| HH trabalhado | Σ `atividades[].efetivo_total × duracao_min` / 60 no recorte filtrado | HH | período × filtros globais | atividade sem efetivo conta 0 HH (dado real, não ausência) | Operacional | Painel executivo |
| HH de impacto estimado | Σ `impactos[].duracao_min × efetivo_max do RDC` / 60; com disciplina selecionada, rateado pela participação da disciplina no HH do RDC | HH | período × filtros globais | RDC sem impacto não entra na soma (não é zero visível) | Operacional | Painel executivo |
| Tempo de impacto | Σ `impactos[].duracao_min` / 60 | h | período | intervalos simultâneos somam, não deduplicam (mesma regra do painel antigo, confirmada no schema) | Operacional | Painel executivo |
| Espera PTS (média) | média de `espera_pts_min`/60 só nos RDC com `pts_abertura` e `pts_solicitacao` preenchidos | h | período | "sem PTS", "PTS sem horário" e "espera calculada" são estados distintos exibidos separadamente | Operacional | Painel executivo |
| RDC por status | contagem de `rdcs[]` agrupada por `status` | registros | período | nenhum — contagem direta | Tático | Painel executivo |
| Pendências (resumo executivo) | contagem de RDC com `status='Enviado'`, `contrato` nulo, ou `pts=true` sem `espera_pts_min` | registros | período | — | Tático | Painel executivo |
| Bloqueios | contagem de `rdcs[]` com `bloqueio=true` | registros | período | ausência de declaração (`bloqueio` nulo) mostrada como "—", não como "não" | Operacional | Painel executivo |
| Produção física por etapa | Σ `linhas[].{lav,slv,st2,st3,jat_1,jat_2,prm_c5,a05,f22,a06,fab,desm,mont}` de `rdc_admin_producao`/`rdc_admin_producao_resp` | m² ou kg (nunca somados entre si) | por etapa, não agregável entre etapas de unidades diferentes | etapa sem produção no período não aparece (não é zero) | Operacional | Comparação |
| Situação de reconciliação | distribuição de `linhas[].situacao` ('Produção com RDC'/'Produção sem RDC'/'RDC sem produção') | contagem/% | TAG×OM×disciplina×data | — | Estratégico (é o propósito do painel) | Comparação |
| Valor da produção | Σ `linhas[].valor` (produção × preço de `mc_precos`) | R$ | por responsável/ativo/disciplina | etapas com `etapas_sem_preco` preenchido são excluídas do total **e listadas separadamente** como lacuna | Estratégico | Comparação |
| Participação por responsável | `linhas[].participacao` (fração do rateio) | % | por responsável × TAG × data × disciplina | sempre exibida junto da produção rateada, nunca escondida | Operacional | Comparação |
| HH por disciplina | Σ HH trabalhado agrupado por `atividades[].disciplina` | HH | período | — | Tático | Desvios |
| HH de impacto ÷ HH trabalhado | `HH de impacto estimado / HH trabalhado` do recorte (contexto do KPI e coluna do ranking) | % | período × filtros globais | HH trabalhado 0 → "—" | Operacional (só proporção, sem meta) | Painel executivo, Desvios |
| Evolução diária | HH trabalhado e HH de impacto agrupados por `rdcs[].data_rdc` | HH | dia com RDC | dia sem RDC não aparece (não é zero) | Operacional | Painel executivo |
| HH de ANDAIME por tipo | HH trabalhado das atividades `disciplina='ANDAIME'` agrupado por `tipo_andaime` | HH | período | `tipo_andaime` nulo → "Sem tipo informado" | Operacional | Painel executivo |
| Pareto dos impactos | Σ `impactos[].duracao_min`/60 por `descricao` (tipo da lista do app; todo "OUTROS — texto" vira OUTROS; RDC antigo com texto livre agrupa sem diferenciar maiúsculas e espaços), ordem decrescente, % acumulado; acima de 8 causas o resto vira "Demais causas"; referência visual em 80% | h e % | período × filtros globais | sem impacto → gráfico vazio | Tático | Painel executivo |
| Espera PTS (máxima) | maior `espera_pts_min` nos RDC com `pts=true` e espera informada; conta quantos passaram de 40 min | min | período × filtros globais | sem espera informada → "—" (não é zero) | Operacional — **meta ≤ 40 min** (2026-10-14): acima = desfavorável (vermelho + "▲ Acima da meta"), até 40 = favorável (verde + "✓") | Painel executivo |
| Espera PTS por área | média e máxima de `espera_pts_min` por `rdcs[].area`, só RDC com `pts=true` e espera informada; média acima de 40 min em vermelho, traço dourado marca a meta | min | área | área nula → "Sem área informada"; sem PTS/sem horário ficam fora | Operacional | Painel executivo |
| Responsáveis de campo | por `responsavel`: nº de RDC, área mais frequente, média de `efetivo_max`, HH trabalhado, HH de impacto | registros, pessoas, HH | período × filtros globais | área nula não conta para a área principal | Operacional (sem classificação) | Desvios |
| Mão de obra por função (RDC) | por função (`qtd_ajudante`, `qtd_pintor`, `qtd_jatista`, `qtd_mecanico`, `qtd_montador_andaime`, `qtd_alpinista_n1`, `qtd_soldador`): **pico** = maior quantidade numa mesma atividade (atividades não se somam, a equipe se repete); **HH** = Σ qtd × `duracao_min`/60 | pessoas, HH | RDC selecionado | `efetivo_total` maior que a soma das funções (registro anterior à v3) aparece como "Sem função informada", não é rateado | Operacional | Detalhamento |
| Maiores desvios (produção sem RDC / RDC sem produção) | top-N por contagem ou por horas/produção associada, dentro de cada situação de reconciliação | registros | período | — | Tático | Desvios |

## Regras de formatação (todas as telas)

- Milhar `1.250`, decimal `1.250,50`, percentual `87,5%`, moeda `R$ 125.450,00` — padrão pt-BR via `Intl.NumberFormat('pt-BR', ...)`.
- Nunca somar m² e kg no mesmo total.
- Nunca colorir "bom/ruim" sem uma regra de negócio confirmada (status de RDC não é desempenho; ver `BUSINESS_MODEL.md`).
