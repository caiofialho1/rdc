-- RDC Mobile — migração v15 (botão "Atualizar carga produção" do painel).
-- Requer a v10. Pode rodar mais de uma vez.
--
--   * rdc_admin_mc_status:   lista o que já está carregado (chave arquivo|aba, sha1, itens) — o painel só envia o que mudou.
--   * rdc_admin_mc_importar: grava (ou remove) UMA aba de uma memória de cálculo: apaga a carga anterior da mesma chave
--     e insere cabeçalho, itens e diário. Só administrador (mesma verificação de nome/senha do rdc_admin_exportar).
--     Escreve apenas em mc_arquivos / mc_itens / mc_diario; não toca nos RDC.
-- A leitura da planilha é feita no navegador (painel-carga.js); o banco só recebe o resultado.

create or replace function public.rdc_admin_mc_status(p_nome text, p_senha text)
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
  return jsonb_build_object('ok', true, 'nome', v,
    'arquivos', coalesce((
      select jsonb_agg(jsonb_build_object('chave', a.chave, 'sha1', a.sha1, 'ativo', a.ativo, 'disciplina', a.disciplina,
                                          'periodo_ini', a.periodo_ini, 'periodo_fim', a.periodo_fim, 'importado_em', a.importado_em,
                                          'itens', (select count(*) from mc_itens i where i.arquivo_id = a.id))
                       order by a.chave)
      from mc_arquivos a), '[]'::jsonb));
end;
$$;
revoke all on function public.rdc_admin_mc_status(text, text) from public;
grant execute on function public.rdc_admin_mc_status(text, text) to anon, authenticated;

create or replace function public.rdc_admin_mc_importar(p_nome text, p_senha text, p_arquivo jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v        text := _rdc_admin_verificar(p_nome, p_senha);
  v_chave  text := nullif(trim(p_arquivo->>'chave'), '');
  v_acao   text := coalesce(p_arquivo->>'acao', 'gravar');
  v_id     bigint;
  n_itens  int := jsonb_array_length(coalesce(p_arquivo->'itens', '[]'::jsonb));
  n_diario int := jsonb_array_length(coalesce(p_arquivo->'diario', '[]'::jsonb));
begin
  if v is null then return jsonb_build_object('ok', false, 'erro', 'Sessão de administrador inválida. Entre novamente.'); end if;
  if v = 'bloqueado' then return jsonb_build_object('ok', false, 'erro', 'Muitas tentativas. Aguarde 15 minutos.'); end if;
  if v_chave is null then raise exception 'Chave da planilha ausente'; end if;
  if v_acao not in ('gravar', 'remover') then raise exception 'Ação inválida'; end if;

  delete from mc_arquivos where chave = v_chave;   -- itens e diário saem junto (on delete cascade)
  if v_acao = 'remover' then
    return jsonb_build_object('ok', true, 'acao', 'remover', 'chave', v_chave);
  end if;

  if n_itens < 1 or n_itens > 5000 or n_diario > 20000 then raise exception 'Quantidade de itens fora do limite'; end if;
  if (p_arquivo->>'disciplina') not in ('PAC', 'REC', 'TEL') or (p_arquivo->>'unidade') not in ('m2', 'kg') then
    raise exception 'Disciplina ou unidade inválida';
  end if;

  insert into mc_arquivos (chave, arquivo, aba, sha1, disciplina, unidade, contrato, contrato_codigo, ativo,
                           periodo_ini, periodo_fim, data_elaboracao, delineador)
  values (v_chave, p_arquivo->>'arquivo', p_arquivo->>'aba', p_arquivo->>'sha1', p_arquivo->>'disciplina', p_arquivo->>'unidade',
          p_arquivo->>'contrato', p_arquivo->>'contrato_codigo', p_arquivo->>'ativo',
          nullif(p_arquivo->>'periodo_ini', '')::date, nullif(p_arquivo->>'periodo_fim', '')::date,
          nullif(p_arquivo->>'data_elaboracao', '')::date, p_arquivo->>'delineador')
  returning id into v_id;

  insert into mc_itens (arquivo_id, linha, item, subitem, ref_projeto, om, centro_custo, area, area2, descricao,
                        larg, comp, qtd, lados, criterio, peso_unit, prev, exec_pct, exec_qtd, obs, etapas, marca)
  select v_id, i.linha, i.item, i.subitem, i.ref_projeto, i.om, i.centro_custo, i.area, i.area2, i.descricao,
         i.larg, i.comp, i.qtd, i.lados, i.criterio, i.peso_unit, i.prev, i.exec_pct, i.exec_qtd, i.obs,
         coalesce(i.etapas, '{}'::jsonb), i.marca
  from jsonb_to_recordset(p_arquivo->'itens') as i(
         linha int, item text, subitem text, ref_projeto text, om text, centro_custo text, area text, area2 text, descricao text,
         larg numeric, comp numeric, qtd numeric, lados numeric, criterio numeric, peso_unit numeric, prev numeric,
         exec_pct numeric, exec_qtd numeric, obs text, etapas jsonb, marca text);

  if n_diario > 0 then
    insert into mc_diario (arquivo_id, data, etapa, valor)
    select v_id, d.data, d.etapa, d.valor
    from jsonb_to_recordset(p_arquivo->'diario') as d(data date, etapa text, valor numeric);
  end if;

  return jsonb_build_object('ok', true, 'acao', 'gravar', 'chave', v_chave, 'itens', n_itens, 'diario', n_diario);
end;
$$;
revoke all on function public.rdc_admin_mc_importar(text, text, jsonb) from public;
grant execute on function public.rdc_admin_mc_importar(text, text, jsonb) to anon, authenticated;
