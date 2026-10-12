/**
 * Hooks de leitura (React Query). Cobrem o padrão atual: refetch por
 * período, "manter os dados antigos numa falha" (placeholderData) e os
 * escopos independentes de Produção × RDC / Produção por responsável, que
 * só carregam quando a tela está aberta (`enabled`).
 */
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { rpc } from './client'
import { ExportarResponse, McStatusResponse, ProducaoRespResponse, ProducaoResponse } from './schemas'
import type { Admin } from '../auth/session'

export function useExportar(admin: Admin | null, ini: string, fim: string) {
  return useQuery({
    queryKey: ['rdc_admin_exportar', ini, fim],
    queryFn: () => rpc('rdc_admin_exportar', { p_nome: admin!.nome, p_senha: admin!.senha, p_ini: ini, p_fim: fim }, ExportarResponse),
    enabled: !!admin,
    placeholderData: keepPreviousData,
  })
}

export function useProducao(admin: Admin | null, ini: string, fim: string, aberto: boolean) {
  return useQuery({
    queryKey: ['rdc_admin_producao', ini, fim],
    queryFn: () => rpc('rdc_admin_producao', { p_nome: admin!.nome, p_senha: admin!.senha, p_ini: ini, p_fim: fim }, ProducaoResponse),
    enabled: !!admin && aberto,
    placeholderData: keepPreviousData,
  })
}

export function useProducaoResp(admin: Admin | null, ini: string, fim: string, aberto: boolean) {
  return useQuery({
    queryKey: ['rdc_admin_producao_resp', ini, fim],
    queryFn: () =>
      rpc('rdc_admin_producao_resp', { p_nome: admin!.nome, p_senha: admin!.senha, p_ini: ini, p_fim: fim }, ProducaoRespResponse),
    enabled: !!admin && aberto,
    placeholderData: keepPreviousData,
  })
}

export function useMcStatus(admin: Admin | null, aberto: boolean) {
  return useQuery({
    queryKey: ['rdc_admin_mc_status'],
    queryFn: () => rpc('rdc_admin_mc_status', { p_nome: admin!.nome, p_senha: admin!.senha }, McStatusResponse),
    enabled: !!admin && aberto,
  })
}
