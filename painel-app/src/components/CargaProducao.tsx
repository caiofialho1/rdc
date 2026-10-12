import { useState } from 'react'
import { rpc } from '../api/client'
import { McImportarResponse, McStatusResponse } from '../api/schemas'
import { useAuth } from '../auth/AuthProvider'
import { lerPasta } from '../domain/xlsxCarga'
import Card from './ui/Card'
import { useDialogo } from './ui/useDialogo'

interface LinhaLog {
  texto: string
  tipo?: 'ok' | 'aviso' | 'erro'
}

/**
 * Porta atualizarCargaProducao() de painel.html: lê a pasta no navegador
 * (xlsxCarga.lerPasta), compara com rdc_admin_mc_status e grava só o que
 * mudou via rdc_admin_mc_importar. Mesmo contrato de dados, só a UI muda.
 */
export default function CargaProducao({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const { admin, tratarErroRpc } = useAuth()
  const [rodando, setRodando] = useState(false)
  const [passo, setPasso] = useState('')
  const [progresso, setProgresso] = useState<{ i: number; n: number } | null>(null)
  const [log, setLog] = useState<LinhaLog[]>([])
  // Esc só fecha quando não há carga em andamento (fechar no meio esconderia o progresso).
  const dialogoRef = useDialogo<HTMLDivElement>(aberto, rodando ? () => {} : onFechar)

  /*
   * Seletor de PASTA (não de arquivos): o atributo precisa estar no <input>
   * quando ele existe. Antes era aplicado num useEffect(…, []) que rodava na
   * montagem — com o diálogo fechado o componente devolve null, o ref era
   * null e o atributo nunca era aplicado: o navegador abria o seletor de
   * arquivos comum. Callback ref aplica sempre que o input é criado.
   */
  function marcarComoPasta(el: HTMLInputElement | null) {
    el?.setAttribute('webkitdirectory', '')
  }

  function linha(texto: string, tipo?: LinhaLog['tipo']) {
    setLog((l) => [...l, { texto, tipo }])
  }

  async function executar(files: FileList | File[]) {
    if (!admin || rodando) return
    setRodando(true)
    setLog([])
    setProgresso(null)
    try {
      setPasso('Consultando o que já está no banco…')
      const st = await rpc('rdc_admin_mc_status', { p_nome: admin.nome, p_senha: admin.senha }, McStatusResponse)
      if (!st.ok) {
        tratarErroRpc(st.erro)
        throw new Error(st.erro)
      }
      const noBanco = new Map(st.arquivos.map((a) => [a.chave, a]))

      const lido = await lerPasta(files, (p) => {
        setPasso(`Lendo planilhas ${p.i}/${p.n}: ${p.nome}`)
        setProgresso({ i: p.i - 1, n: p.n })
      })
      const erros = lido.erros.map((e) => `${e.arquivo}: ${e.erro}`)
      if (!lido.lidos) throw new Error('Nenhuma planilha .xlsx/.xlsm encontrada na pasta escolhida.')
      if (!lido.folhas.length && !erros.length) throw new Error('Nenhuma aba MC_PAC/MC_REC com dados foi encontrada.')

      const enviar = lido.folhas.filter((f) => !f.sha1 || noBanco.get(f.chave)?.sha1 !== f.sha1)
      const iguais = lido.folhas.length - enviar.length
      const remover = lido.ignoradas.filter((i) => i.duplicada && noBanco.has(i.chave))

      let gravadas = 0
      let itens = 0
      setProgresso({ i: 0, n: Math.max(1, enviar.length + remover.length) })
      for (let i = 0; i < enviar.length; i++) {
        const f = enviar[i]
        setPasso(`Enviando ${i + 1}/${enviar.length}: ${f.chave}`)
        try {
          const r = await rpc('rdc_admin_mc_importar', { p_nome: admin.nome, p_senha: admin.senha, p_arquivo: f }, McImportarResponse)
          if (!r.ok) throw new Error(r.erro)
          if (!('itens' in r)) throw new Error('resposta inesperada do banco (gravação sem contagem de itens)')
          gravadas++
          itens += r.itens
          linha(`Gravada: ${f.chave} — ${r.itens} itens, ${r.diario} lançamentos diários`, 'ok')
        } catch (e) {
          erros.push(`${f.chave}: ${(e as Error).message}`)
        }
        setProgresso({ i: i + 1, n: Math.max(1, enviar.length + remover.length) })
      }
      for (const r of remover) {
        try {
          const resp = await rpc('rdc_admin_mc_importar', { p_nome: admin.nome, p_senha: admin.senha, p_arquivo: { acao: 'remover', chave: r.chave } }, McImportarResponse)
          if (!resp.ok) throw new Error(resp.erro)
          linha(`Removida do banco (conteúdo repetido): ${r.chave}`)
        } catch (e) {
          erros.push(`${r.chave}: ${(e as Error).message}`)
        }
      }
      lido.folhas.forEach((f) => f.avisos.forEach((a) => linha(`Aviso — ${f.chave}: ${a}`, 'aviso')))
      lido.ignoradas.filter((i) => i.duplicada).forEach((i) => linha(`Ignorada — ${i.chave}: ${i.motivo}`, 'aviso'))
      const presentes = new Set([...lido.folhas.map((f) => f.chave), ...lido.ignoradas.map((i) => i.chave)])
      const foraDaPasta = [...noBanco.keys()].filter((k) => !presentes.has(k))
      if (foraDaPasta.length) linha(`No banco, mas não está mais nesta pasta (mantida): ${foraDaPasta.join('; ')}`, 'aviso')
      if (lido.foraTelhado.length) linha(`${lido.foraTelhado.length} arquivo(s) da pasta TELHADO não foram lidos (layout diferente).`, 'aviso')
      erros.forEach((e) => linha(`Erro — ${e}`, 'erro'))

      setPasso(
        erros.length
          ? `Carga concluída com ${erros.length} erro(s): ${gravadas} planilha(s) gravada(s) (${itens} itens), ${iguais} sem alteração.`
          : `Carga concluída: ${gravadas} planilha(s) gravada(s) (${itens} itens), ${iguais} sem alteração, ${lido.lidos} arquivo(s) lido(s).`,
      )
    } catch (e) {
      setPasso('Não foi possível atualizar a carga: ' + (e as Error).message)
      linha((e as Error).message, 'erro')
    } finally {
      setRodando(false)
    }
  }

  if (!aberto) return null

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-primary/60 p-4">
      <Card
        ref={dialogoRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="carga-titulo"
        tabIndex={-1}
        className="max-h-[85vh] w-full max-w-lg overflow-auto"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id="carga-titulo" className="text-[15px] font-semibold text-text-primary">
            Atualizar carga produção
          </h2>
          <button type="button" onClick={onFechar} className="se-link" data-autofoco>
            Fechar
          </button>
        </div>
        <label className="se-field mb-3">
          Escolha a pasta das memórias de cálculo (lê .xlsx/.xlsm das subpastas)
          <input
            ref={marcarComoPasta}
            type="file"
            multiple
            disabled={rodando}
            onChange={(e) => {
              const arquivos = [...(e.target.files ?? [])]
              e.target.value = ''
              if (arquivos.length) executar(arquivos)
            }}
            className="text-sm text-text-primary file:mr-3 file:rounded-control file:border file:border-primary file:bg-primary file:px-3 file:py-1.5 file:text-white"
          />
        </label>
        {passo && (
          <p role="status" className="mb-2 text-sm text-text-secondary">
            {passo}
          </p>
        )}
        {progresso && <progress aria-label="Progresso da carga" className="mb-2 w-full" max={progresso.n} value={progresso.i} />}
        <ul className="max-h-64 overflow-auto text-xs" aria-label="Registro da carga">
          {log.map((l, i) => (
            <li
              key={i}
              className={l.tipo === 'ok' ? 'text-success-text' : l.tipo === 'erro' ? 'text-danger-text' : l.tipo === 'aviso' ? 'text-warning-text' : ''}
            >
              {l.texto}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
