import type { UseQueryResult } from '@tanstack/react-query'
import { useRef } from 'react'

/**
 * `placeholderData: keepPreviousData` só mantém o dado anterior enquanto a
 * nova consulta está `pending` — quando ela termina em erro, o React Query
 * zera `data` (vira `undefined`). Isso violava a regra "nunca apagar dados
 * bons numa falha" (ver docs/INFORMATION_ARCHITECTURE.md). Este hook guarda
 * à parte o último payload `ok:true` e o devolve mesmo depois de uma falha.
 */
export function useUltimoSucesso<T extends { ok: boolean }>(query: UseQueryResult<T>) {
  const ultimoRef = useRef<Extract<T, { ok: true }> | null>(null)
  if (query.data?.ok) ultimoRef.current = query.data as Extract<T, { ok: true }>

  return {
    dados: ultimoRef.current,
    carregando: query.isFetching,
    desatualizado: query.isError && ultimoRef.current !== null,
    semDados: query.isError && ultimoRef.current === null,
  }
}
