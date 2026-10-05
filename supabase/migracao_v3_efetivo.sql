-- RDC Mobile — migração v3 (função do líder + efetivo por função). Inclui a v2. Pode rodar mais de uma vez.
-- v2: área e descrição do ativo (catálogo de TAGs)
alter table public.rdc_cabecalho add column if not exists area text;
alter table public.rdc_cabecalho add column if not exists ativo_descricao text;

-- v3: função do líder + efetivo por função em cada atividade
alter table public.rdc_cabecalho  add column if not exists responsavel_funcao text;
alter table public.rdc_atividades add column if not exists qtd_ajudante         int not null default 0 check (qtd_ajudante between 0 and 99);
alter table public.rdc_atividades add column if not exists qtd_pintor           int not null default 0 check (qtd_pintor between 0 and 99);
alter table public.rdc_atividades add column if not exists qtd_jatista          int not null default 0 check (qtd_jatista between 0 and 99);
alter table public.rdc_atividades add column if not exists qtd_mecanico         int not null default 0 check (qtd_mecanico between 0 and 99);
alter table public.rdc_atividades add column if not exists qtd_montador_andaime int not null default 0 check (qtd_montador_andaime between 0 and 99);
alter table public.rdc_atividades add column if not exists qtd_alpinista_n1     int not null default 0 check (qtd_alpinista_n1 between 0 and 99);
alter table public.rdc_atividades add column if not exists qtd_soldador         int not null default 0 check (qtd_soldador between 0 and 99);
alter table public.rdc_atividades add column if not exists efetivo_total        int not null default 0 check (efetivo_total >= 0);
create index if not exists ix_cab_area   on public.rdc_cabecalho (area);

create or replace function public.registrar_rdc(payload jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  c        jsonb := payload->'cabecalho';
  v_codigo text  := c->>'Title';
  n_atv    int   := jsonb_array_length(coalesce(payload->'atividades', '[]'::jsonb));
  n_imp    int   := jsonb_array_length(coalesce(payload->'impactos',   '[]'::jsonb));
  n_fot    int   := jsonb_array_length(coalesce(payload->'fotos',      '[]'::jsonb));
begin
  if v_codigo is null or v_codigo !~ '^RDC-[0-9]{8}-[0-9]{6}-[A-Z0-9]{4}$' then
    raise exception 'Código de RDC inválido';
  end if;
  if n_atv < 1 or n_atv > 50 or n_imp > 50 or n_fot > 300 then
    raise exception 'Quantidade de itens fora do limite';
  end if;
  if coalesce(trim(c->>'Responsavel'),'') = '' or coalesce(trim(c->>'Ativo'),'') = '' or coalesce(trim(c->>'OM'),'') = '' then
    raise exception 'Responsável, Ativo e OM são obrigatórios';
  end if;

  -- idempotente: se o aparelho reenviar o mesmo RDC, não duplica
  if exists (select 1 from rdc_cabecalho where codigo = v_codigo) then
    return v_codigo;
  end if;

  insert into rdc_cabecalho (codigo, responsavel, data_rdc, ativo, om, status, enviado_por, qtd_atividades, qtd_impactos, qtd_fotos, area, ativo_descricao, responsavel_funcao)
  values (
    v_codigo,
    left(trim(c->>'Responsavel'), 120),
    left(c->>'DataRDC', 10)::date,
    left(trim(c->>'Ativo'), 80),
    left(trim(c->>'OM'), 40),
    'Enviado',
    left(c->>'EnviadoPor', 120),
    n_atv, n_imp, n_fot,
    nullif(left(trim(c->>'Area'), 80), ''),
    nullif(left(trim(c->>'AtivoDescricao'), 120), ''),
    nullif(left(trim(c->>'ResponsavelFuncao'), 80), '')
  );

  insert into rdc_atividades (codigo, rdc_codigo, ordem, disciplina, servico, tipo_andaime, descricao_outros, observacao, inicio, fim, duracao_min,
                              qtd_ajudante, qtd_pintor, qtd_jatista, qtd_mecanico, qtd_montador_andaime, qtd_alpinista_n1, qtd_soldador, efetivo_total)
  select x->>'Title', v_codigo, (x->>'Ordem')::int, x->>'Disciplina', left(x->>'Servico', 120),
         nullif(x->>'TipoAndaime', ''), nullif(left(x->>'DescricaoOutros', 2000), ''), nullif(left(x->>'Observacao', 4000), ''),
         (x->>'InicioAtividade')::timestamptz, (x->>'FimAtividade')::timestamptz, (x->>'DuracaoMin')::int,
         coalesce((x->>'QtdAjudante')::int, 0), coalesce((x->>'QtdPintor')::int, 0), coalesce((x->>'QtdJatista')::int, 0),
         coalesce((x->>'QtdMecanico')::int, 0), coalesce((x->>'QtdMontadorAndaime')::int, 0), coalesce((x->>'QtdAlpinistaN1')::int, 0),
         coalesce((x->>'QtdSoldador')::int, 0),
         coalesce((x->>'QtdAjudante')::int, 0) + coalesce((x->>'QtdPintor')::int, 0) + coalesce((x->>'QtdJatista')::int, 0)
           + coalesce((x->>'QtdMecanico')::int, 0) + coalesce((x->>'QtdMontadorAndaime')::int, 0) + coalesce((x->>'QtdAlpinistaN1')::int, 0)
           + coalesce((x->>'QtdSoldador')::int, 0)
  from jsonb_array_elements(payload->'atividades') x;

  insert into rdc_impactos (codigo, rdc_codigo, ordem, descricao, inicio, fim, duracao_min)
  select x->>'Title', v_codigo, (x->>'Ordem')::int, left(x->>'TipoImpacto', 4000),
         (x->>'InicioImpacto')::timestamptz, (x->>'FimImpacto')::timestamptz, (x->>'DuracaoMin')::int
  from jsonb_array_elements(coalesce(payload->'impactos', '[]'::jsonb)) x;

  insert into rdc_fotos (codigo, rdc_codigo, atividade_codigo, nome_arquivo, caminho, data_hora_foto)
  select x->>'Title', v_codigo, x->>'Atividade_ID', x->>'NomeArquivo', x->>'Caminho', (x->>'DataHoraFoto')::timestamptz
  from jsonb_array_elements(coalesce(payload->'fotos', '[]'::jsonb)) x;

  return v_codigo;
end;
$$;

revoke all on function public.registrar_rdc(jsonb) from public;
grant execute on function public.registrar_rdc(jsonb) to anon, authenticated;

create or replace view public.vw_rdc_atividades with (security_invoker = on) as
select c.codigo as rdc, c.data_rdc, c.responsavel, c.ativo, c.om,
       a.ordem, a.disciplina, a.servico, a.tipo_andaime, a.descricao_outros, a.observacao,
       (a.inicio at time zone 'America/Fortaleza') as inicio_local,
       (a.fim    at time zone 'America/Fortaleza') as fim_local,
       a.duracao_min, round(a.duracao_min / 60.0, 2) as horas,
       (select count(*) from rdc_fotos f where f.atividade_codigo = a.codigo) as qtd_fotos,
       c.area, c.ativo_descricao,
       a.qtd_ajudante, a.qtd_pintor, a.qtd_jatista, a.qtd_mecanico, a.qtd_montador_andaime, a.qtd_alpinista_n1, a.qtd_soldador,
       a.efetivo_total,
       round(a.efetivo_total * a.duracao_min / 60.0, 2) as homem_hora,
       c.responsavel_funcao
from rdc_atividades a
join rdc_cabecalho c on c.codigo = a.rdc_codigo;

create or replace view public.vw_rdc_impactos with (security_invoker = on) as
select c.codigo as rdc, c.data_rdc, c.responsavel, c.ativo, c.om,
       i.ordem, i.descricao,
       (i.inicio at time zone 'America/Fortaleza') as inicio_local,
       (i.fim    at time zone 'America/Fortaleza') as fim_local,
       i.duracao_min, round(i.duracao_min / 60.0, 2) as horas,
       c.area, c.ativo_descricao,
       c.responsavel_funcao
from rdc_impactos i
join rdc_cabecalho c on c.codigo = i.rdc_codigo;

create or replace view public.vw_rdc_resumo with (security_invoker = on) as
select c.codigo as rdc, c.data_rdc, c.responsavel, c.ativo, c.om, c.recebido_em,
       c.qtd_atividades, c.qtd_impactos, c.qtd_fotos,
       round(coalesce((select sum(duracao_min) from rdc_atividades a where a.rdc_codigo = c.codigo), 0) / 60.0, 2) as horas_atividades,
       round(coalesce((select sum(duracao_min) from rdc_impactos  i where i.rdc_codigo = c.codigo), 0) / 60.0, 2) as horas_impacto,
       c.area, c.ativo_descricao,
       c.responsavel_funcao,
       round(coalesce((select sum(a.efetivo_total * a.duracao_min) from rdc_atividades a where a.rdc_codigo = c.codigo), 0) / 60.0, 2) as homem_hora
from rdc_cabecalho c;

revoke all on public.vw_rdc_atividades, public.vw_rdc_impactos, public.vw_rdc_resumo from anon, authenticated;
