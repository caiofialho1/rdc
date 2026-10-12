// Mesmo projeto Supabase do app de campo (index.html). A chave é a
// publicável/anônima — não é segredo; os dados só saem com login de
// administrador validado pelas RPCs (ver docs/DATABASE_AUDIT.md).
export const SB_URL = import.meta.env.VITE_SB_URL
export const SB_ANON_KEY = import.meta.env.VITE_SB_ANON_KEY
export const BUCKET = import.meta.env.VITE_SB_BUCKET ?? 'rdc-evidencias'

if (!SB_URL || !SB_ANON_KEY) {
  throw new Error('VITE_SB_URL/VITE_SB_ANON_KEY não configurados — copie .env.example para .env.')
}
