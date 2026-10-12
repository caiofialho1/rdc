import { useMutation, useQueryClient } from '@tanstack/react-query'
import { rpc } from './client'
import {
  type CamposEditaveis,
  type Decisao,
  EditarResponse,
  type FolhaMc,
  LoginResponse,
  McImportarResponse,
  type RemoverMc,
  ValidarResponse,
} from './schemas'
import type { Admin } from '../auth/session'
import { z } from 'zod'

export function useLogin() {
  return useMutation({
    mutationFn: (admin: Admin) => rpc('rdc_admin_login', { p_nome: admin.nome, p_senha: admin.senha }, LoginResponse),
  })
}

export function useMcImportar(admin: Admin | null) {
  return useMutation({
    mutationFn: (arquivo: FolhaMc | z.infer<typeof RemoverMc>) =>
      rpc('rdc_admin_mc_importar', { p_nome: admin!.nome, p_senha: admin!.senha, p_arquivo: arquivo }, McImportarResponse),
  })
}

export function useEditar(admin: Admin | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: { codigos: string[]; campos: CamposEditaveis; motivo?: string }) =>
      rpc(
        'rdc_admin_editar',
        { p_nome: admin!.nome, p_senha: admin!.senha, p_codigos: params.codigos, p_campos: params.campos, p_motivo: params.motivo ?? null },
        EditarResponse,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rdc_admin_exportar'] })
    },
  })
}

export function useValidar(admin: Admin | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: { codigo: string; decisao: Decisao; obs?: string }) =>
      rpc(
        'rdc_validar',
        { p_nome: admin!.nome, p_senha: admin!.senha, p_codigo: params.codigo, p_decisao: params.decisao, p_obs: params.obs ?? null },
        ValidarResponse,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rdc_admin_exportar'] })
    },
  })
}
