-- RDC Mobile — migração v7 (cópia automática dos RDC para o SharePoint, sem login dos usuários).
-- Requer v4 e v5. Pode rodar mais de uma vez.
--
-- Como funciona:
--   * todo RDC criado, alterado (validação, revisão, cancelamento) ou apagado entra em rdc_sync_fila;
--   * a Edge Function "sync-sharepoint" (supabase/functions/sync-sharepoint) lê a fila e grava nas
--     listas RDC_Cabecalho/Atividades/Impactos/Fotos e na biblioteca RDC_Evidencias, com credencial
--     de aplicativo do Entra ID (nenhum usuário faz login);
--   * a função é chamada na hora (pg_net) e, a cada 5 minutos, para tentar de novo o que falhou (pg_cron).
--   * falha na sincronização NUNCA impede o envio do RDC.
--
-- Depois de rodar este script e publicar a Edge Function, ative a chamada (troque os valores):
--   select vault.create_secret('https://ltuzzgdapgfbtxaxigek.supabase.co/functions/v1/sync-sharepoint', 'rdc_sync_url');
--   select vault.create_secret('MESMO-VALOR-DO-SEGREDO-RDC_SYNC_SEGREDO-DA-FUNCAO', 'rdc_sync_segredo');
-- Carga inicial (copia os RDC que já existem): botão no app (⚙ → Sincronização SharePoint) ou
--   insert into public.rdc_sync_fila (codigo) select codigo from public.rdc_cabecalho;

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Fila (um registro por evento; a sincronização é sempre "deixe o SharePoint igual ao banco para este RDC")
create table if not exists public.rdc_sync_fila (
  id            bigint generated always as identity primary key,
  codigo        text not null,
  criado_em     timestamptz not null default now(),
  tentativas    int not null default 0,
  proxima_em    timestamptz not null default now(),
  processado_em timestamptz,
  erro          text
);
create index if not exists ix_sync_pend on public.rdc_sync_fila (proxima_em) where processado_em is null;

-- Itens já criados no SharePoint (evita duplicar e permite atualizar/apagar sem pesquisar nas listas)
create table if not exists public.rdc_sp_itens (
  titulo        text primary key,           -- código do RDC, atividade, impacto ou foto
  rdc_codigo    text not null,
  lista         text not null,
  item_id       text not null,
  drive_item_id text,
  criado_em     timestamptz not null default now()
);
create index if not exists ix_sp_itens_rdc on public.rdc_sp_itens (rdc_codigo);

alter table public.rdc_sync_fila enable row level security;
alter table public.rdc_sp_itens  enable row level security;
revoke all on public.rdc_sync_fila, public.rdc_sp_itens from anon, authenticated;
grant all on public.rdc_sync_fila, public.rdc_sp_itens to service_role;

-- Chama a Edge Function (assíncrono, depois do commit). Sem URL/segredo no Vault: não faz nada.
create or replace function public._rdc_sync_disparar()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  u text; s text;
begin
  select decrypted_secret into u from vault.decrypted_secrets where name = 'rdc_sync_url';
  select decrypted_secret into s from vault.decrypted_secrets where name = 'rdc_sync_segredo';
  if u is null or s is null then return; end if;
  perform net.http_post(url := u, body := '{}'::jsonb,
                        headers := jsonb_build_object('Content-Type', 'application/json', 'x-rdc-sync', s),
                        timeout_milliseconds := 5000);
exception when others then
  raise warning 'rdc sync: %', sqlerrm; -- nunca impede a gravação do RDC
end;
$$;

create or replace function public._rdc_sync_enfileirar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into rdc_sync_fila (codigo) values (case when tg_op = 'DELETE' then old.codigo else new.codigo end);
  perform _rdc_sync_disparar();
  return null;
exception when others then
  raise warning 'rdc sync (fila): %', sqlerrm;
  return null;
end;
$$;

drop trigger if exists rdc_sync_cabecalho on public.rdc_cabecalho;
create trigger rdc_sync_cabecalho
  after insert or update or delete on public.rdc_cabecalho
  for each row execute function public._rdc_sync_enfileirar();

-- Usadas só pela Edge Function (service_role)
create or replace function public._rdc_iso(t timestamptz)
returns text language sql immutable as $$ select to_char(t at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') $$;

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
      'ValidadoEm', _rdc_iso(c.validado_em), 'ObsValidacao', coalesce(c.obs_validacao, '')),
    'atividades', coalesce((
      select jsonb_agg(jsonb_build_object(
        'Title', a.codigo, 'RDC_ID', c.codigo, 'Ordem', a.ordem, 'Disciplina', a.disciplina, 'Servico', a.servico,
        'TipoAndaime', a.tipo_andaime, 'DescricaoOutros', coalesce(a.descricao_outros, ''), 'Observacao', coalesce(a.observacao, ''),
        'InicioAtividade', _rdc_iso(a.inicio), 'FimAtividade', _rdc_iso(a.fim), 'DuracaoMin', a.duracao_min,
        'Ativo', c.ativo, 'OM', c.om, 'DataRDC', to_char(c.data_rdc, 'YYYY-MM-DD') || 'T12:00:00Z',
        'QtdAjudante', a.qtd_ajudante, 'QtdPintor', a.qtd_pintor, 'QtdJatista', a.qtd_jatista, 'QtdMecanico', a.qtd_mecanico,
        'QtdMontadorAndaime', a.qtd_montador_andaime, 'QtdAlpinistaN1', a.qtd_alpinista_n1, 'QtdSoldador', a.qtd_soldador,
        'EfetivoTotal', a.efetivo_total) order by a.ordem)
      from rdc_atividades a where a.rdc_codigo = c.codigo), '[]'::jsonb),
    'impactos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'Title', i.codigo, 'RDC_ID', c.codigo, 'Ordem', i.ordem, 'TipoImpacto', i.descricao,
        'InicioImpacto', _rdc_iso(i.inicio), 'FimImpacto', _rdc_iso(i.fim), 'DuracaoMin', i.duracao_min,
        'Ativo', c.ativo, 'OM', c.om, 'DataRDC', to_char(c.data_rdc, 'YYYY-MM-DD') || 'T12:00:00Z') order by i.ordem)
      from rdc_impactos i where i.rdc_codigo = c.codigo), '[]'::jsonb),
    'fotos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'Title', f.codigo, 'RDC_ID', c.codigo, 'Atividade_ID', f.atividade_codigo, 'NomeArquivo', f.nome_arquivo,
        'DataHoraFoto', _rdc_iso(f.data_hora_foto), 'Caminho', f.caminho) order by f.codigo)
      from rdc_fotos f where f.rdc_codigo = c.codigo), '[]'::jsonb)
  )
  from rdc_cabecalho c where c.codigo = p_codigo
$$;

-- Reserva itens da fila (várias execuções ao mesmo tempo não pegam o mesmo item)
create or replace function public.rdc_sync_pegar(p_limite int default 10)
returns table (id bigint, codigo text, tentativas int)
language sql
security definer
set search_path = public
as $$
  update rdc_sync_fila f
     set proxima_em = now() + interval '5 minutes', tentativas = f.tentativas + 1
   where f.id in (select q.id from rdc_sync_fila q
                   where q.processado_em is null and q.proxima_em <= now() and q.tentativas < 10
                   order by q.id limit greatest(p_limite, 1) for update skip locked)
  returning f.id, f.codigo, f.tentativas
$$;

-- Conclui um item: sem erro = processado; com erro = nova tentativa mais tarde (1, 4, 9… até 60 min)
create or replace function public.rdc_sync_concluir(p_id bigint, p_erro text default null)
returns void
language sql
security definer
set search_path = public
as $$
  update rdc_sync_fila
     set processado_em = case when p_erro is null then now() end,
         erro          = left(p_erro, 1000),
         proxima_em    = case when p_erro is null then proxima_em
                              else now() + make_interval(mins => least(60, tentativas * tentativas)) end
   where id = p_id
$$;

revoke all on function public._rdc_sync_disparar()          from public, anon, authenticated;
revoke all on function public._rdc_sync_enfileirar()        from public, anon, authenticated;
revoke all on function public.rdc_para_sharepoint(text)     from public, anon, authenticated;
revoke all on function public.rdc_sync_pegar(int)           from public, anon, authenticated;
revoke all on function public.rdc_sync_concluir(bigint, text) from public, anon, authenticated;
grant execute on function public.rdc_para_sharepoint(text)     to service_role;
grant execute on function public.rdc_sync_pegar(int)           to service_role;
grant execute on function public.rdc_sync_concluir(bigint, text) to service_role;

-- Situação e ações para o administrador (⚙ → Sincronização SharePoint)
-- p_acao: null = só consultar; 'reprocessar' = tenta de novo os com erro; 'todos' = carga completa
create or replace function public.rdc_sync_admin(p_nome text, p_senha text, p_acao text default null)
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

  if p_acao = 'reprocessar' then
    update rdc_sync_fila set tentativas = 0, proxima_em = now() where processado_em is null;
    perform _rdc_sync_disparar();
  elsif p_acao = 'todos' then
    insert into rdc_sync_fila (codigo) select codigo from rdc_cabecalho;
    perform _rdc_sync_disparar();
  elsif p_acao is not null then
    raise exception 'Ação inválida';
  end if;

  return jsonb_build_object('ok', true,
    'configurado', exists (select 1 from vault.decrypted_secrets where name in ('rdc_sync_url', 'rdc_sync_segredo') having count(*) = 2),
    'pendentes',   (select count(*) from rdc_sync_fila where processado_em is null and erro is null),
    'com_erro',    (select count(*) from rdc_sync_fila where processado_em is null and erro is not null),
    'desistidos',  (select count(*) from rdc_sync_fila where processado_em is null and tentativas >= 10),
    'ultimo_erro', (select codigo || ': ' || erro from rdc_sync_fila where processado_em is null and erro is not null order by id desc limit 1),
    'ultima_sync', (select max(processado_em) from rdc_sync_fila),
    'no_sharepoint', (select count(*) from rdc_sp_itens where lista = 'RDC_Cabecalho'));
end;
$$;
revoke all on function public.rdc_sync_admin(text, text, text) from public;
grant execute on function public.rdc_sync_admin(text, text, text) to anon, authenticated;

-- Repetição a cada 5 minutos (só chama a função se houver pendência)
select cron.schedule('rdc-sync-sharepoint', '*/5 * * * *',
  $$select public._rdc_sync_disparar() where exists (select 1 from public.rdc_sync_fila where processado_em is null and tentativas < 10)$$);
