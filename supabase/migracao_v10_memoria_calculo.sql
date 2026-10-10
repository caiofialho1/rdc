-- RDC Mobile — migração v10 (produção das Memórias de Cálculo).
-- Pode rodar mais de uma vez. Não depende das demais tabelas.
--
--   * mc_arquivos: uma linha por planilha+aba (MC_PAC / MC_REC / MC_TEL), com contrato, ativo e período de medição.
--   * mc_itens:    linhas da memória (perfil, dimensões, previsto, executado, datas por etapa).
--   * mc_diario:   produção diária por etapa (LAV, SLV, JAT, PRM, A05, F22, A06 / FAB, DESM, MONT).
--   Recarregar a mesma planilha substitui a carga anterior (chave = arquivo|aba); períodos diferentes coexistem.
--   Segurança: RLS ligada e nenhum acesso para anon/authenticated. Leitura só pelo painel do Supabase,
--   por função de administrador ou por um perfil de leitura do Power BI (veja o fim do arquivo).

create table if not exists public.mc_arquivos (
  id              bigint generated always as identity primary key,
  chave           text not null unique,          -- 'nome do arquivo|aba'
  arquivo         text not null,
  aba             text not null,
  sha1            text,
  disciplina      text not null check (disciplina in ('PAC','REC','TEL')),
  unidade         text not null check (unidade in ('m2','kg')),
  contrato        text,
  contrato_codigo text,
  ativo           text,
  periodo_ini     date,
  periodo_fim     date,
  data_elaboracao date,
  delineador      text,
  importado_em    timestamptz not null default now()
);

create table if not exists public.mc_itens (
  id          bigint generated always as identity primary key,
  arquivo_id  bigint not null references public.mc_arquivos(id) on delete cascade,
  linha       int not null,                      -- linha na planilha, para conferência
  item        text,
  subitem     text,
  ref_projeto text,
  om          text,
  centro_custo text,
  area        text,
  area2       text,
  descricao   text not null,
  larg        numeric,
  comp        numeric,
  qtd         numeric,
  lados       numeric,
  criterio    numeric,
  peso_unit   numeric,                           -- kg/m² ou kg/ml (REC/TEL)
  prev        numeric,                           -- previsto total (m² ou kg)
  exec_pct    numeric,                           -- PAC: % executado conforme a planilha (pode ser negativo: correção do fiscal)
  exec_qtd    numeric,                           -- produção do item = previsto × % exec (PAC, m²) ou kg (REC/TEL); é lançada na data de cada etapa
  obs         text,
  etapas      jsonb not null default '{}'::jsonb, -- {"LAV":"2026-09-15","A05":null,...} data de execução por etapa
  marca       text                               -- coluna 'sim/não' sem título na planilha (significado a confirmar)
);
create index if not exists ix_mc_itens_arquivo on public.mc_itens (arquivo_id);

create table if not exists public.mc_diario (
  id         bigint generated always as identity primary key,
  arquivo_id bigint not null references public.mc_arquivos(id) on delete cascade,
  data       date not null,
  etapa      text not null,
  valor      numeric not null                    -- m² (PAC) ou kg (REC/TEL) produzidos no dia
);
create index if not exists ix_mc_diario_arquivo on public.mc_diario (arquivo_id, data);

alter table public.mc_arquivos enable row level security;
alter table public.mc_itens    enable row level security;
alter table public.mc_diario   enable row level security;
revoke all on public.mc_arquivos, public.mc_itens, public.mc_diario from anon, authenticated;

-- Visões para Power BI / consulta
create or replace view public.vw_mc_producao_diaria as
select a.contrato, a.contrato_codigo, a.ativo, a.disciplina, a.unidade, a.periodo_ini, a.periodo_fim,
       d.data, d.etapa, d.valor
from public.mc_diario d join public.mc_arquivos a on a.id = d.arquivo_id;

create or replace view public.vw_mc_itens as
select a.contrato, a.contrato_codigo, a.ativo, a.disciplina, a.unidade, a.periodo_ini, a.periodo_fim,
       i.item, i.subitem, i.om, i.centro_custo, i.area, i.descricao, i.larg, i.comp, i.qtd, i.lados,
       i.prev, i.exec_pct, i.exec_qtd, i.obs, i.etapas
from public.mc_itens i join public.mc_arquivos a on a.id = i.arquivo_id;

-- Produção por item, etapa e data: previsto × % exec, na data da etapa.
-- no_periodo = a data cai dentro do período de medição da planilha (é o que conta no mês);
-- datas anteriores são ciclos já medidos. Conferido contra a tabela diária da planilha nos 14 arquivos PAC.
create or replace view public.vw_mc_producao as
select a.contrato, a.contrato_codigo, a.ativo, a.disciplina, a.unidade, a.periodo_ini, a.periodo_fim,
       i.item, i.om, i.area, i.descricao,
       e.key as etapa, e.value::date as data,
       coalesce(i.exec_qtd, coalesce(i.prev, 0) * coalesce(i.exec_pct, 0)) as producao,
       (e.value::date between a.periodo_ini and a.periodo_fim) as no_periodo
from public.mc_itens i
join public.mc_arquivos a on a.id = i.arquivo_id
cross join lateral jsonb_each_text(i.etapas) e
where e.value is not null;

alter view public.vw_mc_producao set (security_invoker = true);
revoke all on public.vw_mc_producao from anon, authenticated;

alter view public.vw_mc_producao_diaria set (security_invoker = true);
alter view public.vw_mc_itens           set (security_invoker = true);
revoke all on public.vw_mc_producao_diaria, public.vw_mc_itens from anon, authenticated;

-- Perfil de leitura do Power BI (rode uma vez, trocando a senha):
--   create role powerbi_leitura login password 'troque-esta-senha';
--   grant usage on schema public to powerbi_leitura;
--   grant select on public.mc_arquivos, public.mc_itens, public.mc_diario,
--                   public.vw_mc_itens, public.vw_mc_producao_diaria, public.vw_mc_producao to powerbi_leitura;
-- (como as visões são security_invoker, o perfil precisa de select nas tabelas e de política: veja abaixo)
--   create policy mc_leitura on public.mc_arquivos for select to powerbi_leitura using (true);
--   create policy mc_leitura on public.mc_itens    for select to powerbi_leitura using (true);
--   create policy mc_leitura on public.mc_diario   for select to powerbi_leitura using (true);
