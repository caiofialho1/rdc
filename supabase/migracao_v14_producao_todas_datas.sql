-- RDC Mobile — migração v14 (produção em TODAS as datas, sem contar em dobro).
-- Requer v10 a v13. Pode rodar mais de uma vez.
--
-- Cada memória de cálculo é a medição do seu ciclo (21 a 20) e repete o estado acumulado dos itens: a de setembro traz
-- de novo os itens de agosto. Somar as planilhas inteiras contaria em dobro. Para cada item + etapa + DATA vale uma só linha:
--   1) a versão da planilha cujo período CONTÉM a data (é a medição daquele ciclo; confere com a tabela diária da planilha);
--   2) se nenhuma planilha cobre a data (ciclos antigos, ex.: jul/2025), a versão mais recente em que ela aparece.
--   * chave do item = contrato + ativo + disciplina + item + subitem + área + descrição (+ ordem, se repetida no arquivo):
--     o número do item sozinho é reaproveitado para peças diferentes entre ciclos.
--   * produção = previsto x % exec (PAC, m²) ou Exec. Atual kg (REC/TEL), na data de cada etapa.
--   * ciclo = período de medição de 21 a 20 que contém a data (ciclo_ini / ciclo_fim).
-- vw_mc_rdc_dia (v11) e vw_mc_producao_responsavel (v13) passam a usar esta visão e deixam de filtrar por período.

create or replace view public.vw_mc_producao_atual with (security_invoker = on) as
with k as (
  select a.id as arquivo_id, a.contrato, a.contrato_codigo, a.ativo, a.disciplina, a.unidade, a.periodo_ini, a.periodo_fim,
         i.item, i.subitem, i.om, i.area, i.descricao, i.prev, i.exec_pct, i.exec_qtd, i.etapas,
         row_number() over (partition by i.arquivo_id, i.item, i.subitem, i.area, i.descricao order by i.linha) as dup
  from public.mc_itens i
  join public.mc_arquivos a on a.id = i.arquivo_id
),
ent as (
  select k.*, e.key as etapa, e.value::date as data
  from k
  cross join lateral jsonb_each_text(k.etapas) e
  where e.value is not null
),
pick as (
  select ent.*,
         row_number() over (
           partition by ent.contrato_codigo, ent.ativo, ent.disciplina, ent.item, ent.subitem, ent.area, ent.descricao, ent.dup,
                        ent.etapa, ent.data
           order by (ent.data between ent.periodo_ini and ent.periodo_fim) desc, ent.periodo_ini desc nulls last, ent.arquivo_id desc
         ) as rk
  from ent
),
dias as (
  select p.contrato, p.contrato_codigo, p.ativo, p.disciplina, p.unidade, p.periodo_ini, p.periodo_fim,
         p.item, p.subitem, p.om, p.area, p.descricao, p.etapa, p.data,
         coalesce(p.exec_qtd, coalesce(p.prev, 0) * coalesce(p.exec_pct, 0)) as producao
  from pick p
  where p.rk = 1
)
select d.contrato, d.contrato_codigo, d.ativo, d.disciplina, d.unidade, d.periodo_ini, d.periodo_fim,
       d.item, d.subitem, d.om, d.area, d.descricao, d.etapa, d.data, d.producao,
       pr.preco, d.producao * pr.preco as valor,
       c.ciclo_fim, (c.ciclo_fim - interval '1 month')::date + 1 as ciclo_ini, to_char(c.ciclo_fim, 'YYYY-MM') as ciclo
from dias d
cross join lateral (
  select case when extract(day from d.data) >= 21
              then (date_trunc('month', d.data) + interval '1 month' + interval '19 days')::date
              else (date_trunc('month', d.data) + interval '19 days')::date end as ciclo_fim
) c
left join public.mc_precos pr
  on pr.contrato_codigo = d.contrato_codigo and pr.disciplina = d.disciplina and pr.etapa = d.etapa;

revoke all on public.vw_mc_producao_atual from anon, authenticated;

-- vw_mc_rdc_dia
create or replace view public.vw_mc_rdc_dia with (security_invoker = on) as
with prod as (
  select public.mc_tag_chave(p.ativo)            as tag_chave,
         coalesce(public.mc_om_chave(p.om), '-') as om,
         p.data, p.disciplina,
         min(p.unidade)                          as unidade,
         array_agg(distinct p.ativo)             as ativos_mc,
         sum(p.producao) filter (where p.etapa = 'LAV')    as lav,
         sum(p.producao) filter (where p.etapa = 'SLV')    as slv,
         sum(p.producao) filter (where p.etapa = 'ST2')    as st2,
         sum(p.producao) filter (where p.etapa = 'ST3')    as st3,
         sum(p.producao) filter (where p.etapa = 'JAT_1')  as jat_1,
         sum(p.producao) filter (where p.etapa = 'JAT_2')  as jat_2,
         sum(p.producao) filter (where p.etapa = 'PRM C5') as prm_c5,
         sum(p.producao) filter (where p.etapa = 'A05')    as a05,
         sum(p.producao) filter (where p.etapa = 'F22')    as f22,
         sum(p.producao) filter (where p.etapa = 'A06')    as a06,
         sum(p.producao) filter (where p.etapa = 'FAB')    as fab,
         sum(p.producao) filter (where p.etapa = 'DESM')   as desm,
         sum(p.producao) filter (where p.etapa = 'MONT')   as mont
  from public.vw_mc_producao_atual p
  group by 1, 2, 3, 4
),
chaves as (select distinct public.mc_tag_chave(ativo) as tag_chave from public.mc_arquivos),
rdc as (
  select coalesce(
           (select k.tag_chave from chaves k
             where regexp_replace(upper(a.ativo), '[^A-Z0-9]', '', 'g') like k.tag_chave || '%'
             order by length(k.tag_chave) desc limit 1),
           regexp_replace(upper(a.ativo), '[^A-Z0-9]', '', 'g'))          as tag_chave,
         coalesce(public.mc_om_chave(a.om), '-')                          as om,
         a.data_rdc                                                       as data,
         case a.disciplina when 'TEL/COB' then 'TEL' else a.disciplina end as disciplina,
         array_agg(distinct a.ativo)                                      as tags_rdc,
         array_agg(distinct a.rdc)                                        as rdcs,
         count(distinct a.rdc)                                            as qtd_rdc,
         round(sum(a.horas), 2)                                           as horas,
         round(sum(a.homem_hora), 2)                                      as homem_hora
  from public.vw_rdc_atividades a
  where a.disciplina in ('PAC', 'REC', 'TEL/COB')
  group by 1, 2, 3, 4
)
select coalesce(p.tag_chave, r.tag_chave)  as tag_chave,
       coalesce(p.data, r.data)            as data,
       nullif(coalesce(p.om, r.om), '-')   as om,
       coalesce(p.disciplina, r.disciplina) as disciplina,
       case when p.tag_chave is not null and r.tag_chave is not null then 'Produção com RDC'
            when p.tag_chave is not null then 'Produção sem RDC'
            else 'RDC sem produção' end    as situacao,
       p.unidade, p.ativos_mc, r.tags_rdc, r.rdcs, r.qtd_rdc, r.horas, r.homem_hora,
       p.lav, p.slv, p.st2, p.st3, p.jat_1, p.jat_2, p.prm_c5, p.a05, p.f22, p.a06,
       p.fab, p.desm, p.mont
from prod p
full join rdc r
  on r.tag_chave = p.tag_chave and r.data = p.data and r.om = p.om and r.disciplina = p.disciplina;

-- vw_mc_producao_responsavel
create or replace view public.vw_mc_producao_responsavel with (security_invoker = on) as
with prod as (
  select public.mc_tag_chave(p.ativo)            as tag_chave,
         coalesce(public.mc_om_chave(p.om), '-') as om,
         p.data, p.disciplina,
         min(p.unidade)                          as unidade,
         sum(p.producao) filter (where p.etapa = 'LAV')    as lav,
         sum(p.producao) filter (where p.etapa = 'SLV')    as slv,
         sum(p.producao) filter (where p.etapa = 'ST2')    as st2,
         sum(p.producao) filter (where p.etapa = 'ST3')    as st3,
         sum(p.producao) filter (where p.etapa = 'JAT_1')  as jat_1,
         sum(p.producao) filter (where p.etapa = 'JAT_2')  as jat_2,
         sum(p.producao) filter (where p.etapa = 'PRM C5') as prm_c5,
         sum(p.producao) filter (where p.etapa = 'A05')    as a05,
         sum(p.producao) filter (where p.etapa = 'F22')    as f22,
         sum(p.producao) filter (where p.etapa = 'A06')    as a06,
         sum(p.producao) filter (where p.etapa = 'FAB')    as fab,
         sum(p.producao) filter (where p.etapa = 'DESM')   as desm,
         sum(p.producao) filter (where p.etapa = 'MONT')   as mont,
         sum(p.valor)                                      as valor,
         string_agg(distinct p.etapa, ', ') filter (where p.preco is null and p.producao <> 0) as etapas_sem_preco
  from public.vw_mc_producao_atual p
  group by 1, 2, 3, 4
),
tags as (
  select public.mc_tag_chave(ativo) as tag_chave,
         min(regexp_replace(ativo, '\s*(\(|- ).*$', '')) as tag
  from public.mc_arquivos
  group by 1
),
rdc0 as (
  select coalesce(
           (select k.tag_chave from tags k
             where regexp_replace(upper(a.ativo), '[^A-Z0-9]', '', 'g') like k.tag_chave || '%'
             order by length(k.tag_chave) desc limit 1),
           regexp_replace(upper(a.ativo), '[^A-Z0-9]', '', 'g'))                  as tag_chave,
         coalesce(public.mc_om_chave(a.om), '-')                                  as om,
         a.data_rdc                                                               as data,
         case a.disciplina when 'TEL/COB' then 'TEL' else a.disciplina end       as disciplina,
         coalesce(nullif(trim(a.responsavel), ''), 'Sem responsável')            as responsavel,
         sum(a.horas)                                                             as horas,
         sum(a.homem_hora)                                                        as hh
  from public.vw_rdc_atividades a
  where a.disciplina in ('PAC', 'REC', 'TEL/COB')
  group by 1, 2, 3, 4, 5
),
rdc as (
  select r.*,
         case when coalesce(sum(r.hh)    over g, 0) > 0 then coalesce(r.hh, 0)
              when coalesce(sum(r.horas) over g, 0) > 0 then coalesce(r.horas, 0)
              else 1 end as peso
  from rdc0 r
  window g as (partition by r.tag_chave, r.om, r.data, r.disciplina)
),
rdcf as (
  select r.*, r.peso / nullif(sum(r.peso) over (partition by r.tag_chave, r.om, r.data, r.disciplina), 0) as parte
  from rdc r
)
select coalesce(r.responsavel, 'Sem RDC')                    as responsavel,
       coalesce(t.tag, p.tag_chave, r.tag_chave)             as tag,
       coalesce(p.data, r.data)                              as data,
       nullif(coalesce(p.om, r.om), '-')                     as om,
       coalesce(p.disciplina, r.disciplina)                  as disciplina,
       case when p.tag_chave is null then 'RDC sem produção'
            when r.tag_chave is null then 'Produção sem RDC'
            else 'Produção com RDC' end                      as situacao,
       p.unidade,
       p.lav    * coalesce(r.parte, 1) as lav,
       p.slv    * coalesce(r.parte, 1) as slv,
       p.st2    * coalesce(r.parte, 1) as st2,
       p.st3    * coalesce(r.parte, 1) as st3,
       p.jat_1  * coalesce(r.parte, 1) as jat_1,
       p.jat_2  * coalesce(r.parte, 1) as jat_2,
       p.prm_c5 * coalesce(r.parte, 1) as prm_c5,
       p.a05    * coalesce(r.parte, 1) as a05,
       p.f22    * coalesce(r.parte, 1) as f22,
       p.a06    * coalesce(r.parte, 1) as a06,
       p.fab    * coalesce(r.parte, 1) as fab,
       p.desm   * coalesce(r.parte, 1) as desm,
       p.mont   * coalesce(r.parte, 1) as mont,
       p.valor  * coalesce(r.parte, 1) as valor,
       p.etapas_sem_preco,
       r.parte                                               as participacao,
       round(r.horas, 2)                                     as horas,
       round(r.hh, 2)                                        as homem_hora
from prod p
full join rdcf r
  on r.tag_chave = p.tag_chave and r.om = p.om and r.data = p.data and r.disciplina = p.disciplina
left join tags t on t.tag_chave = coalesce(p.tag_chave, r.tag_chave);

revoke all on public.vw_mc_rdc_dia, public.vw_mc_rdc_om_divergente, public.vw_mc_producao_responsavel from anon, authenticated;
-- Power BI: grant select on public.vw_mc_producao_atual to powerbi_leitura;

-- Funções do painel: produção aceita períodos longos (todas as datas); o limite de 400 dias passa a 20000.

create or replace function public.rdc_admin_producao(p_nome text, p_senha text, p_ini date, p_fim date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v text := _rdc_admin_verificar(p_nome, p_senha);
begin
  if v is null then return jsonb_build_object('ok', false, 'erro', 'Sessão de administrador inválida. Entre novamente.'); end if;
  if v = 'bloqueado' then return jsonb_build_object('ok', false, 'erro', 'Muitas tentativas. Aguarde 15 minutos.'); end if;
  if p_ini is null or p_fim is null or p_fim < p_ini then raise exception 'Período inválido'; end if;
  if p_fim - p_ini > 20000 then raise exception 'Período máximo: 20000 dias'; end if;

  return jsonb_build_object('ok', true, 'nome', v,
    'linhas', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.data, x.tag_chave, x.disciplina)
      from vw_mc_rdc_dia x
      where x.data between p_ini and p_fim), '[]'::jsonb));
end;
$$;
revoke all on function public.rdc_admin_producao(text, text, date, date) from public;
grant execute on function public.rdc_admin_producao(text, text, date, date) to anon, authenticated;

create or replace function public.rdc_admin_producao_resp(p_nome text, p_senha text, p_ini date, p_fim date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v text := _rdc_admin_verificar(p_nome, p_senha);
begin
  if v is null then return jsonb_build_object('ok', false, 'erro', 'Sessão de administrador inválida. Entre novamente.'); end if;
  if v = 'bloqueado' then return jsonb_build_object('ok', false, 'erro', 'Muitas tentativas. Aguarde 15 minutos.'); end if;
  if p_ini is null or p_fim is null or p_fim < p_ini then raise exception 'Período inválido'; end if;
  if p_fim - p_ini > 20000 then raise exception 'Período máximo: 20000 dias'; end if;

  return jsonb_build_object('ok', true, 'nome', v,
    'linhas', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.data, x.tag, x.disciplina, x.responsavel)
      from vw_mc_producao_responsavel x
      where x.data between p_ini and p_fim), '[]'::jsonb),
    'precos', coalesce((
      select jsonb_agg(to_jsonb(p) order by p.contrato_codigo, p.disciplina, p.item_qqp) from mc_precos p), '[]'::jsonb));
end;
$$;
revoke all on function public.rdc_admin_producao_resp(text, text, date, date) from public;
grant execute on function public.rdc_admin_producao_resp(text, text, date, date) to anon, authenticated;
