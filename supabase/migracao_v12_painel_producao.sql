-- RDC Mobile — migração v12 (painel: produção x RDC).
-- Requer a v10 e a v11. Pode rodar mais de uma vez.
--   * rdc_admin_producao: devolve as linhas de vw_mc_rdc_dia de um período, só para administrador
--     (mesma verificação de nome/senha do rdc_admin_exportar). As views continuam fechadas para a chave pública.

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
  if p_fim - p_ini > 400 then raise exception 'Período máximo: 400 dias'; end if;

  return jsonb_build_object('ok', true, 'nome', v,
    'linhas', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.data, x.tag_chave, x.disciplina)
      from vw_mc_rdc_dia x
      where x.data between p_ini and p_fim), '[]'::jsonb));
end;
$$;
revoke all on function public.rdc_admin_producao(text, text, date, date) from public;
grant execute on function public.rdc_admin_producao(text, text, date, date) to anon, authenticated;
