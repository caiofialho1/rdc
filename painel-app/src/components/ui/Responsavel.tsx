import { fotoResponsavel, funcaoResponsavel, iniciais } from '../../domain/responsaveis'

const TAMANHOS = { sm: 'h-6 w-6 text-[10px]', md: 'h-8 w-8 text-[11px]', lg: 'h-12 w-12 text-sm' } as const

type Tamanho = keyof typeof TAMANHOS

/** Foto do responsável (ou iniciais, se não houver foto). Decorativa: o nome sempre vem ao lado. */
export function AvatarResponsavel({ nome, tamanho = 'md' }: { nome: string; tamanho?: Tamanho }) {
  const foto = fotoResponsavel(nome)
  const classe = `${TAMANHOS[tamanho]} shrink-0 rounded-full ring-1 ring-border`
  return foto ? (
    <img src={foto} alt="" aria-hidden="true" className={`${classe} object-cover`} />
  ) : (
    <span aria-hidden="true" className={`${classe} inline-flex items-center justify-center bg-primary-light font-semibold text-white`}>
      {iniciais(nome)}
    </span>
  )
}

/** Avatar + nome (e, opcionalmente, a função cadastrada no app mobile). */
export default function Responsavel({ nome, tamanho = 'sm', comFuncao = false }: { nome: string; tamanho?: Tamanho; comFuncao?: boolean }) {
  const funcao = comFuncao ? funcaoResponsavel(nome) : ''
  return (
    <span className="flex max-w-full min-w-0 items-center gap-2">
      <AvatarResponsavel nome={nome} tamanho={tamanho} />
      <span className="min-w-0">
        <span className="block truncate">{nome}</span>
        {funcao && <span className="block truncate text-xs text-text-secondary">{funcao}</span>}
      </span>
    </span>
  )
}
