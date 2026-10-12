/**
 * Mesma estratégia do painel.html atual: sem JWT, sem token de sessão.
 * As credenciais do administrador ficam em sessionStorage (somem ao fechar
 * a aba) e são reenviadas como p_nome/p_senha em toda chamada de RPC. O
 * backend reconfirma a senha a cada chamada (_rdc_admin_verificar).
 */
const CHAVE = 'rdc-painel-admin'

export interface Admin {
  nome: string
  senha: string
}

export function lerAdmin(): Admin | null {
  try {
    const bruto = sessionStorage.getItem(CHAVE)
    if (!bruto) return null
    const valor = JSON.parse(bruto)
    if (typeof valor?.nome === 'string' && typeof valor?.senha === 'string') return valor
    return null
  } catch {
    return null
  }
}

export function gravarAdmin(admin: Admin): void {
  sessionStorage.setItem(CHAVE, JSON.stringify(admin))
}

export function limparAdmin(): void {
  sessionStorage.removeItem(CHAVE)
}

/** O backend sinaliza sessão inválida pelo texto do erro, não por um código — mesma regra do painel.html. */
export function erroDeSessao(mensagem: string | undefined | null): boolean {
  return /Sessão/.test(mensagem ?? '')
}
