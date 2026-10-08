-- RDC Mobile — migração v9 (edição de RDC pelo administrador).
-- Requer a v8. Pode rodar mais de uma vez.
--
--   * rdc_admin_editar: edita dados do RDC no lugar (contrato, responsável, data, área/ativo, OM, PTS, bloqueio),
--     um ou vários de uma vez (ex.: definir o contrato dos RDC antigos). Cada alteração vai para rdc_edicoes.
--   * rdc_admin_registrar: edição completa (atividades, fotos, impactos) — grava uma nova versão que substitui
--     a atual, mantendo a decisão (validado continua validado).
--   * registrar_rdc passa a usar o núcleo _rdc_registrar (mesmo comportamento para o app dos líderes).
--   * rdc_detalhe / rdc_admin_exportar trazem "editado por / em".

alter table public.rdc_cabecalho add column if not exists editado_por text;
alter table public.rdc_cabecalho add column if not exists editado_em  timestamptz;

-- Histórico das edições feitas pelo administrador (inacessível pela chave pública)
create table if not exists public.rdc_edicoes (
  id          bigint generated always as identity primary key,
  codigo      text not null,
  editado_por text not null,
  editado_em  timestamptz not null default now(),
  motivo      text,
  antes       jsonb,          -- campos alterados, valor anterior (edição de dados)
  depois      jsonb           -- valor novo; na edição completa: {"nova_versao": código}
);
create index if not exists ix_edicoes_codigo on public.rdc_edicoes (codigo);
alter table public.rdc_edicoes enable row level security;
revoke all on public.rdc_edicoes from anon, authenticated;

create or replace function public._rdc_registrar(payload jsonb, p_admin text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ant    rdc_cabecalho%rowtype;
  v_status text := 'Enviado';
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

  -- revisão: liberada pelo administrador ("Em revisão") ou edição completa feita por ele (qualquer versão atual)
  if v_rev_de is not null then
    select * into v_ant from rdc_cabecalho
     where codigo = v_rev_de
       and (status = 'Em revisão' or (p_admin is not null and status in ('Enviado', 'Validado', 'Cancelado')))
     for update;
    if not found then
      raise exception 'O RDC % não está liberado para revisão pelo administrador', v_rev_de;
    end if;
    v_rev := v_ant.revisao + 1;
    -- edição do administrador mantém a decisão (validado continua validado; cancelado continua cancelado)
    if p_admin is not null and v_ant.status in ('Validado', 'Cancelado') then v_status := v_ant.status; end if;
  elsif p_admin is not null then
    raise exception 'A edição do administrador precisa indicar o RDC editado';
  end if;

  insert into rdc_cabecalho (codigo, responsavel, data_rdc, ativo, om, status, enviado_por, qtd_atividades, qtd_impactos, qtd_fotos, area, ativo_descricao, responsavel_funcao,
                             revisao, revisao_de, pts, pts_solicitacao, pts_abertura, bloqueio, bloqueio_ativo, bloqueio_hora, contrato, contrato_nome,
                             validado_por, validado_em, obs_validacao, editado_por, editado_em)
  values (
    v_codigo,
    left(trim(c->>'Responsavel'), 120),
    left(c->>'DataRDC', 10)::date,
    left(trim(c->>'Ativo'), 80),
    left(trim(c->>'OM'), 40),
    v_status,
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
    nullif(left(trim(c->>'ContratoNome'), 60), ''),
    case when v_status <> 'Enviado' then v_ant.validado_por end,
    case when v_status <> 'Enviado' then v_ant.validado_em end,
    case when v_status <> 'Enviado' then v_ant.obs_validacao end,
    p_admin, case when p_admin is not null then now() end
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
    if p_admin is not null then
      insert into rdc_edicoes (codigo, editado_por, motivo, antes, depois)
      values (v_rev_de, p_admin, nullif(left(trim(c->>'MotivoEdicao'), 500), ''), null, jsonb_build_object('nova_versao', v_codigo));
    end if;
  end if;

  return v_codigo;
end;
$$;

-- Envio pelo app (líderes): só RDC novo ou revisão liberada pelo administrador
create or replace function public.registrar_rdc(payload jsonb)
returns text
language sql
security definer
set search_path = public
as $$
  select _rdc_registrar(payload, null)
$$;

-- Edição completa pelo administrador (atividades, fotos, impactos): grava uma nova versão no lugar da atual
create or replace function public.rdc_admin_registrar(p_nome text, p_senha text, payload jsonb)
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
  return jsonb_build_object('ok', true, 'codigo', _rdc_registrar(payload, v));
end;
$$;

revoke all on function public._rdc_registrar(jsonb, text) from public, anon, authenticated;
revoke all on function public.rdc_admin_registrar(text, text, jsonb) from public;
grant execute on function public.rdc_admin_registrar(text, text, jsonb) to anon, authenticated;

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
    'Contrato', c.contrato, 'ContratoNome', c.contrato_nome, 'EditadoPor', c.editado_por, 'EditadoEm', c.editado_em,
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
        'contrato', c.contrato, 'contrato_nome', c.contrato_nome, 'editado_por', c.editado_por, 'editado_em', c.editado_em,
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

-- Edição de dados pelo administrador, no próprio RDC (sem nova versão): um ou vários RDC de uma vez.
-- p_campos: só as chaves que mudam, entre: contrato, contrato_nome, responsavel, responsavel_funcao, data_rdc,
--           area, ativo, ativo_descricao, om, pts, pts_solicitacao, pts_abertura, bloqueio, bloqueio_ativo, bloqueio_hora
-- Mudar a data desloca os horários de atividades, impactos, PTS e bloqueio pelo mesmo número de dias.
create or replace function public.rdc_admin_editar(p_nome text, p_senha text, p_codigos text[], p_campos jsonb, p_motivo text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v      text := _rdc_admin_verificar(p_nome, p_senha);
  ok     text[] := array['contrato', 'contrato_nome', 'responsavel', 'responsavel_funcao', 'data_rdc', 'area', 'ativo',
                         'ativo_descricao', 'om', 'pts', 'pts_solicitacao', 'pts_abertura', 'bloqueio', 'bloqueio_ativo', 'bloqueio_hora'];
  k      text;
  cod    text;
  c      rdc_cabecalho%rowtype;
  d      rdc_cabecalho%rowtype;
  dias   int;
  n      int := 0;
  mudou  boolean;
  np     boolean;
  nb     boolean;
begin
  if v is null then return jsonb_build_object('ok', false, 'erro', 'Sessão de administrador inválida. Entre novamente.'); end if;
  if v = 'bloqueado' then return jsonb_build_object('ok', false, 'erro', 'Muitas tentativas. Aguarde 15 minutos.'); end if;
  if p_campos is null or p_campos = '{}'::jsonb then raise exception 'Nada para alterar'; end if;
  for k in select jsonb_object_keys(p_campos) loop
    if not k = any(ok) then raise exception 'O campo % não pode ser editado', k; end if;
  end loop;
  if coalesce(array_length(p_codigos, 1), 0) not between 1 and 500 then raise exception 'Escolha de 1 a 500 RDC'; end if;
  foreach k in array array['responsavel', 'ativo', 'om', 'data_rdc'] loop
    if p_campos ? k and coalesce(trim(p_campos->>k), '') = '' then raise exception 'O campo % não pode ficar vazio', k; end if;
  end loop;
  if coalesce(p_campos->>'contrato', '') <> '' and p_campos->>'contrato' !~ '^[0-9]{4,20}$' then
    raise exception 'Número de contrato inválido';
  end if;

  foreach cod in array p_codigos loop
    select * into c from rdc_cabecalho where codigo = cod for update;
    if not found then raise exception 'RDC % não encontrado', cod; end if;
    if c.status = 'Substituído' then raise exception 'O % é uma versão antiga: edite a versão atual', cod; end if;

    -- data nova: os horários que não vieram na edição acompanham a data
    dias := case when p_campos ? 'data_rdc' then (p_campos->>'data_rdc')::date - c.data_rdc else 0 end;
    np   := case when p_campos ? 'pts'      then (p_campos->>'pts')::boolean      else c.pts end;
    nb   := case when p_campos ? 'bloqueio' then (p_campos->>'bloqueio')::boolean else c.bloqueio end;

    -- um único update por RDC (cada update gera uma cópia para o SharePoint); "Não" limpa os horários
    update rdc_cabecalho set
      contrato           = case when p_campos ? 'contrato'           then nullif(left(trim(p_campos->>'contrato'), 20), '')            else contrato end,
      contrato_nome      = case when p_campos ? 'contrato_nome'      then nullif(left(trim(p_campos->>'contrato_nome'), 60), '')       else contrato_nome end,
      responsavel        = case when p_campos ? 'responsavel'        then left(trim(p_campos->>'responsavel'), 120)                    else responsavel end,
      responsavel_funcao = case when p_campos ? 'responsavel_funcao' then nullif(left(trim(p_campos->>'responsavel_funcao'), 80), '')  else responsavel_funcao end,
      data_rdc           = data_rdc + dias,
      area               = case when p_campos ? 'area'               then nullif(left(trim(p_campos->>'area'), 80), '')                else area end,
      ativo              = case when p_campos ? 'ativo'              then left(trim(p_campos->>'ativo'), 80)                           else ativo end,
      ativo_descricao    = case when p_campos ? 'ativo_descricao'    then nullif(left(trim(p_campos->>'ativo_descricao'), 120), '')    else ativo_descricao end,
      om                 = case when p_campos ? 'om'                 then left(trim(p_campos->>'om'), 40)                              else om end,
      pts                = np,
      pts_solicitacao    = case when np is not true then null
                                when p_campos ? 'pts_solicitacao' then (p_campos->>'pts_solicitacao')::timestamptz
                                else pts_solicitacao + make_interval(days => dias) end,
      pts_abertura       = case when np is not true then null
                                when p_campos ? 'pts_abertura' then (p_campos->>'pts_abertura')::timestamptz
                                else pts_abertura + make_interval(days => dias) end,
      bloqueio           = nb,
      bloqueio_ativo     = case when nb is not true then null
                                when p_campos ? 'bloqueio_ativo' then nullif(left(trim(p_campos->>'bloqueio_ativo'), 120), '')
                                else bloqueio_ativo end,
      bloqueio_hora      = case when nb is not true then null
                                when p_campos ? 'bloqueio_hora' then (p_campos->>'bloqueio_hora')::timestamptz
                                else bloqueio_hora + make_interval(days => dias) end,
      editado_por = v, editado_em = now()
    where codigo = cod;
    if dias <> 0 then
      update rdc_atividades set inicio = inicio + make_interval(days => dias), fim = fim + make_interval(days => dias) where rdc_codigo = cod;
      update rdc_impactos   set inicio = inicio + make_interval(days => dias), fim = fim + make_interval(days => dias) where rdc_codigo = cod;
    end if;

    -- "Sim" exige os horários
    select * into d from rdc_cabecalho where codigo = cod;
    if d.pts and (d.pts_solicitacao is null or d.pts_abertura is null) then raise exception 'Informe os horários da PTS (%)', cod; end if;
    if d.bloqueio and (d.bloqueio_ativo is null or d.bloqueio_hora is null) then raise exception 'Informe o ativo e o horário do bloqueio (%)', cod; end if;

    mudou := false;
    for k in select jsonb_object_keys(p_campos) loop
      if (to_jsonb(c)->k) is distinct from (to_jsonb(d)->k) then mudou := true; end if;
    end loop;
    if mudou then
      insert into rdc_edicoes (codigo, editado_por, motivo, antes, depois)
      select cod, v, nullif(left(trim(coalesce(p_motivo, '')), 500), ''),
             jsonb_object_agg(x, to_jsonb(c)->x), jsonb_object_agg(x, to_jsonb(d)->x)
      from jsonb_object_keys(p_campos) x;
      n := n + 1;
    else
      -- nada mudou de fato: desfaz a marca de edição
      update rdc_cabecalho set editado_por = c.editado_por, editado_em = c.editado_em where codigo = cod;
    end if;
  end loop;
  return jsonb_build_object('ok', true, 'editados', n);
end;
$$;
revoke all on function public.rdc_admin_editar(text, text, text[], jsonb, text) from public;
grant execute on function public.rdc_admin_editar(text, text, text[], jsonb, text) to anon, authenticated;
