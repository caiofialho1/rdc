import { useState, type FormEvent } from 'react'
import { useLogin } from '../api/mutations'
import { useAuth } from '../auth/AuthProvider'
import logoPpl from '../assets/ppl-logo.png'

export default function Login() {
  const { entrar } = useAuth()
  const login = useLogin()
  const [nome, setNome] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  async function aoEnviar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    const resposta = await login.mutateAsync({ nome, senha })
    if (!resposta.ok) {
      setErro(resposta.erro)
      return
    }
    entrar({ nome, senha })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary px-4">
      <form onSubmit={aoEnviar} className="w-full max-w-sm overflow-hidden rounded-card bg-surface shadow-sm">
        <div className="h-1 bg-accent" aria-hidden="true" />
        <div className="p-8">
          <img src={logoPpl} alt="" className="mb-4 h-8 w-auto" aria-hidden="true" />
          <h1 className="mb-1 text-xl font-semibold text-text-primary">Painel de Controle</h1>
          <p className="mb-6 text-sm text-text-secondary">Entre com seu nome e senha de administrador.</p>
          <label className="mb-1 block text-sm font-medium text-text-secondary" htmlFor="nome">
            Nome
          </label>
          <input
            id="nome"
            autoFocus
            autoComplete="username"
            className="se-input mb-4 px-3 py-2"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
          <label className="mb-1 block text-sm font-medium text-text-secondary" htmlFor="senha">
            Senha
          </label>
          <input
            id="senha"
            type="password"
            autoComplete="current-password"
            className="se-input mb-4 px-3 py-2"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
          {erro && (
            <p role="alert" className="mb-4 text-sm text-danger-text">
              {erro}
            </p>
          )}
          <button type="submit" disabled={login.isPending || !nome || !senha} className="se-button w-full text-center">
            {login.isPending ? 'Entrando…' : 'Entrar'}
          </button>
        </div>
      </form>
    </div>
  )
}
