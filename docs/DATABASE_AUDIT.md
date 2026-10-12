# Auditoria do banco (Painel de Controle)

## Limitação de acesso — leia antes do resto

Este ambiente **não tem acesso a SQL direto, service-role, CLI ou MCP do Supabase**. Nenhuma consulta exploratória ao vivo (`information_schema`, amostragem de linhas, contagem de nulos etc.) foi executada. Todo o conteúdo abaixo vem da leitura de `supabase/schema.sql`, dos 15 arquivos `supabase/migracao_v*.sql`, e dos pontos de chamada em `painel.html`/`painel-carga.js` (código-fonte e definição de schema, não consulta ao banco em produção).

Além disso, por desenho do próprio backend, **RLS está ligada em todas as tabelas e revoga todo acesso de `anon`/`authenticated`** (`revoke all on ... from anon, authenticated`). A única superfície de leitura e escrita acessível ao painel é um conjunto fixo de funções `security definer`, chamadas por `fetch` cru para `{SB_URL}/rest/v1/rpc/{fn}` com a chave anônima no header `apikey`. Não existe JWT/sessão: a identidade do administrador é verificada a cada chamada pelos próprios argumentos `p_nome`/`p_senha` (função `_rdc_admin_verificar`, com bloqueio de 15 min após 5 tentativas erradas).

## RPCs usadas pelo Painel de Controle

| RPC | Arquivo de origem | Parâmetros | Retorno | Usada por (tela antiga) |
|---|---|---|---|---|
| `rdc_admin_login` | `migracao_v5_cancelar_apagar.sql` (substitui versão do `schema.sql`) | `p_nome, p_senha` | `{ok, nome, erro}` | Login |
| `rdc_admin_exportar` | `schema.sql` §2e | `p_nome, p_senha, p_ini, p_fim` (máx. 400 dias) | `{ok, nome, rdcs[], atividades[], impactos[], fotos[]}` | Balanço, gráficos, calendário, responsáveis, impactos, registros RDC |
| `rdc_admin_producao` | `migracao_v14_producao_todas_datas.sql` (substitui v12) | `p_nome, p_senha, p_ini, p_fim` (máx. 20000 dias) | `{ok, nome, linhas[]}` de `vw_mc_rdc_dia` | Produção × RDC |
| `rdc_admin_producao_resp` | `migracao_v14_producao_todas_datas.sql` (substitui v13) | `p_nome, p_senha, p_ini, p_fim` | `{ok, nome, linhas[], precos[]}` de `vw_mc_producao_responsavel` + `mc_precos` | Produção por responsável |
| `rdc_admin_mc_status` | `migracao_v15_carga_producao.sql` | `p_nome, p_senha` | `{ok, arquivos:[{chave, sha1}]}` | Passo 1 do "Atualizar carga produção" (diff) |
| `rdc_admin_mc_importar` | `migracao_v15_carga_producao.sql` | `p_nome, p_senha, p_arquivo` | escrita — upsert de uma planilha/aba OU `{acao:'remover', chave}` | Passo 2 do "Atualizar carga produção" |
| `rdc_admin_editar` | `migracao_v9_admin_editar.sql` | `p_nome, p_senha, p_codigos[], p_campos{}, p_motivo` | `{ok, editados}` | Edição em lote (detalhe do RDC e ação em massa) |
| `rdc_validar` | `migracao_v5_cancelar_apagar.sql` (substitui v4) | `p_nome, p_senha, p_codigo, p_decisao, p_obs` | `{ok, status, por}` | Validar/liberar revisão/cancelar RDC |

**Fora de escopo** (chamadas só por `index.html`, o app de campo — não tocar): `registrar_rdc`, `rdc_ping`, `rdc_listar`, `rdc_detalhe`, `rdc_painel_responsaveis`, `rdc_config_obter`, `rdc_config_definir`, `rdc_apagar`.

## Tabelas e views por trás das RPCs (para entender a origem dos campos)

- `rdc_cabecalho` / `rdc_atividades` / `rdc_impactos` / `rdc_fotos` — RDC, suas atividades (com efetivo por função), impactos (paradas) e fotos (com GPS). `vw_rdc_metricas` pré-calcula HH trabalhado, HH de impacto e espera de PTS por RDC.
- `mc_arquivos` / `mc_itens` / `mc_diario` — memórias de cálculo importadas (planilhas MC_PAC/MC_REC/MC_TEL): uma linha por item, com previsto, % executado ou quantidade executada, e a data de cada etapa.
- `vw_mc_producao_atual` — produção por item×etapa×data, já resolvendo qual versão da planilha vale para cada ciclo de medição (21→20) e cruzando com `mc_precos` para o valor financeiro.
- `vw_mc_rdc_dia` / `vw_mc_producao_responsavel` — cruzam a produção com os RDC por TAG/OM/disciplina/data, classificando a situação de reconciliação e, no segundo caso, rateando entre responsáveis.
- `mc_precos` — preço unitário por contrato + disciplina + etapa, editável só pelo painel do Supabase (não pelo app).

## Campos confirmados em `rdc_admin_exportar` (schema.sql §2e)

- `rdcs[]`: codigo, data_rdc, responsavel, responsavel_funcao, area, ativo, ativo_descricao, om, status, revisao, revisao_de, substituido_por, recebido_em, enviado_por, validado_por, validado_em, obs_validacao, qtd_atividades, qtd_impactos, qtd_fotos, pts, pts_solicitacao, pts_abertura, espera_pts_min, bloqueio, bloqueio_ativo, bloqueio_hora, contrato, contrato_nome, editado_por, editado_em, min_atividades, hh_min, efetivo_max, min_impacto, hh_impacto_min.
- `atividades[]`: codigo, rdc, ordem, disciplina (PAC/REC/TEL-COB/ANDAIME), servico, tipo_andaime, descricao_outros, observacao, inicio, fim, duracao_min, qtd_ajudante/pintor/jatista/mecanico/montador_andaime/alpinista_n1/soldador, efetivo_total.
- `impactos[]`: codigo, rdc, ordem, descricao, inicio, fim, duracao_min.
- `fotos[]`: codigo, rdc, atividade, caminho, data_hora_foto, latitude, longitude, precisao_m, gps_fonte.

Nenhum campo de meta/baseline/orçamento existe em nenhuma dessas tabelas — não há meta a exibir até que uma fonte real apareça no schema.
