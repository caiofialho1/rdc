import type { z } from 'zod'
import { BUCKET, SB_ANON_KEY, SB_URL } from '../config'

export class RpcError extends Error {}

/**
 * Porta 1:1 do helper `rpc()` de painel.html: fetch cru para
 * `${SB_URL}/rest/v1/rpc/${fn}` com a chave anônima no header `apikey`.
 * Sem supabase-js, sem JWT — é o contrato real do backend (ver
 * docs/DATABASE_AUDIT.md). O schema valida a resposta em runtime e dá o
 * tipo estático via z.infer.
 */
export async function rpc<S extends z.ZodType>(fn: string, args: Record<string, unknown>, schema: S): Promise<z.infer<S>> {
  const resposta = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: SB_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  })
  if (!resposta.ok) {
    // `raise exception` no SQL chega como HTTP 4xx/5xx com {message} do
    // PostgREST — repassa o motivo em vez de só o código HTTP.
    let motivo = ''
    try {
      const corpoErro = await resposta.json()
      if (corpoErro && typeof corpoErro.message === 'string') motivo = `: ${corpoErro.message}`
    } catch {
      /* corpo não-JSON: fica só o código HTTP */
    }
    throw new RpcError(`Falha ao chamar ${fn} (HTTP ${resposta.status})${motivo}.`)
  }
  const corpo = await resposta.json()
  const validado = schema.safeParse(corpo)
  if (!validado.success) {
    throw new RpcError(`Resposta de ${fn} não bate com o schema esperado: ${validado.error.message}`)
  }
  return validado.data
}

export function urlFoto(caminho: string): string {
  const partes = caminho.split('/').map(encodeURIComponent).join('/')
  return `${SB_URL}/storage/v1/object/authenticated/${BUCKET}/${partes}`
}

export function headersFoto(): HeadersInit {
  return { apikey: SB_ANON_KEY }
}
