// Copia o build (painel-app/dist) para a raiz do repo, preservando o caminho
// público painel.html (link/QR code já existente) e levando o resto dos
// arquivos com hash para assets/painel/. Roda depois de `vite build`.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const appDir = dirname(dirname(fileURLToPath(import.meta.url)))
const repoRoot = dirname(appDir)
const distDir = join(appDir, 'dist')
const assetsOut = join(repoRoot, 'assets', 'painel')

if (!existsSync(distDir)) {
  console.error('dist/ não existe — rode "npm run build" antes de publicar.')
  process.exit(1)
}

// O build usa base relativa ('./' — ver vite.config.ts); na raiz, os mesmos
// arquivos ficam em ./assets/painel/. Caminho relativo funciona na raiz do
// domínio (Netlify) e em subcaminho (GitHub Pages /rdc/).
const html = readFileSync(join(distDir, 'index.html'), 'utf8').replace(/(src|href)="\.\//g, '$1="./assets/painel/')
if (/(src|href)="\/(?!\/)/.test(html)) {
  console.error('painel.html ainda tem caminho absoluto ("/...") — quebraria no GitHub Pages. Publicação abortada.')
  process.exit(1)
}
writeFileSync(join(repoRoot, 'painel.html'), html)

rmSync(assetsOut, { recursive: true, force: true })
mkdirSync(assetsOut, { recursive: true })
for (const entry of readdirSync(distDir)) {
  if (entry === 'index.html') continue
  cpSync(join(distDir, entry), join(assetsOut, entry), { recursive: true })
}

console.log(`Publicado: painel.html (raiz) + assets/painel/ (${readdirSync(assetsOut).length} itens).`)
