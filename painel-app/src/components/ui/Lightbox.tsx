import { useEffect } from 'react'
import type { FotoRow } from '../../api/schemas'
import { useFotoBlobUrl } from '../../api/fotos'
import { useDialogo } from './useDialogo'

export default function Lightbox({
  fotos,
  indice,
  onFechar,
  onNavegar,
}: {
  fotos: FotoRow[]
  indice: number
  onFechar: () => void
  onNavegar: (i: number) => void
}) {
  const foto = fotos[indice]
  const url = useFotoBlobUrl(foto?.caminho ?? null)
  const ref = useDialogo<HTMLDivElement>(!!foto, onFechar)

  // Setas do teclado navegam entre as fotos (Esc fecha, via useDialogo).
  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' && indice > 0) onNavegar(indice - 1)
      if (e.key === 'ArrowRight' && indice < fotos.length - 1) onNavegar(indice + 1)
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [indice, fotos.length, onNavegar])

  if (!foto) return null

  return (
    <div
      ref={ref}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-primary/90 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Foto ${indice + 1} de ${fotos.length}`}
    >
      <button type="button" onClick={onFechar} className="se-button se-button--on-dark absolute top-4 right-4" data-autofoco>
        Fechar
      </button>
      <div className="flex max-h-[80vh] max-w-4xl items-center gap-2 sm:gap-4">
        <button
          type="button"
          disabled={indice === 0}
          onClick={() => onNavegar(indice - 1)}
          aria-label="Foto anterior"
          className="flex h-11 w-11 items-center justify-center rounded-control border border-white/35 text-2xl text-white hover:bg-white/10 disabled:opacity-30"
        >
          ‹
        </button>
        {url ? (
          <img src={url} alt={`Foto ${foto.codigo}`} className="max-h-[75vh] max-w-full rounded-[3px]" />
        ) : (
          <p className="text-white" role="status">
            Carregando foto…
          </p>
        )}
        <button
          type="button"
          disabled={indice === fotos.length - 1}
          onClick={() => onNavegar(indice + 1)}
          aria-label="Próxima foto"
          className="flex h-11 w-11 items-center justify-center rounded-control border border-white/35 text-2xl text-white hover:bg-white/10 disabled:opacity-30"
        >
          ›
        </button>
      </div>
      <p className="mt-3 text-sm text-white/85">
        <span className="tabular">
          {indice + 1}/{fotos.length}
        </span>
        {' · '}
        {foto.codigo}
        {foto.latitude != null && foto.longitude != null && (
          <>
            {' · '}
            <a className="underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${foto.latitude},${foto.longitude}`}>
              ver no mapa
            </a>
          </>
        )}
      </p>
    </div>
  )
}
