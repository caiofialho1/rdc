# Painel de Controle — painel-app

Fonte do `painel.html` publicado na raiz do repositório. Projeto isolado (Vite + React + TypeScript + Tailwind), com build próprio — o resto do repositório (`index.html`, o app de campo) continua sem build, intocado.

Consome só as RPCs já existentes do Supabase (ver `../docs/DATABASE_AUDIT.md`); não há schema, migração ou chave nova. Nenhuma credencial real fica aqui — `.env` (não versionado) guarda a chave anônima/publicável, a mesma que já está hardcoded em `painel.html`/`index.html`.

## Desenvolvimento

```bash
npm install
cp .env.example .env   # preencher VITE_SB_ANON_KEY com a chave publicável do projeto Supabase
npm run dev             # abre em http://localhost:5173/assets/painel/
```

## Testes

```bash
npm run test:unit        # Vitest — lógica de domínio e schemas, sem rede
npm run build             # necessário antes do E2E (ele serve o build via `vite preview`)
npm run test:e2e          # Playwright — mocka as RPCs via page.route, não toca o Supabase real
```

## Publicar (atualizar o `painel.html` da raiz)

```bash
npm run publish
```

Isso builda e copia `dist/index.html` → `../painel.html` e os demais arquivos → `../assets/painel/`. O build usa caminhos **relativos** (`./assets/painel/...`), então o painel funciona tanto na raiz do domínio (Netlify) quanto em subcaminho (GitHub Pages, `caiofialho1.github.io/rdc/`); o script aborta se sobrar algum caminho absoluto `/...` no `painel.html`. O link/QR code que já aponta para `painel.html` continua funcionando — só o conteúdo muda. Depois de publicar, o deploy segue igual ao de sempre (arrastar a raiz do repo pro Netlify/GitHub Pages/Cloudflare Pages).

## Design

Paleta e componentes seguem o padrão **Executive Industrial RDC** (`src/styles/design-tokens.css`), gerado no Google Stitch (projeto "Painel Produção e Obras") e alinhado à paleta 3.1 do `AGENTS.md`: carbono `#1E2229`, âmbar `#A68A52`, fundo `#F7F7F5`, bordas `#E5E5E5`, cards com raio 6 px e controles com 4 px. Substituiu a antiga Slate Executive mantendo os mesmos nomes de token. Toda cor/raio/fonte do app deriva desse arquivo — nunca hexadecimal solto num componente. `src/styles/index.css` só espelha os mesmos valores no namespace `--color-*`/`--font-*`/`--radius-*` que o Tailwind exige para gerar utilitários (`bg-surface`, `text-text-secondary`, `rounded-card` etc.); qualquer mudança de paleta precisa ser feita nos dois arquivos. Gráficos (ECharts) leem os tokens em tempo de execução via `src/styles/cssVar.ts`, nunca com cor fixa. O chip de estado (`components/ui/Badge.tsx` + `domain/badges.ts`) é o elemento de identidade visual do painel — todo status de RDC e toda situação de reconciliação produção×RDC passam por ele (fundo claro + texto escuro + contorno 1 px), nunca por cor isolada.

## Estrutura

- `src/api/` — cliente RPC (porta do `rpc()` de painel.html), schemas Zod, hooks React Query.
- `src/auth/` — sessão do administrador (sessionStorage, mesmo contrato de hoje).
- `src/domain/` — fórmulas e lógica pura (HH, ciclo de medição, reconciliação de produção, parser de XLSX), cobertas por `tests/unit/`.
- `src/screens/` — as 5 telas (Contexto, Desempenho, Comparação, Desvios, Detalhamento) — ver `../docs/INFORMATION_ARCHITECTURE.md`.
- `src/components/` — `CargaProducao` (fluxo de escrita existente) e componentes de UI/gráfico.

## Limitações conhecidas desta primeira entrega

- Sem code-splitting do ECharts (bundle único ~1,2 MB) — aceitável para uma ferramenta interna, mas pode ser otimizado depois.
- Calendário de emissão diária é uma versão simplificada (sem marcação de ciclo 21→20 na régua superior).
