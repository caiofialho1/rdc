-- RDC Mobile — migração v11 (produção da Memória de Cálculo x RDC).
-- Requer a v10 (mc_*) e as views vw_rdc_* do schema. Pode rodar mais de uma vez.
--
-- Conectores: DATA + TAG + OM (+ disciplina).
--   * DATA: data da etapa na memória (vw_mc_producao.data) = data_rdc do RDC.
--   * TAG:  mc_tag_chave() reduz os dois lados ao TAG-base sem símbolos:
--           memória 'PO_840K_PE (PISO 2)' -> PO840KPE ; 'TR832K_04' -> TR832K04 ; 'TR_811K02ZM' -> TR811K02
--           RDC     'PO_840K_PE_PY5_AP1'  -> casa com PO840KPE (o RDC pode ter sufixo de piso/apoio).
--   * OM:   só os dígitos (mc_om_chave).
--   * Disciplina: PAC=PAC, REC=REC, TEL/COB=TEL (ANDAIME não tem produção na memória).
-- Só entra produção dentro do período de medição (no_periodo). RDC cancelado/substituído já fica fora das views vw_rdc_*.

create or replace function public.mc_tag_chave(t text)
returns text language sql immutable as $$
  select regexp_replace(
           regexp_replace(upper(split_part(split_part(coalesce(t, ''), ' ', 1), '(', 1)), '[^A-Z0-9]', '', 'g'),
           'ZM$', '')
$$;

create or replace function public.mc_om_chave(o text)
returns text language sql immutable as $$
  select nullif(regexp_replace(regexp_replace(coalesce(o, ''), '\.0+$', ''), '\D', '', 'g'), '')
$$;

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
  from public.vw_mc_producao p
  where p.no_periodo
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

-- Pontas soltas em que o TAG, a data e a disciplina existem dos dois lados mas a OM é diferente (provável erro de digitação).
create or replace view public.vw_mc_rdc_om_divergente with (security_invoker = on) as
select a.*
from public.vw_mc_rdc_dia a
where a.situacao <> 'Produção com RDC'
  and exists (select 1 from public.vw_mc_rdc_dia b
              where b.tag_chave = a.tag_chave and b.data = a.data and b.disciplina = a.disciplina
                and b.situacao <> a.situacao and b.om is distinct from a.om);

revoke all on public.vw_mc_rdc_dia, public.vw_mc_rdc_om_divergente from anon, authenticated;

-- Power BI: além das grants da v10, o perfil precisa ler as tabelas do RDC (as views são security_invoker):
--   grant select on public.vw_mc_rdc_dia, public.vw_mc_rdc_om_divergente to powerbi_leitura;
--   grant select on public.rdc_cabecalho, public.rdc_atividades, public.rdc_impactos, public.rdc_fotos to powerbi_leitura;
--   (e uma política de leitura nessas tabelas, como as mc_leitura da v10)
