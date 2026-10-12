import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Build é copiado para a raiz do repo (painel.html + assets/painel/) pelo
// script de publish — ver package.json "publish". O build usa base relativa
// ('./'): o site é servido tanto na raiz (Netlify) quanto em subcaminho
// (GitHub Pages, /rdc/), então nenhum caminho pode começar com "/". Os
// assets resolvem relativos ao JS/CSS; o publish reescreve os caminhos do
// painel.html para ./assets/painel/. Dev e preview servem em /assets/painel/,
// onde o index.html do dist resolve os mesmos ./ corretamente.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? './' : '/assets/painel/',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    assetsDir: '',
  },
}))
