-- =====================================================================
-- RDC Mobile — estrutura no Supabase
-- Como usar: Supabase > SQL Editor > New query > colar tudo > Run.
-- Pode ser executado de novo sem perder dados.
--
-- Segurança:
--   * O app (chave pública) NÃO lê, altera nem apaga tabelas.
--   * Ele só pode: chamar registrar_rdc(), enviar e ver fotos do bucket,
--     consultar RDC emitidos (rdc_listar / rdc_detalhe, somente leitura)
--     e, com nome + senha de administrador, validar/liberar revisão/cancelar (rdc_validar)
--     ou apagar RDC (rdc_apagar; cópia dos dados fica em rdc_exclusoes).
--   * Administradores: cadastre no SQL Editor (seção 2b) — nunca pelo app.
--   * Consulta completa: painel do Supabase, Power BI (usuário de leitura)
--     ou exportação CSV.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tabelas
-- ---------------------------------------------------------------------
create table if not exists public.rdc_cabecalho (
  id              bigint generated always as identity primary key,
  codigo          text not null unique,               -- RDC-AAAAMMDD-HHMMSS-XXXX
  responsavel     text not null,
  data_rdc        date not null,
  ativo           text not null,
  om              text not null,
  status          text not null default 'Enviado' check (status in ('Rascunho','Enviado','Validado','Em revisão','Substituído','Cancelado')),
  enviado_por     text,
  qtd_atividades  int,
  qtd_impactos    int,
  qtd_fotos       int,
  recebido_em     timestamptz not null default now()
);

create table if not exists public.rdc_atividades (
  id                bigint generated always as identity primary key,
  codigo            text not null unique,              -- RDC-...-A01
  rdc_codigo        text not null references public.rdc_cabecalho(codigo) on delete cascade,
  ordem             int  not null,
  disciplina        text not null check (disciplina in ('PAC','REC','TEL/COB','ANDAIME')),
  servico           text not null,
  tipo_andaime      text check (tipo_andaime in ('APOIADO','SUSPENSO','BALANÇO')),
  descricao_outros  text,
  observacao        text,
  inicio            timestamptz not null,
  fim               timestamptz not null,
  duracao_min       int not null
);

create table if not exists public.rdc_impactos (
  id           bigint generated always as identity primary key,
  codigo       text not null unique,                   -- RDC-...-I01
  rdc_codigo   text not null references public.rdc_cabecalho(codigo) on delete cascade,
  ordem        int  not null,
  descricao    text not null,
  inicio       timestamptz not null,
  fim          timestamptz not null,
  duracao_min  int not null
);

create table if not exists public.rdc_fotos (
  id               bigint generated always as identity primary key,
  codigo           text not null unique,               -- RDC-...-A01-F01
  rdc_codigo       text not null references public.rdc_cabecalho(codigo) on delete cascade,
  atividade_codigo text not null references public.rdc_atividades(codigo) on delete cascade,
  nome_arquivo     text not null,
  caminho          text not null,                      -- caminho no bucket rdc-evidencias
  data_hora_foto   timestamptz
);

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

-- v4: validação pelo administrador + revisão
--   Enviado     -> aguardando validação
--   Validado    -> aprovado pelo administrador (sem revisão)
--   Em revisão  -> administrador liberou a revisão; o app permite reenviar uma versão corrigida
--   Substituído -> versão antiga, trocada pela revisão (fica no histórico, sai das views)
--   Cancelado   -> cancelado pelo administrador (fica no histórico, sai das views)
alter table public.rdc_cabecalho add column if not exists revisao         int not null default 0;
alter table public.rdc_cabecalho add column if not exists revisao_de      text;
alter table public.rdc_cabecalho add column if not exists substituido_por text;
alter table public.rdc_cabecalho add column if not exists validado_por    text;
alter table public.rdc_cabecalho add column if not exists validado_em     timestamptz;
alter table public.rdc_cabecalho add column if not exists obs_validacao   text;
alter table public.rdc_cabecalho drop constraint if exists rdc_cabecalho_status_check;
alter table public.rdc_cabecalho add constraint rdc_cabecalho_status_check
  check (status in ('Rascunho','Enviado','Validado','Em revisão','Substituído','Cancelado'));
create index if not exists ix_cab_status on public.rdc_cabecalho (status);
create index if not exists ix_cab_receb  on public.rdc_cabecalho (recebido_em desc);

create index if not exists ix_cab_data   on public.rdc_cabecalho (data_rdc);
create index if not exists ix_cab_area   on public.rdc_cabecalho (area);
create index if not exists ix_cab_om     on public.rdc_cabecalho (om);
create index if not exists ix_atv_rdc    on public.rdc_atividades (rdc_codigo);
create index if not exists ix_imp_rdc    on public.rdc_impactos (rdc_codigo);
create index if not exists ix_fot_rdc    on public.rdc_fotos (rdc_codigo);

-- RLS ligado e sem políticas para anon => acesso direto bloqueado
alter table public.rdc_cabecalho  enable row level security;
alter table public.rdc_atividades enable row level security;
alter table public.rdc_impactos   enable row level security;
alter table public.rdc_fotos      enable row level security;
revoke all on public.rdc_cabecalho, public.rdc_atividades, public.rdc_impactos, public.rdc_fotos from anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Função de gravação (uma transação; reenvio do mesmo RDC é ignorado)
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

  if v_rev_de is not null then
    select revisao + 1 into v_rev from rdc_cabecalho where codigo = v_rev_de and status = 'Em revisão' for update;
    if not found then
      raise exception 'O RDC % não está liberado para revisão pelo administrador', v_rev_de;
    end if;
  end if;

  insert into rdc_cabecalho (codigo, responsavel, data_rdc, ativo, om, status, enviado_por, qtd_atividades, qtd_impactos, qtd_fotos, area, ativo_descricao, responsavel_funcao,
                             revisao, revisao_de)
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
    v_rev, v_rev_de
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

  if v_rev_de is not null then
    update rdc_cabecalho set status = 'Substituído', substituido_por = v_codigo where codigo = v_rev_de;
  end if;

  return v_codigo;
end;
$$;


create or replace function public.rdc_ping()
returns text language sql stable as $$ select 'ok'::text $$;

revoke all on function public.registrar_rdc(jsonb) from public;
grant execute on function public.registrar_rdc(jsonb) to anon, authenticated;
grant execute on function public.rdc_ping() to anon, authenticated;

-- ---------------------------------------------------------------------
-- 2b. Administradores, consulta (somente leitura) e validação
--     Cadastre o(s) administrador(es) aqui no SQL Editor, depois de rodar o script:
--       select public.rdc_admin_definir('Nome do Admin', 'senha-forte-com-8+-caracteres');
-- ---------------------------------------------------------------------
-- Administradores (senha só em hash; tabela inacessível pela chave pública)
create extension if not exists pgcrypto with schema extensions;
create table if not exists public.rdc_admins (
  nome          text primary key,
  senha_hash    text not null,
  ativo         boolean not null default true,
  falhas        int not null default 0,
  bloqueado_ate timestamptz,
  criado_em     timestamptz not null default now()
);
alter table public.rdc_admins enable row level security;
revoke all on public.rdc_admins from anon, authenticated;

create or replace function public.rdc_admin_definir(p_nome text, p_senha text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if coalesce(trim(p_nome), '') = '' then raise exception 'Informe o nome do administrador'; end if;
  if length(coalesce(p_senha, '')) < 8 then raise exception 'A senha precisa ter pelo menos 8 caracteres'; end if;
  insert into rdc_admins (nome, senha_hash) values (trim(p_nome), crypt(p_senha, gen_salt('bf', 10)))
  on conflict (nome) do update set senha_hash = excluded.senha_hash, ativo = true, falhas = 0, bloqueado_ate = null;
  return trim(p_nome);
end;
$$;

-- Confere nome/senha. Retorna o nome cadastrado, 'bloqueado' ou null.
-- 5 senhas erradas seguidas bloqueiam o administrador por 15 minutos.
-- Não levanta exceção em senha errada: assim o contador de falhas não é desfeito.
create or replace function public._rdc_admin_verificar(p_nome text, p_senha text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  a rdc_admins%rowtype;
begin
  select * into a from rdc_admins where lower(nome) = lower(trim(coalesce(p_nome, ''))) and ativo for update;
  if not found then return null; end if;
  if a.bloqueado_ate > now() then return 'bloqueado'; end if;
  if a.senha_hash = crypt(coalesce(p_senha, ''), a.senha_hash) then
    update rdc_admins set falhas = 0, bloqueado_ate = null where nome = a.nome;
    return a.nome;
  end if;
  update rdc_admins
     set falhas        = case when a.falhas + 1 >= 5 then 0 else a.falhas + 1 end,
         bloqueado_ate = case when a.falhas + 1 >= 5 then now() + interval '15 minutes' end
   where nome = a.nome;
  return null;
end;
$$;

create or replace function public.rdc_admin_login(p_nome text, p_senha text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v text := _rdc_admin_verificar(p_nome, p_senha);
begin
  if v is null then return jsonb_build_object('ok', false, 'erro', 'Nome ou senha inválidos.'); end if;
  if v = 'bloqueado' then return jsonb_build_object('ok', false, 'erro', 'Muitas tentativas. Aguarde 15 minutos.'); end if;
  return jsonb_build_object('ok', true, 'nome', v);
end;
$$;

-- Validação: p_decisao = 'Validado' (sem revisão), 'Em revisão' (libera revisão) ou 'Cancelado'.
-- Revisão e cancelamento exigem motivo. Um RDC cancelado pode ser reativado (validar ou liberar revisão).
create or replace function public.rdc_validar(p_nome text, p_senha text, p_codigo text, p_decisao text, p_obs text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v text := _rdc_admin_verificar(p_nome, p_senha);
  s text;
begin
  if v is null then return jsonb_build_object('ok', false, 'erro', 'Sessão de administrador inválida. Entre novamente.'); end if;
  if v = 'bloqueado' then return jsonb_build_object('ok', false, 'erro', 'Muitas tentativas. Aguarde 15 minutos.'); end if;
  if p_decisao not in ('Validado', 'Em revisão', 'Cancelado') then raise exception 'Decisão inválida'; end if;
  if p_decisao in ('Em revisão', 'Cancelado') and coalesce(trim(p_obs), '') = '' then
    raise exception 'Informe o motivo da %', case when p_decisao = 'Cancelado' then 'cancelamento' else 'revisão' end;
  end if;

  select status into s from rdc_cabecalho where codigo = p_codigo for update;
  if not found then raise exception 'RDC não encontrado'; end if;
  if s not in ('Enviado', 'Validado', 'Em revisão', 'Cancelado') then raise exception 'RDC % não pode mais ser alterado', s; end if;

  update rdc_cabecalho
     set status = p_decisao, validado_por = v, validado_em = now(),
         obs_validacao = nullif(left(trim(coalesce(p_obs, '')), 2000), '')
   where codigo = p_codigo;
  return jsonb_build_object('ok', true, 'status', p_decisao, 'por', v);
end;
$$;

-- Consulta (somente leitura) — liberada para todos que usam o app
create or replace function public.rdc_listar(p_busca text default null, p_status text default null, p_limite int default 30, p_offset int default 0)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(to_jsonb(r) order by r.recebido_em desc), '[]'::jsonb)
  from (
    select codigo, data_rdc, responsavel, responsavel_funcao, area, ativo, ativo_descricao, om, status, revisao,
           qtd_atividades, qtd_impactos, qtd_fotos, recebido_em, validado_por, validado_em
    from rdc_cabecalho
    where case when coalesce(p_status, '') = '' then status <> 'Substituído' else status = p_status end
      and (coalesce(trim(p_busca), '') = ''
           or codigo ilike '%' || trim(p_busca) || '%' or om ilike '%' || trim(p_busca) || '%'
           or ativo ilike '%' || trim(p_busca) || '%' or coalesce(ativo_descricao, '') ilike '%' || trim(p_busca) || '%'
           or responsavel ilike '%' || trim(p_busca) || '%')
    order by recebido_em desc
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
                                              'DataHoraFoto', f.data_hora_foto) order by f.codigo)
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

revoke all on function public.rdc_admin_definir(text, text)     from public, anon, authenticated;
revoke all on function public._rdc_admin_verificar(text, text)  from public, anon, authenticated;
revoke all on function public.rdc_admin_login(text, text)       from public;
revoke all on function public.rdc_validar(text, text, text, text, text) from public;
revoke all on function public.rdc_listar(text, text, int, int)  from public;
revoke all on function public.rdc_detalhe(text)                 from public;
grant execute on function public.rdc_admin_login(text, text)       to anon, authenticated;
grant execute on function public.rdc_validar(text, text, text, text, text) to anon, authenticated;
grant execute on function public.rdc_listar(text, text, int, int)  to anon, authenticated;
grant execute on function public.rdc_detalhe(text)                 to anon, authenticated;


-- ---------------------------------------------------------------------
-- 3. Fotos (Storage) — bucket privado; app pode ENVIAR e VER (não altera nem apaga)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('rdc-evidencias', 'rdc-evidencias', false, 5242880, array['image/jpeg'])
on conflict (id) do nothing;

drop policy if exists "rdc app envia fotos" on storage.objects;
create policy "rdc app envia fotos" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'rdc-evidencias');

drop policy if exists "rdc app le fotos" on storage.objects;
create policy "rdc app le fotos" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'rdc-evidencias');

-- ---------------------------------------------------------------------
-- 3b. Exclusão definitiva pelo administrador (rdc_apagar)
--     O app só consegue apagar fotos de RDC que o administrador apagou.
-- ---------------------------------------------------------------------
-- Auditoria das exclusões (inacessível pela chave pública)
create table if not exists public.rdc_exclusoes (
  id          bigint generated always as identity primary key,
  codigo      text not null,
  apagado_por text not null,
  apagado_em  timestamptz not null default now(),
  dados       jsonb
);
alter table public.rdc_exclusoes enable row level security;
revoke all on public.rdc_exclusoes from anon, authenticated;

-- Fotos de RDC apagados, liberadas para exclusão no Storage
create table if not exists public.rdc_fotos_exclusao (
  caminho     text primary key,
  liberado_em timestamptz not null default now()
);
alter table public.rdc_fotos_exclusao enable row level security;
revoke all on public.rdc_fotos_exclusao from anon, authenticated;

create or replace function public.rdc_foto_liberada_exclusao(p_caminho text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from rdc_fotos_exclusao where caminho = p_caminho)
$$;
revoke all on function public.rdc_foto_liberada_exclusao(text) from public;
grant execute on function public.rdc_foto_liberada_exclusao(text) to anon, authenticated;

-- O app só consegue apagar fotos que o administrador liberou (RDC apagado)
drop policy if exists "rdc app apaga fotos liberadas" on storage.objects;
create policy "rdc app apaga fotos liberadas" on storage.objects
  for delete to anon, authenticated
  using (bucket_id = 'rdc-evidencias' and public.rdc_foto_liberada_exclusao(name));

-- Exclusão definitiva: a versão atual e todas as anteriores (cadeia de revisões)
create or replace function public.rdc_apagar(p_nome text, p_senha text, p_codigo text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v        text := _rdc_admin_verificar(p_nome, p_senha);
  s        text;
  codigos  text[];
begin
  if v is null then return jsonb_build_object('ok', false, 'erro', 'Sessão de administrador inválida. Entre novamente.'); end if;
  if v = 'bloqueado' then return jsonb_build_object('ok', false, 'erro', 'Muitas tentativas. Aguarde 15 minutos.'); end if;

  select status into s from rdc_cabecalho where codigo = p_codigo for update;
  if not found then raise exception 'RDC não encontrado'; end if;
  if s = 'Substituído' then
    raise exception 'Esta é uma versão antiga. Apague a versão atual do RDC: ela leva junto as anteriores.';
  end if;

  with recursive cadeia(codigo, revisao_de) as (
    select codigo, revisao_de from rdc_cabecalho where codigo = p_codigo
    union all
    select c.codigo, c.revisao_de from rdc_cabecalho c join cadeia k on c.codigo = k.revisao_de
  )
  select array_agg(codigo) into codigos from cadeia;

  insert into rdc_exclusoes (codigo, apagado_por, dados)
  select x, v, rdc_detalhe(x) from unnest(codigos) x;

  insert into rdc_fotos_exclusao (caminho)
  select caminho from rdc_fotos where rdc_codigo = any(codigos)
  on conflict (caminho) do nothing;

  delete from rdc_cabecalho where codigo = any(codigos); -- atividades, impactos e fotos vão junto (cascade)

  -- limpa da fila o que já saiu do Storage; o resto volta para o app tentar apagar (inclui sobras anteriores)
  delete from rdc_fotos_exclusao f
   where not exists (select 1 from storage.objects o where o.bucket_id = 'rdc-evidencias' and o.name = f.caminho);

  return jsonb_build_object('ok', true, 'apagados', to_jsonb(codigos),
                            'fotos', coalesce((select jsonb_agg(caminho) from rdc_fotos_exclusao), '[]'::jsonb));
end;
$$;

revoke all on function public.rdc_apagar(text, text, text) from public;
grant execute on function public.rdc_apagar(text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. Views para consulta / Power BI (horário local de São Luís)
--    Versões substituídas por revisão e RDC cancelados ficam fora das views.
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
       c.status
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
       c.status
from rdc_impactos i
join rdc_cabecalho c on c.codigo = i.rdc_codigo
where c.status not in ('Substituído', 'Cancelado');

create or replace view public.vw_rdc_resumo with (security_invoker = on) as
select c.codigo as rdc, c.data_rdc, c.responsavel, c.ativo, c.om, c.recebido_em,
       c.qtd_atividades, c.qtd_impactos, c.qtd_fotos,
       round(coalesce((select sum(duracao_min) from rdc_atividades a where a.rdc_codigo = c.codigo), 0) / 60.0, 2) as horas_atividades,
       round(coalesce((select sum(duracao_min) from rdc_impactos  i where i.rdc_codigo = c.codigo), 0) / 60.0, 2) as horas_impacto,
       c.area, c.ativo_descricao,
       c.responsavel_funcao,
       round(coalesce((select sum(a.efetivo_total * a.duracao_min) from rdc_atividades a where a.rdc_codigo = c.codigo), 0) / 60.0, 2) as homem_hora,
       c.status, c.revisao, c.validado_por, c.validado_em
from rdc_cabecalho c
where c.status not in ('Substituído', 'Cancelado');

revoke all on public.vw_rdc_atividades, public.vw_rdc_impactos, public.vw_rdc_resumo from anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. (OPCIONAL) Usuário somente leitura para o Power BI
--    Troque a senha, tire os "--" do bloco abaixo e execute.
-- ---------------------------------------------------------------------
-- create role powerbi_leitura login password 'TROQUE-ESTA-SENHA-FORTE';
-- grant usage on schema public to powerbi_leitura;
-- grant select on public.rdc_cabecalho, public.rdc_atividades, public.rdc_impactos, public.rdc_fotos,
--                 public.vw_rdc_atividades, public.vw_rdc_impactos, public.vw_rdc_resumo to powerbi_leitura;
-- create policy "powerbi le cabecalho"  on public.rdc_cabecalho  for select to powerbi_leitura using (true);
-- create policy "powerbi le atividades" on public.rdc_atividades for select to powerbi_leitura using (true);
-- create policy "powerbi le impactos"   on public.rdc_impactos   for select to powerbi_leitura using (true);
-- create policy "powerbi le fotos"      on public.rdc_fotos      for select to powerbi_leitura using (true);
