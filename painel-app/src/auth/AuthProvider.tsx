import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { type Admin, erroDeSessao, gravarAdmin, lerAdmin, limparAdmin } from './session'

interface AuthContextValue {
  admin: Admin | null
  entrar: (admin: Admin) => void
  sair: () => void
  /** Chamar com o campo `erro` de qualquer resposta de RPC — desloga sozinho se for sessão inválida. */
  tratarErroRpc: (erro: string | undefined | null) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(() => lerAdmin())

  const entrar = useCallback((novoAdmin: Admin) => {
    gravarAdmin(novoAdmin)
    setAdmin(novoAdmin)
  }, [])

  const sair = useCallback(() => {
    limparAdmin()
    setAdmin(null)
  }, [])

  const tratarErroRpc = useCallback(
    (erro: string | undefined | null) => {
      if (erroDeSessao(erro)) sair()
    },
    [sair],
  )

  return <AuthContext.Provider value={{ admin, entrar, sair, tratarErroRpc }}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth() precisa estar dentro de <AuthProvider>.')
  return ctx
}
