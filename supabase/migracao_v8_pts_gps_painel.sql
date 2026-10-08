-- RDC Mobile — migração v8 (contrato, PTS e bloqueio, GPS das fotos, painel dos responsáveis e painel de controle).
-- Requer v4, v5 e v7. Pode rodar mais de uma vez.
--
--   * rdc_cabecalho: contrato (número e nome: TELHADO, ROTINA, GALPÃO);
--   * rdc_cabecalho: PTS (sim/não, horário de solicitação e de abertura) e bloqueio (sim/não, ativo e horário);
--   * rdc_fotos: latitude, longitude, precisão e origem da localização (EXIF da foto ou GPS do aparelho);
--   * rdc_painel_responsaveis: quem emitiu RDC em cada dia, HH trabalhado e de impacto (app, somente leitura);
--   * rdc_admin_exportar: dados completos de um período para o painel de controle (painel.html, só administrador);
--   * views do Power BI com as colunas novas e a view nova vw_rdc_fotos.
--
-- HH de impacto = duração do impacto × maior efetivo entre as atividades do RDC
-- (a equipe que ficou parada). HH trabalhado = soma de efetivo × duração das atividades.

-- ---------------------------------------------------------------------
-- 1. Colunas novas
-- ---------------------------------------------------------------------
alter table public.rdc_cabecalho add column if not exists pts             boolean;
alter table public.rdc_cabecalho add column if not exists pts_solicitacao timestamptz;
alter table public.rdc_cabecalho add column if not exists pts_abertura    timestamptz;
alter table public.rdc_cabecalho add column if not exists bloqueio        boolean;
alter table public.rdc_cabecalho add column if not exists bloqueio_ativo  text;
alter table public.rdc_cabecalho add column if not exists bloqueio_hora   timestamptz;
alter table public.rdc_cabecalho add column if not exists contrato        text;   -- número do contrato (ex.: 5900111362)
alter table public.rdc_cabecalho add column if not exists contrato_nome   text;   -- TELHADO, ROTINA, GALPÃO
create index if not exists ix_cab_contrato on public.rdc_cabecalho (contrato);

alter table public.rdc_fotos add column if not exists latitude   double precision check (latitude  between -90  and 90);
alter table public.rdc_fotos add column if not exists longitude  double precision check (longitude between -180 and 180);
alter table public.rdc_fotos add column if not exists precisao_m int;
alter table public.rdc_fotos add column if not exists gps_fonte  text check (gps_fonte in ('foto', 'aparelho'));

create index if not exists ix_cab_resp_data on public.rdc_cabecalho (responsavel, data_rdc);

-- ---------------------------------------------------------------------
-- 2. Métricas por RDC (uso interno das funções e do Power BI)
-- ---------------------------------------------------------------------
create or replace view public.vw_rdc_metricas with (security_invoker = on) as
select c.codigo,
       coalesce(a.min_atv, 0)     as min_atividades,
       coalesce(a.hh_min, 0)      as hh_min,
       coalesce(a.efetivo_max, 0) as efetivo_max,
       coalesce(i.min_imp, 0)     as min_impacto,
       coalesce(i.min_imp, 0) * coalesce(a.efetivo_max, 0) as hh_impacto_min,
       case when c.pts_abertura is not null and c.pts_solicitacao is not null
            then round(extract(epoch from (c.pts_abertura - c.pts_solicitacao)) / 60)::int end as espera_pts_min
from rdc_cabecalho c
left join (select rdc_codigo, sum(duracao_min) as min_atv, sum(efetivo_total * duracao_min) as hh_min, max(efetivo_total) as efetivo_max
           from rdc_atividades group by rdc_codigo) a on a.rdc_codigo = c.codigo
left join (select rdc_codigo, sum(duracao_min) as min_imp from rdc_impactos group by rdc_codigo) i on i.rdc_codigo = c.codigo;
revoke all on public.vw_rdc_metricas from anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Gravação (registrar_rdc) com PTS, bloqueio e GPS
-- ---------------------------------------------------------------------
create or replace function public.registrar_rdc(payload jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  c        jsonb := payload->'cabecalho';
  v_codigo text  := c->>'Title';
  v_rev_de text  := nullif(trim(c->>'RevisaoDe'), '');
  v_rev    int   := 0;
  v_pts    boolean := (c->>'Pts')::boolean;
  v_bloq   boolean := (c->>'Bloqueio')::boolean;
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
  if v_pts and (nullif(c->>'PtsSolicitacao', '') is null or nullif(c->>'PtsAbertura', '') is null) then
    raise exception 'Informe os horários de solicitação e de abertura da PTS';
  end if;
  if v_bloq and (coalesce(trim(c->>'BloqueioAtivo'), '') = '' or nullif(c->>'BloqueioHora', '') is null) then
    raise exception 'Informe o ativo e o horário do bloqueio';
  end if;

  -- idempotente: se o aparelho reenviar o mesmo RDC, não duplica
  if exists (select 1 from rdc_cabecalho where codigo = v_codigo) then
    return v_codigo;
  end if;

  if v_rev_de is not null then
    select revisao + 1 into v_rev from rdc_cabecalho where codigo = v_rev_de and status = 'Em revisão' for update;
    if not found then
      raise exception 'O RDC % não está liberado para revisão pelo administrador', v_rev_de;
    end if;
  end if;

  insert into rdc_cabecalho (codigo, responsavel, data_rdc, ativo, om, status, enviado_por, qtd_atividades, qtd_impactos, qtd_fotos, area, ativo_descricao, responsavel_funcao,
                             revisao, revisao_de, pts, pts_solicitacao, pts_abertura, bloqueio, bloqueio_ativo, bloqueio_hora, contrato, contrato_nome)
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
    nullif(left(trim(c->>'ResponsavelFuncao'), 80), ''),
    v_rev, v_rev_de,
    v_pts,
    case when v_pts then (c->>'PtsSolicitacao')::timestamptz end,
    case when v_pts then (c->>'PtsAbertura')::timestamptz end,
    v_bloq,
    case when v_bloq then left(trim(c->>'BloqueioAtivo'), 120) end,
    case when v_bloq then (c->>'BloqueioHora')::timestamptz end,
    nullif(left(trim(c->>'Contrato'), 20), ''),
    nullif(left(trim(c->>'ContratoNome'), 60), '')
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

  insert into rdc_fotos (codigo, rdc_codigo, atividade_codigo, nome_arquivo, caminho, data_hora_foto, latitude, longitude, precisao_m, gps_fonte)
  select x->>'Title', v_codigo, x->>'Atividade_ID', x->>'NomeArquivo', x->>'Caminho', (x->>'DataHoraFoto')::timestamptz,
         (x->>'Latitude')::double precision, (x->>'Longitude')::double precision,
         round((x->>'PrecisaoM')::numeric)::int, nullif(x->>'GpsFonte', '')
  from jsonb_array_elements(coalesce(payload->'fotos', '[]'::jsonb)) x;

  if v_rev_de is not null then
    update rdc_cabecalho set status = 'Substituído', substituido_por = v_codigo where codigo = v_rev_de;
  end if;

  return v_codigo;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Consulta (somente leitura) com HH e as colunas novas
-- ---------------------------------------------------------------------
create or replace function public.rdc_listar(p_busca text default null, p_status text default null, p_limite int default 30, p_offset int default 0)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(to_jsonb(r) order by r.recebido_em desc), '[]'::jsonb)
  from (
    select c.codigo, c.data_rdc, c.responsavel, c.responsavel_funcao, c.area, c.ativo, c.ativo_descricao, c.om, c.status, c.revisao,
           c.qtd_atividades, c.qtd_impactos, c.qtd_fotos, c.recebido_em, c.validado_por, c.validado_em,
           c.pts, c.bloqueio, c.contrato, c.contrato_nome, round(m.hh_min / 60.0, 2) as hh, round(m.min_impacto / 60.0, 2) as horas_impacto
    from rdc_cabecalho c
    join vw_rdc_metricas m on m.codigo = c.codigo
    where case when coalesce(p_status, '') = '' then c.status <> 'Substituído' else c.status = p_status end
      and (coalesce(trim(p_busca), '') = ''
           or c.codigo ilike '%' || trim(p_busca) || '%' or c.om ilike '%' || trim(p_busca) || '%'
           or c.ativo ilike '%' || trim(p_busca) || '%' or coalesce(c.ativo_descricao, '') ilike '%' || trim(p_busca) || '%'
           or c.responsavel ilike '%' || trim(p_busca) || '%'
           or coalesce(c.contrato, '') ilike '%' || trim(p_busca) || '%' or coalesce(c.contrato_nome, '') ilike '%' || trim(p_busca) || '%')
    order by c.recebido_em desc
    limit least(greatest(coalesce(p_limite, 30), 1), 200) offset greatest(coalesce(p_offset, 0), 0)
  ) r
$$;

create or replace function public.rdc_detalhe(p_codigo text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'Title', c.codigo, 'Responsavel', c.responsavel, 'ResponsavelFuncao', c.responsavel_funcao, 'DataRDC', c.data_rdc,
    'Area', c.area, 'Ativo', c.ativo, 'AtivoDescricao', c.ativo_descricao, 'OM', c.om, 'Status', c.status,
    'Revisao', c.revisao, 'RevisaoDe', c.revisao_de, 'SubstituidoPor', c.substituido_por, 'RecebidoEm', c.recebido_em,
    'ValidadoPor', c.validado_por, 'ValidadoEm', c.validado_em, 'ObsValidacao', c.obs_validacao,
    'Pts', c.pts, 'PtsSolicitacao', c.pts_solicitacao, 'PtsAbertura', c.pts_abertura,
    'Bloqueio', c.bloqueio, 'BloqueioAtivo', c.bloqueio_ativo, 'BloqueioHora', c.bloqueio_hora,
    'Contrato', c.contrato, 'ContratoNome', c.contrato_nome,
    'atividades', coalesce((
      select jsonb_agg(jsonb_build_object(
        'Title', a.codigo, 'Ordem', a.ordem, 'Disciplina', a.disciplina, 'Servico', a.servico, 'TipoAndaime', a.tipo_andaime,
        'DescricaoOutros', a.descricao_outros, 'Observacao', a.observacao,
        'InicioAtividade', a.inicio, 'FimAtividade', a.fim, 'DuracaoMin', a.duracao_min,
        'QtdAjudante', a.qtd_ajudante, 'QtdPintor', a.qtd_pintor, 'QtdJatista', a.qtd_jatista, 'QtdMecanico', a.qtd_mecanico,
        'QtdMontadorAndaime', a.qtd_montador_andaime, 'QtdAlpinistaN1', a.qtd_alpinista_n1, 'QtdSoldador', a.qtd_soldador,
        'EfetivoTotal', a.efetivo_total,
        'fotos', coalesce((
          select jsonb_agg(jsonb_build_object('Title', f.codigo, 'NomeArquivo', f.nome_arquivo, 'Caminho', f.caminho,
                                              'DataHoraFoto', f.data_hora_foto, 'Latitude', f.latitude, 'Longitude', f.longitude,
                                              'PrecisaoM', f.precisao_m, 'GpsFonte', f.gps_fonte) order by f.codigo)
          from rdc_fotos f where f.atividade_codigo = a.codigo), '[]'::jsonb)
      ) order by a.ordem)
      from rdc_atividades a where a.rdc_codigo = c.codigo), '[]'::jsonb),
    'impactos', coalesce((
      select jsonb_agg(jsonb_build_object('Title', i.codigo, 'Ordem', i.ordem, 'TipoImpacto', i.descricao,
                                          'InicioImpacto', i.inicio, 'FimImpacto', i.fim, 'DuracaoMin', i.duracao_min) order by i.ordem)
      from rdc_impactos i where i.rdc_codigo = c.codigo), '[]'::jsonb)
  )
  from rdc_cabecalho c where c.codigo = p_codigo
$$;

-- ---------------------------------------------------------------------
-- 5. Painel dos responsáveis (app, somente leitura): uma linha por responsável e dia
--    Período máximo: 366 dias. RDC substituídos e cancelados não entram.
-- ---------------------------------------------------------------------
create or replace function public.rdc_painel_responsaveis(p_ini date, p_fim date)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(to_jsonb(r) order by r.responsavel, r.data_rdc), '[]'::jsonb)
  from (
    select c.responsavel, c.data_rdc, count(*) as qtd_rdc,
           round(sum(m.min_atividades) / 60.0, 2) as horas_atividades,
           round(sum(m.hh_min) / 60.0, 2)         as hh,
           round(sum(m.min_impacto) / 60.0, 2)    as horas_impacto,
           round(sum(m.hh_impacto_min) / 60.0, 2) as hh_impacto,
           count(*) filter (where c.status = 'Enviado') as aguardando,
           jsonb_agg(c.codigo order by c.recebido_em) as codigos
    from rdc_cabecalho c
    join vw_rdc_metricas m on m.codigo = c.codigo
    where c.status not in ('Substituído', 'Cancelado')
      and c.data_rdc between p_ini and p_fim
      and p_fim - p_ini between 0 and 366
    group by c.responsavel, c.data_rdc
  ) r
$$;
revoke all on function public.rdc_painel_responsaveis(date, date) from public;
grant execute on function public.rdc_painel_responsaveis(date, date) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 6. Painel de controle (painel.html): dados completos de um período, só administrador
--    Inclui todas as situações (o painel filtra). Período máximo: 400 dias (pela data do RDC).
-- ---------------------------------------------------------------------
create or replace function public.rdc_admin_exportar(p_nome text, p_senha text, p_ini date, p_fim date)
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
    'rdcs', coalesce((
      select jsonb_agg(jsonb_build_object(
        'codigo', c.codigo, 'data_rdc', c.data_rdc, 'responsavel', c.responsavel, 'responsavel_funcao', c.responsavel_funcao,
        'area', c.area, 'ativo', c.ativo, 'ativo_descricao', c.ativo_descricao, 'om', c.om, 'status', c.status,
        'revisao', c.revisao, 'revisao_de', c.revisao_de, 'substituido_por', c.substituido_por,
        'recebido_em', c.recebido_em, 'enviado_por', c.enviado_por,
        'validado_por', c.validado_por, 'validado_em', c.validado_em, 'obs_validacao', c.obs_validacao,
        'qtd_atividades', c.qtd_atividades, 'qtd_impactos', c.qtd_impactos, 'qtd_fotos', c.qtd_fotos,
        'pts', c.pts, 'pts_solicitacao', c.pts_solicitacao, 'pts_abertura', c.pts_abertura, 'espera_pts_min', m.espera_pts_min,
        'bloqueio', c.bloqueio, 'bloqueio_ativo', c.bloqueio_ativo, 'bloqueio_hora', c.bloqueio_hora,
        'contrato', c.contrato, 'contrato_nome', c.contrato_nome,
        'min_atividades', m.min_atividades, 'hh_min', m.hh_min, 'efetivo_max', m.efetivo_max,
        'min_impacto', m.min_impacto, 'hh_impacto_min', m.hh_impacto_min) order by c.data_rdc, c.recebido_em)
      from rdc_cabecalho c join vw_rdc_metricas m on m.codigo = c.codigo
      where c.data_rdc between p_ini and p_fim), '[]'::jsonb),
    'atividades', coalesce((
      select jsonb_agg(jsonb_build_object(
        'codigo', a.codigo, 'rdc', a.rdc_codigo, 'ordem', a.ordem, 'disciplina', a.disciplina, 'servico', a.servico,
        'tipo_andaime', a.tipo_andaime, 'descricao_outros', a.descricao_outros, 'observacao', a.observacao,
        'inicio', a.inicio, 'fim', a.fim, 'duracao_min', a.duracao_min,
        'qtd_ajudante', a.qtd_ajudante, 'qtd_pintor', a.qtd_pintor, 'qtd_jatista', a.qtd_jatista, 'qtd_mecanico', a.qtd_mecanico,
        'qtd_montador_andaime', a.qtd_montador_andaime, 'qtd_alpinista_n1', a.qtd_alpinista_n1, 'qtd_soldador', a.qtd_soldador,
        'efetivo_total', a.efetivo_total) order by a.rdc_codigo, a.ordem)
      from rdc_atividades a join rdc_cabecalho c on c.codigo = a.rdc_codigo
      where c.data_rdc between p_ini and p_fim), '[]'::jsonb),
    'impactos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'codigo', i.codigo, 'rdc', i.rdc_codigo, 'ordem', i.ordem, 'descricao', i.descricao,
        'inicio', i.inicio, 'fim', i.fim, 'duracao_min', i.duracao_min) order by i.rdc_codigo, i.ordem)
      from rdc_impactos i join rdc_cabecalho c on c.codigo = i.rdc_codigo
      where c.data_rdc between p_ini and p_fim), '[]'::jsonb),
    'fotos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'codigo', f.codigo, 'rdc', f.rdc_codigo, 'atividade', f.atividade_codigo, 'caminho', f.caminho,
        'data_hora_foto', f.data_hora_foto, 'latitude', f.latitude, 'longitude', f.longitude,
        'precisao_m', f.precisao_m, 'gps_fonte', f.gps_fonte) order by f.codigo)
      from rdc_fotos f join rdc_cabecalho c on c.codigo = f.rdc_codigo
      where c.data_rdc between p_ini and p_fim), '[]'::jsonb));
end;
$$;
revoke all on function public.rdc_admin_exportar(text, text, date, date) from public;
grant execute on function public.rdc_admin_exportar(text, text, date, date) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 7. Views do Power BI (colunas novas sempre no fim)
-- ---------------------------------------------------------------------
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
       c.responsavel_funcao,
       c.status,
       c.contrato, c.contrato_nome
from rdc_atividades a
join rdc_cabecalho c on c.codigo = a.rdc_codigo
where c.status not in ('Substituído', 'Cancelado');

create or replace view public.vw_rdc_impactos with (security_invoker = on) as
select c.codigo as rdc, c.data_rdc, c.responsavel, c.ativo, c.om,
       i.ordem, i.descricao,
       (i.inicio at time zone 'America/Fortaleza') as inicio_local,
       (i.fim    at time zone 'America/Fortaleza') as fim_local,
       i.duracao_min, round(i.duracao_min / 60.0, 2) as horas,
       c.area, c.ativo_descricao,
       c.responsavel_funcao,
       c.status,
       m.efetivo_max as efetivo_rdc,
       round(i.duracao_min * m.efetivo_max / 60.0, 2) as homem_hora_impacto,
       c.contrato, c.contrato_nome
from rdc_impactos i
join rdc_cabecalho c on c.codigo = i.rdc_codigo
join vw_rdc_metricas m on m.codigo = c.codigo
where c.status not in ('Substituído', 'Cancelado');

create or replace view public.vw_rdc_resumo with (security_invoker = on) as
select c.codigo as rdc, c.data_rdc, c.responsavel, c.ativo, c.om, c.recebido_em,
       c.qtd_atividades, c.qtd_impactos, c.qtd_fotos,
       round(coalesce((select sum(duracao_min) from rdc_atividades a where a.rdc_codigo = c.codigo), 0) / 60.0, 2) as horas_atividades,
       round(coalesce((select sum(duracao_min) from rdc_impactos  i where i.rdc_codigo = c.codigo), 0) / 60.0, 2) as horas_impacto,
       c.area, c.ativo_descricao,
       c.responsavel_funcao,
       round(coalesce((select sum(a.efetivo_total * a.duracao_min) from rdc_atividades a where a.rdc_codigo = c.codigo), 0) / 60.0, 2) as homem_hora,
       c.status, c.revisao, c.validado_por, c.validado_em,
       c.pts,
       (c.pts_solicitacao at time zone 'America/Fortaleza') as pts_solicitacao_local,
       (c.pts_abertura    at time zone 'America/Fortaleza') as pts_abertura_local,
       m.espera_pts_min,
       c.bloqueio, c.bloqueio_ativo,
       (c.bloqueio_hora   at time zone 'America/Fortaleza') as bloqueio_hora_local,
       m.efetivo_max,
       round(m.hh_impacto_min / 60.0, 2) as homem_hora_impacto,
       c.contrato, c.contrato_nome
from rdc_cabecalho c
join vw_rdc_metricas m on m.codigo = c.codigo
where c.status not in ('Substituído', 'Cancelado');

create or replace view public.vw_rdc_fotos with (security_invoker = on) as
select c.codigo as rdc, c.data_rdc, c.responsavel, c.ativo, c.om, c.area,
       f.atividade_codigo as atividade, f.codigo as foto, f.caminho,
       (f.data_hora_foto at time zone 'America/Fortaleza') as data_hora_local,
       f.latitude, f.longitude, f.precisao_m, f.gps_fonte,
       c.status,
       c.contrato, c.contrato_nome
from rdc_fotos f
join rdc_cabecalho c on c.codigo = f.rdc_codigo
where c.status not in ('Substituído', 'Cancelado');

revoke all on public.vw_rdc_atividades, public.vw_rdc_impactos, public.vw_rdc_resumo, public.vw_rdc_fotos from anon, authenticated;
-- Se o usuário powerbi_leitura existir, libere também a view nova:
--   grant select on public.vw_rdc_fotos, public.vw_rdc_metricas to powerbi_leitura;

-- ---------------------------------------------------------------------
-- 8. Cópia para o SharePoint: campos novos (a Edge Function cria as colunas que faltarem)
-- ---------------------------------------------------------------------
create or replace function public.rdc_para_sharepoint(p_codigo text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'cabecalho', jsonb_build_object(
      'Title', c.codigo, 'Responsavel', c.responsavel, 'DataRDC', to_char(c.data_rdc, 'YYYY-MM-DD') || 'T12:00:00Z',
      'Ativo', c.ativo, 'OM', c.om, 'Status', c.status, 'DataHoraEnvio', _rdc_iso(c.recebido_em),
      'EnviadoPor', coalesce(c.enviado_por, ''), 'QtdAtividades', c.qtd_atividades, 'QtdImpactos', c.qtd_impactos,
      'QtdFotos', c.qtd_fotos, 'Area', coalesce(c.area, ''), 'AtivoDescricao', coalesce(c.ativo_descricao, ''),
      'ResponsavelFuncao', coalesce(c.responsavel_funcao, ''), 'Revisao', c.revisao, 'RevisaoDe', coalesce(c.revisao_de, ''),
      'SubstituidoPor', coalesce(c.substituido_por, ''), 'ValidadoPor', coalesce(c.validado_por, ''),
      'ValidadoEm', _rdc_iso(c.validado_em), 'ObsValidacao', coalesce(c.obs_validacao, ''),
      'Pts', c.pts, 'PtsSolicitacao', _rdc_iso(c.pts_solicitacao), 'PtsAbertura', _rdc_iso(c.pts_abertura),
      'Bloqueio', c.bloqueio, 'BloqueioAtivo', c.bloqueio_ativo, 'BloqueioHora', _rdc_iso(c.bloqueio_hora),
      'Contrato', c.contrato, 'ContratoNome', c.contrato_nome),
    'atividades', coalesce((
      select jsonb_agg(jsonb_build_object(
        'Title', a.codigo, 'RDC_ID', c.codigo, 'Ordem', a.ordem, 'Disciplina', a.disciplina, 'Servico', a.servico,
        'TipoAndaime', a.tipo_andaime, 'DescricaoOutros', coalesce(a.descricao_outros, ''), 'Observacao', coalesce(a.observacao, ''),
        'InicioAtividade', _rdc_iso(a.inicio), 'FimAtividade', _rdc_iso(a.fim), 'DuracaoMin', a.duracao_min,
        'Ativo', c.ativo, 'OM', c.om, 'DataRDC', to_char(c.data_rdc, 'YYYY-MM-DD') || 'T12:00:00Z',
        'QtdAjudante', a.qtd_ajudante, 'QtdPintor', a.qtd_pintor, 'QtdJatista', a.qtd_jatista, 'QtdMecanico', a.qtd_mecanico,
        'QtdMontadorAndaime', a.qtd_montador_andaime, 'QtdAlpinistaN1', a.qtd_alpinista_n1, 'QtdSoldador', a.qtd_soldador,
        'EfetivoTotal', a.efetivo_total, 'Contrato', c.contrato) order by a.ordem)
      from rdc_atividades a where a.rdc_codigo = c.codigo), '[]'::jsonb),
    'impactos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'Title', i.codigo, 'RDC_ID', c.codigo, 'Ordem', i.ordem, 'TipoImpacto', i.descricao,
        'InicioImpacto', _rdc_iso(i.inicio), 'FimImpacto', _rdc_iso(i.fim), 'DuracaoMin', i.duracao_min,
        'Ativo', c.ativo, 'OM', c.om, 'DataRDC', to_char(c.data_rdc, 'YYYY-MM-DD') || 'T12:00:00Z', 'Contrato', c.contrato) order by i.ordem)
      from rdc_impactos i where i.rdc_codigo = c.codigo), '[]'::jsonb),
    'fotos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'Title', f.codigo, 'RDC_ID', c.codigo, 'Atividade_ID', f.atividade_codigo, 'NomeArquivo', f.nome_arquivo,
        'DataHoraFoto', _rdc_iso(f.data_hora_foto), 'Caminho', f.caminho,
        'Latitude', f.latitude, 'Longitude', f.longitude, 'PrecisaoM', f.precisao_m, 'GpsFonte', f.gps_fonte) order by f.codigo)
      from rdc_fotos f where f.rdc_codigo = c.codigo), '[]'::jsonb)
  )
  from rdc_cabecalho c where c.codigo = p_codigo
$$;
