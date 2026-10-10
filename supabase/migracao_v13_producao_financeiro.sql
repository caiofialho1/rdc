-- RDC Mobile — migração v13 (produção física e financeira por responsável, ativo e disciplina).
-- Requer a v10, a v11 e a v12. Pode rodar mais de uma vez (não sobrescreve preços que você já editou).
--
--   * mc_precos: preço unitário por contrato + disciplina + etapa. Editável no painel do Supabase.
--       Valores iniciais da ROTINA (5900108690): coluna "Contrato + Aditivo - Preço Unit." da aba QQP_ROT.
--       Na QQP_ROT as colunas de quantidade e valor total (G a L, O) ficaram com os preços antigos; só a coluna N
--       tem os preços atualizados (os itens 370 a 420, "Aplicação" e "Fornecimento (faturamento direto)", só existem nela).
--       Por isso N x quantidade não bate com o valor total da linha. Os preços abaixo são os da coluna N.
--       Atenção: se a tinta é fornecida direto pela Vale, o valor cobrado pode ser só o item "Aplicação" (330, 350, 370, 390, 410).
--       Corrigir: update public.mc_precos set preco = 13.03 where contrato_codigo = '5900108690' and etapa = 'ST3';
--   * vw_mc_producao_valor: produção x preço (valor = producao * preco; sem preço fica nulo).
--   * vw_mc_producao_responsavel: produção física e financeira por data, TAG, OM, disciplina e responsável.
--       Responsável = quem fez o RDC da disciplina. Se houver mais de um, a produção é dividida pelo HH de cada um
--       (sem HH, pelas horas; sem horas, em partes iguais). Sem RDC no dia/TAG/OM/disciplina: responsável 'Sem RDC'.
--   * rdc_admin_producao_resp: leitura para o painel (só administrador).

create table if not exists public.mc_precos (
  contrato_codigo text not null,
  disciplina      text not null check (disciplina in ('PAC','REC','TEL')),
  etapa           text not null,
  item_qqp        int,
  descricao       text,
  unidade         text not null check (unidade in ('m2','kg')),
  preco           numeric not null check (preco >= 0),
  fonte           text,
  primary key (contrato_codigo, disciplina, etapa)
);
alter table public.mc_precos enable row level security;
revoke all on public.mc_precos from anon, authenticated;

insert into public.mc_precos (contrato_codigo, disciplina, etapa, item_qqp, descricao, unidade, preco, fonte) values
  ('5900108690','PAC','SLV',   10, 'Limpeza com solvente Petrobras N5a',                       'm2', 14.07,  'QQP_ROT col. N'),
  ('5900108690','PAC','ST3',   40, 'Limpeza com ferramentas mecânicas grau St3',               'm2', 43.33,  'QQP_ROT col. N'),
  ('5900108690','PAC','JAT_2', 50, 'Jateamento abrasivo seco Sa 2 1/2',                        'm2', 72.48,  'QQP_ROT col. N'),
  ('5900108690','PAC','JAT_1', 60, 'Jateamento abrasivo seco ligeiro Sa1',                     'm2', 65.88,  'QQP_ROT col. N'),
  ('5900108690','PAC','LAV',   70, 'Lavagem com água doce em alta pressão',                    'm2', 6.72,   'QQP_ROT col. N'),
  ('5900108690','PAC','PRM C5',80, 'Tinta epóxi bicomponente C5H',                             'm2', 90.21,  'QQP_ROT col. N'),
  ('5900108690','PAC','A05',   90, 'Tinta padrão Vale A05 (poliuretano acrílico)',             'm2', 34.67,  'QQP_ROT col. N'),
  ('5900108690','PAC','F22',  110, 'Primer F22 elastômero Securit 2',                          'm2', 346.65, 'QQP_ROT col. N'),
  ('5900108690','PAC','A06',  120, 'Elastômero acabamento padrão Vale A06',                    'm2', 222.85, 'QQP_ROT col. N'),
  ('5900108690','REC','DESM', 200, 'Desmontagem de estrutura metálica ASTM A-36',              'kg', 19.30,  'QQP_ROT col. N'),
  ('5900108690','REC','FAB',  210, 'Fabricação e fornecimento de estrutura metálica ASTM A-36','kg', 55.87,  'QQP_ROT col. N'),
  ('5900108690','REC','MONT', 220, 'Montagem de estrutura metálica ASTM A-36',                 'kg', 25.88,  'QQP_ROT col. N')
on conflict do nothing;

create or replace view public.vw_mc_producao_valor with (security_invoker = on) as
select p.*, pr.preco, p.producao * pr.preco as valor
from public.vw_mc_producao p
left join public.mc_precos pr
  on pr.contrato_codigo = p.contrato_codigo and pr.disciplina = p.disciplina and pr.etapa = p.etapa;

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
  from public.vw_mc_producao_valor p
  where p.no_periodo
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

revoke all on public.vw_mc_producao_valor, public.vw_mc_producao_responsavel from anon, authenticated;

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
  if p_fim - p_ini > 400 then raise exception 'Período máximo: 400 dias'; end if;

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
