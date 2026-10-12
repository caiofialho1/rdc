import { useEffect, useState } from 'react'

// O rich text do ECharts não recorta a imagem de fundo pelo borderRadius:
// a foto do eixo é pré-recortada em círculo num canvas (cache por URL).
const cache = new Map<string, Promise<string>>()

function recortarCirculo(url: string, tamanho = 64): Promise<string> {
  if (!cache.has(url)) {
    cache.set(
      url,
      new Promise((resolver, rejeitar) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = canvas.height = tamanho
          const ctx = canvas.getContext('2d')
          if (!ctx) return rejeitar(new Error('Canvas indisponível.'))
          ctx.beginPath()
          ctx.arc(tamanho / 2, tamanho / 2, tamanho / 2, 0, Math.PI * 2)
          ctx.clip()
          ctx.drawImage(img, 0, 0, tamanho, tamanho)
          resolver(canvas.toDataURL('image/png'))
        }
        img.onerror = () => rejeitar(new Error(`Falha ao carregar ${url}.`))
        img.src = url
      }),
    )
  }
  return cache.get(url)!
}

/** URL original → versão redonda; enquanto não fica pronta (ou se falhar), a URL não aparece no mapa. */
export function useFotosRedondas(urls: string[]): Record<string, string> {
  const [redondas, setRedondas] = useState<Record<string, string>>({})
  const chave = urls.join('|')

  useEffect(() => {
    let cancelado = false
    for (const url of chave ? chave.split('|') : []) {
      recortarCirculo(url)
        .then((r) => !cancelado && setRedondas((atual) => (atual[url] === r ? atual : { ...atual, [url]: r })))
        .catch(() => {})
    }
    return () => {
      cancelado = true
    }
  }, [chave])

  return redondas
}
