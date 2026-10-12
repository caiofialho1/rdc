import { useEffect, useState } from 'react'
import { headersFoto, urlFoto } from './client'

// Mesma ideia do painel.html: cache de blob URL por caminho, evita baixar a
// mesma foto duas vezes (bucket é privado, cada leitura exige o header apikey).
const cache = new Map<string, Promise<string>>()

async function buscar(caminho: string): Promise<string> {
  const resposta = await fetch(urlFoto(caminho), { headers: headersFoto() })
  if (!resposta.ok) throw new Error(`Falha ao carregar a foto (HTTP ${resposta.status}).`)
  const blob = await resposta.blob()
  return URL.createObjectURL(blob)
}

export function useFotoBlobUrl(caminho: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!caminho) {
      setUrl(null)
      return
    }
    if (!cache.has(caminho)) cache.set(caminho, buscar(caminho))
    let cancelado = false
    cache
      .get(caminho)!
      .then((u) => !cancelado && setUrl(u))
      .catch(() => !cancelado && setUrl(null))
    return () => {
      cancelado = true
    }
  }, [caminho])

  return url
}
