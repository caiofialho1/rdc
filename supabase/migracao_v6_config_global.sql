-- RDC Mobile — migração v6 (configuração definida pelo administrador para todos os aparelhos).
-- Requer a v4. Pode rodar mais de uma vez.
--
-- O administrador escolhe no app (⚙ → "Salvar para todos os aparelhos") o modo de envio:
-- Supabase, SharePoint (graph), Power Automate (flow) ou demonstração, e os dados do SharePoint/fluxo.
-- Todos os aparelhos leem esta configuração ao abrir o app. A URL/chave do Supabase continuam no
-- index.html (é onde esta configuração fica guardada).
-- Para voltar todos ao padrão do arquivo: botão "Remover configuração de todos" no app,
-- ou aqui: delete from public.rdc_config;

create table if not exists public.rdc_config (
  id           int primary key default 1 check (id = 1),  -- uma linha só
  valor        jsonb not null default '{}'::jsonb,
  alterado_por text,
  alterado_em  timestamptz not null default now()
);
alter table public.rdc_config enable row level security;
revoke all on public.rdc_config from anon, authenticated;

-- Leitura pelo app (todos os aparelhos)
create or replace function public.rdc_config_obter()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select valor || jsonb_build_object('alteradoPor', alterado_por, 'alteradoEm', alterado_em)
                   from rdc_config where id = 1), '{}'::jsonb)
$$;

-- Gravação pelo administrador; p_valor null remove (todos voltam ao padrão do arquivo)
create or replace function public.rdc_config_definir(p_nome text, p_senha text, p_valor jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v    text := _rdc_admin_verificar(p_nome, p_senha);
  novo jsonb;
begin
  if v is null then return jsonb_build_object('ok', false, 'erro', 'Sessão de administrador inválida. Entre novamente.'); end if;
  if v = 'bloqueado' then return jsonb_build_object('ok', false, 'erro', 'Muitas tentativas. Aguarde 15 minutos.'); end if;

  if p_valor is null then
    delete from rdc_config;
    return jsonb_build_object('ok', true, 'removido', true);
  end if;

  if coalesce(p_valor->>'mode', '') not in ('supabase', 'graph', 'flow', 'demo') then
    raise exception 'Modo inválido';
  end if;
  -- só as chaves conhecidas, como texto
  select coalesce(jsonb_object_agg(k, left(trim(p_valor->>k), 500)), '{}'::jsonb) into novo
  from unnest(array['mode', 'siteUrl', 'clientId', 'tenantId', 'flowUrl']) k
  where p_valor ? k;
  if novo->>'mode' = 'graph' and (coalesce(novo->>'siteUrl', '') = '' or coalesce(novo->>'clientId', '') = '' or coalesce(novo->>'tenantId', '') = '') then
    raise exception 'Para SharePoint, informe URL do site, Client ID e Tenant ID';
  end if;
  if novo->>'mode' = 'flow' and coalesce(novo->>'flowUrl', '') = '' then
    raise exception 'Para Power Automate, informe a URL do gatilho';
  end if;

  insert into rdc_config (id, valor, alterado_por, alterado_em) values (1, novo, v, now())
  on conflict (id) do update set valor = excluded.valor, alterado_por = excluded.alterado_por, alterado_em = excluded.alterado_em;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.rdc_config_obter() from public;
revoke all on function public.rdc_config_definir(text, text, jsonb) from public;
grant execute on function public.rdc_config_obter() to anon, authenticated;
grant execute on function public.rdc_config_definir(text, text, jsonb) to anon, authenticated;
