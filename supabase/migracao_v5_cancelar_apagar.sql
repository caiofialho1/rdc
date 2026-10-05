-- RDC Mobile — migração v5 (administrador cancela ou apaga RDC emitidos).
-- Requer a v4 (migracao_v4_admin_validacao.sql). Pode rodar mais de uma vez.
--
--   Cancelar -> status 'Cancelado' (fica no histórico, sai das views; o administrador pode reativar validando)
--   Apagar   -> remove o RDC e as versões anteriores (revisões) do banco; as fotos são liberadas para o
--               app apagar do Storage. Uma cópia dos dados fica em rdc_exclusoes (só pelo painel/SQL).

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

-- Validação: agora também cancela; um RDC cancelado pode ser reativado (validar ou liberar revisão)
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
