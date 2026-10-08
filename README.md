# RDC Mobile — Relatório Diário de Campo

App web em um único arquivo (`index.html`) para o pessoal de campo lançar o RDC diário pelo celular, **sem login**.
Os dados vão para um banco Supabase (Postgres + fotos), que o Planejamento consulta pelo painel ou pelo Power BI.

```
1. RDC_MOBILE/
├── index.html                          ← o app (é o único arquivo publicado)
├── supabase/schema.sql                 ← cria banco, segurança, fotos e views
├── powerautomate/gatilho_http_schema.json  ← só para a alternativa SharePoint/Power Automate
└── README.md
```

## O que o app faz

- **Identificação:** Responsável, Data, Ativo e OM (todos obrigatórios).
- **Atividades (uma ou mais por RDC):**
  - Disciplina: PAC · REC · TEL/COB · ANDAIME.
  - O Serviço muda conforme a disciplina escolhida.
  - **Tipo de andaime** (Apoiado/Suspenso/Balanço): aparece só em Montagem ou Desmontagem de Andaime.
  - **OUTROS:** pede a descrição do serviço.
  - Horário de início e de fim (obrigatórios), com a duração calculada. Se o fim for antes do início, o app entende que o serviço virou o dia.
  - Observação e **fotos** (pelo menos 1 por atividade). As fotos são reduzidas para 1600 px e recebem carimbo com data, hora, Ativo e OM.
- **Registro de impactos** (opcional, pode ter vários): descrição, início e fim.
- **Revisão:** caixa “Confirmo que as informações estão corretas” antes do envio.
- **Consulta de RDC emitidos (todos):** botão “Consultar RDC emitidos” na tela inicial. Busca por OM, ativo, responsável ou código e filtro por situação. O detalhe mostra atividades, efetivo, impactos e fotos, **somente leitura**.
- **Validação (só o administrador):** no detalhe do RDC, o administrador escolhe **Validar (sem revisão)** ou **Liberar para revisão** (motivo obrigatório).
  - Situações: *Aguardando validação* → *Validado* ou *Revisão liberada*.
  - Com a revisão liberada, aparece o botão **Revisar este RDC**, que abre o RDC (com fotos) no formulário. Ao enviar, a nova versão substitui a anterior (que fica como *Substituído*, só no histórico) e volta para *Aguardando validação*.
  - Sem a liberação, o banco recusa qualquer revisão.
- **Cancelar ou apagar (só o administrador):**
  - **Cancelar RDC** (motivo obrigatório): o RDC fica no histórico como *Cancelado* e sai das views do Power BI. Pode ser reativado com “Reativar e validar” ou “Liberar para revisão”.
  - **Apagar definitivamente** (pede um segundo toque): remove do banco o RDC, as versões anteriores dele e as fotos. Uma cópia dos dados fica na tabela `rdc_exclusoes`, visível só pelo painel do Supabase.
- **Configurações (⚙) só para o administrador:** pede nome e senha, conferidos no banco. A sessão vale até fechar a aba.
- **Modo definido pelo administrador para todos os aparelhos:** em ⚙, o administrador escolhe Supabase, SharePoint ou Power Automate e toca em **Salvar para todos os aparelhos**. Cada aparelho aplica a mudança ao abrir o app (ou na hora, se estiver na tela inicial). “Salvar só neste aparelho” continua existindo para testes.
  - Consulta, validação, revisão, cancelar e apagar só funcionam no modo **Supabase**. No SharePoint, o app só lança e envia RDC, e cada pessoa entra com a conta Microsoft 365.
- **Funciona sem sinal:** o rascunho é salvo no aparelho o tempo todo. Se o envio falhar, o RDC fica numa fila e é reenviado automaticamente quando a conexão voltar, sem duplicar.

---

## Implantação imediata (Supabase) — cerca de 1 hora

### 1. Criar o projeto (5 min)
1. Acesse **supabase.com** e crie uma conta. Use um e-mail da área, de preferência compartilhado, para não depender de uma pessoa só.
2. **New project**:
   - Nome: `rdc-pelotizacao`.
   - Senha do banco: gere uma senha forte e guarde-a.
   - Região: **South America (São Paulo)**.

### 2. Criar a estrutura (2 min)
1. No projeto, abra **SQL Editor → New query**.
2. Cole todo o conteúdo de `supabase/schema.sql` e clique em **Run**. A mensagem esperada é *Success. No rows returned*.

O script cria:

| Objeto | Conteúdo |
|---|---|
| `rdc_cabecalho` | codigo, responsavel, data_rdc, ativo, om, status, enviado_por, quantidades, recebido_em |
| `rdc_atividades` | codigo, rdc_codigo, ordem, disciplina, servico, tipo_andaime, descricao_outros, observacao, inicio, fim, duracao_min |
| `rdc_impactos` | codigo, rdc_codigo, ordem, descricao, inicio, fim, duracao_min |
| `rdc_fotos` | codigo, rdc_codigo, atividade_codigo, nome_arquivo, caminho |
| Bucket `rdc-evidencias` | fotos em `AAAA-MM/{RDC}/{RDC}-A01-F01.jpg` (privado) |
| `vw_rdc_atividades`, `vw_rdc_impactos`, `vw_rdc_resumo` | visões prontas para consulta e Power BI, em horário local |

**Segurança:** a chave usada pelo app consegue **enviar** RDC e fotos e **consultar** os RDC emitidos (somente leitura, pelas funções `rdc_listar`/`rdc_detalhe`). Ela não altera nem apaga nada. Validar, liberar revisão, cancelar (`rdc_validar`) ou apagar (`rdc_apagar`) exige nome e senha de administrador, conferidos no banco. O app só consegue apagar fotos de RDC que o administrador apagou. **Quem tiver o link consegue ver os RDC e as fotos**: não divulgue o link fora da equipe.

### 2b. Atualizar um banco já existente (v4) e cadastrar o administrador
1. Se o banco já estava em uso, rode `supabase/migracao_v4_admin_validacao.sql` no SQL Editor (instalação nova: o `schema.sql` já inclui tudo).
2. Cadastre cada administrador **no SQL Editor** (nunca pelo app):
   ```sql
   select public.rdc_admin_definir('Caio Fialho', 'uma-senha-forte');
   ```
   - Rodar de novo com o mesmo nome troca a senha.
   - 5 senhas erradas seguidas bloqueiam aquele administrador por 15 minutos.
   - Para desativar: `update public.rdc_admins set ativo = false where nome = 'Caio Fialho';`
3. Para cancelar/apagar, rode também `supabase/migracao_v5_cancelar_apagar.sql`; para o modo definido pelo administrador, `supabase/migracao_v6_config_global.sql`.
4. As views para o Power BI agora deixam de fora as versões *Substituído* (sem horas em dobro) e trazem a coluna `status`.

### 3. Configurar o app (2 min)
1. No Supabase, abra **Project Settings → API Keys** e copie a **Publishable key** (`sb_publishable_…`). Se o projeto mostrar só as chaves antigas, use a **anon public**.
2. Copie também a **Project URL** (`https://xxxx.supabase.co`), que fica em *Project Settings → Data API*.
3. No `index.html`, preencha:
   ```js
   const CONFIG = {
     mode: 'supabase',
     supabaseUrl: 'https://xxxx.supabase.co',
     supabaseKey: 'sb_publishable_xxxxxxxx',
     ...
   ```

> ⚠️ **Nunca** coloque a chave `secret` / `service_role` no app. Ela dá acesso total ao banco.

### 4. Publicar (10 min)
**Netlify** é o caminho mais simples:
1. Crie uma pasta nova contendo **apenas** o `index.html`.
2. Acesse **app.netlify.com/drop**, entre com uma conta gratuita e arraste a pasta.
3. O site sai no ar com um endereço HTTPS. Em *Site configuration → Change site name*, dá para trocar o nome, por exemplo `rdc-pelotizacao.netlify.app`.
4. Para atualizar o app depois, use **Deploys → arrastar a pasta de novo**.

Alternativas: GitHub Pages e Cloudflare Pages, ambos gratuitos.

### 5. Testar e distribuir
1. Abra o link no celular, toque em **⚙** (entre como administrador) **→ Testar conexão**. O resultado esperado é “✓ Pronto para receber RDC”.
2. Faça um RDC de teste completo e confira se ele aparece no Supabase em **Table Editor → rdc_cabecalho**.
3. Envie o link ou um QR code para as equipes. No celular, “Adicionar à tela inicial” faz o app abrir como se fosse instalado.

---

## Atualização v8: PTS, bloqueio, GPS e painel de controle

1. Rode `supabase/migracao_v8_pts_gps_painel.sql` no SQL Editor **antes** de publicar o `index.html` novo.
2. Se a cópia para o SharePoint estiver ligada, publique de novo a Edge Function `sync-sharepoint` (conteúdo atualizado). Ela cria sozinha as colunas novas (`Contrato`, `ContratoNome`, `Pts`, `PtsSolicitacao`, `PtsAbertura`, `Bloqueio`, `BloqueioAtivo`, `BloqueioHora`, `Latitude`, `Longitude`, `PrecisaoM`, `GpsFonte`). Se a permissão do aplicativo não deixar criar colunas, a cópia continua sem esses campos.
3. Se usar o Power BI com `powerbi_leitura`: `grant select on public.vw_rdc_fotos, public.vw_rdc_metricas to powerbi_leitura;`

O que muda no app:
- **Contrato** obrigatório na Identificação: TELHADO (5900111362), ROTINA (5900108690) ou GALPÃO (5900111078). O aparelho lembra o último usado. A lista pode ser agrupada por contrato e o painel filtra por ele. Para mudar os contratos, edite `CONTRATOS` no `index.html` e no `painel.html`. RDC antigos ficam "sem contrato".
- A tela inicial mostra os **RDC emitidos** (busca, situação e **agrupar por** data, responsável, área, ativo, OM ou situação).
- O preenchimento é feito em **4 etapas** (Identificação → PTS e bloqueio → Atividades → Impactos). Cada etapa é conferida antes de avançar.
- **PTS** (sim/não, horário de solicitação e de abertura, com a espera calculada) e **bloqueio** (sim/não, ativo e horário) são obrigatórios.
- Cada foto grava a **localização GPS**: a do próprio arquivo (EXIF) ou a do aparelho, só quando a foto acabou de ser tirada. As coordenadas também são carimbadas na foto. O app pede a permissão de localização ao abrir o formulário.
- As fotos abrem num **carrossel** (setas, deslizar o dedo, miniaturas e link para o mapa).
- A tela **Responsáveis · HH e impacto** mostra quem emitiu ou não RDC no período, o HH trabalhado e o HH de impacto.

**HH de impacto** = duração do impacto × maior efetivo entre as atividades do RDC (a equipe que ficou parada).

## Edição de RDC pelo administrador (v9)

Rode `supabase/migracao_v9_admin_editar.sql`. Ela pode rodar de novo sem problema. No detalhe do RDC (app, como administrador) há dois botões:
- **Editar dados**: contrato, responsável, data, área/ativo, OM, PTS e bloqueio, alterados no próprio RDC (mesmo código e situação). Mudar a data move junto os horários das atividades, impactos, PTS e bloqueio.
- **Editar tudo**: abre o RDC no formulário (atividades, fotos, impactos). Ao enviar, grava uma nova versão no lugar da atual e **mantém a situação** (validado continua validado; não precisa liberar revisão).

No painel: **Editar dados** no detalhe e **definir o contrato de vários RDC de uma vez** (marque as caixas na tabela de RDC; filtro *Contrato → Sem contrato* para achar os antigos).

Toda edição fica na tabela `rdc_edicoes` (quem, quando, motivo, valor antes e depois), e o RDC mostra "Editado por … em …". A cópia para o SharePoint atualiza também as atividades e os impactos já copiados (publique de novo a Edge Function).

## Painel de controle (administradores)

`painel.html`, publicado junto com o app (ex.: `https://<seu-site>/painel.html`). Use o mesmo nome e senha de administrador do app; sem eles, nenhum dado é carregado. O painel tem:
- filtros de período, área, responsável, disciplina, situação e busca;
- indicadores (HH trabalhado, RDC, HH e horas de impacto, espera média da PTS, bloqueios);
- gráficos: HH por dia ou mês, por disciplina e impacto por responsável;
- emissão por responsável × dia, resumo por responsável e lista de impactos;
- tabela de RDC com detalhe, fotos, localização e validação (validar, liberar revisão, cancelar);
- **Exportar Excel** com 4 abas (RDC, Atividades, Impactos, Fotos com link do mapa). Se a biblioteca do Excel não carregar, baixa CSV.

## Consultar os dados

- **Painel do Supabase:**
  - *Table Editor*: veja as tabelas ou as views `vw_rdc_resumo`, `vw_rdc_atividades` e `vw_rdc_impactos`, e use **Export → CSV**.
  - *Storage → rdc-evidencias*: fotos organizadas por mês e por RDC.
- Para mais pessoas consultarem pelo painel, convide-as em **Organization → Team**.

### Power BI
1. No `schema.sql`, seção **5 (opcional)**: troque a senha, tire os `--` do início das linhas e execute só esse bloco no SQL Editor. Isso cria o usuário somente leitura `powerbi_leitura`.
2. No Supabase, clique em **Connect** (no topo) e copie os dados do **Session pooler**: host (ex.: `aws-0-sa-east-1.pooler.supabase.com`) e porta `5432`.
3. No Power BI Desktop, use **Obter dados → Banco de dados PostgreSQL**:
   - Servidor: `host:5432`.
   - Banco: `postgres`.
   - Usuário: `powerbi_leitura.<ref-do-projeto>`. O *ref* é o trecho `xxxx` da URL do projeto.
   - Senha: a que você definiu no passo 1.
4. Importe as views `vw_rdc_resumo`, `vw_rdc_atividades` e `vw_rdc_impactos`. Elas já trazem:
   - horas produtivas (`horas` das atividades);
   - horas impactadas (`horas` dos impactos);
   - recortes por OM, Ativo, Disciplina, Serviço, Responsável e data.

> A atualização automática no Power BI Service pode exigir configurar credenciais ou um gateway. Teste após publicar o relatório.

---

## Limites do plano gratuito do Supabase

| Recurso | Limite | Na prática |
|---|---|---|
| Fotos (Storage) | 1 GB | ~3 mil fotos (~300 KB cada), ou 3 a 4 meses com ~30 fotos por dia |
| Banco | 500 MB | Anos de RDC em texto |
| Inatividade | Projeto pausa após 7 dias sem uso | Com uso diário não acontece |

Quando as fotos chegarem perto do limite, há duas saídas: o plano **Pro** (US$ 25/mês, 100 GB) ou baixar e arquivar as fotos antigas.

## Personalizações (no `index.html`)

- **Áreas e ativos (TAGs):** listas `AREAS` e `TAGS`, que vieram do app antigo. A área de cada TAG é lida do próprio código (4 caracteres a partir da 4ª posição), então um TAG novo entra sozinho na área certa.
- **Disciplinas e serviços:** objeto `DISCIPLINAS`.
- **Tipos de andaime:** `TIPOS_ANDAIME`.
- **Fotos obrigatórias por atividade, tamanho e qualidade:** `CONFIG.foto`.

Ao criar uma **nova disciplina** ou um **novo tipo de andaime**, atualize também as regras (`check`) das colunas `disciplina` e `tipo_andaime` em `rdc_atividades`. Novos serviços não exigem mudança no banco.

## Testar no computador

```bash
python -m http.server 8765 --bind 127.0.0.1
# abrir http://127.0.0.1:8765/index.html
```

Para treinar sem gravar no banco, use **⚙ → Modo: Demonstração** (exige administrador). Essa configuração vale só para aquele aparelho.

---

## Cópia automática para o SharePoint (recomendado, sem login)

O app continua no modo **Supabase** (todas as funções, sem login). Cada RDC criado, validado, revisado, cancelado ou apagado é copiado para as listas `RDC_Cabecalho`, `RDC_Atividades`, `RDC_Impactos`, `RDC_Fotos` e para a biblioteca `RDC_Evidencias`. A cópia é feita pela Edge Function `supabase/functions/sync-sharepoint`, com credencial de aplicativo. Falha na cópia nunca impede o envio do RDC: ela é repetida a cada 5 minutos.

**1. Registro de app no Entra ID (feito pelo TI / administrador do tenant)**
1. *Entra ID → Registros de aplicativo → Novo registro* (ex.: `RDC Sync SharePoint`). Anote **ID do aplicativo (cliente)** e **ID do diretório (locatário)**.
2. *Certificados e segredos → Novo segredo do cliente*. Copie o **valor** (só aparece uma vez).
3. *Permissões de API → Microsoft Graph → Permissões de aplicativo*:
   - recomendado: **Sites.Selected**, com consentimento do administrador, e depois liberar **escrita** só no site `pelotizacaoslz`. Exemplo pelo Graph Explorer, com um administrador:
     `POST https://graph.microsoft.com/v1.0/sites/{id-do-site}/permissions`
     `{"roles":["write"],"grantedToIdentities":[{"application":{"id":"<ID do aplicativo>","displayName":"RDC Sync SharePoint"}}]}`
   - alternativa mais simples (acesso a todos os sites): **Sites.ReadWrite.All**, com consentimento do administrador.

**2. Listas no SharePoint**
As listas precisam existir com as colunas atuais. Uma vez só, num computador: ⚙ → modo **SharePoint** → **Salvar só neste aparelho** → entre com uma conta proprietária do site → **Criar / revisar listas e biblioteca no site** → depois **Tirar a configuração própria deste aparelho**.

**3. Banco**
Rode `supabase/migracao_v7_sync_sharepoint.sql` no SQL Editor.

**4. Edge Function**
1. Supabase → *Edge Functions → Deploy a new function → Via Editor*. Nome: `sync-sharepoint`. Cole o conteúdo de `supabase/functions/sync-sharepoint/index.ts` e publique.
2. Nos detalhes da função, **desligue “Verify JWT”** (a função confere o cabeçalho `x-rdc-sync`).
3. *Edge Functions → Secrets*: crie `MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `SP_SITE_URL` (`https://caiofialho.sharepoint.com/sites/pelotizacaoslz`) e `RDC_SYNC_SEGREDO` (um texto aleatório longo).

**5. Ligar a chamada automática** (SQL Editor; o segredo é o mesmo `RDC_SYNC_SEGREDO`):
```sql
select vault.create_secret('https://ltuzzgdapgfbtxaxigek.supabase.co/functions/v1/sync-sharepoint', 'rdc_sync_url');
select vault.create_secret('o-mesmo-texto-do-RDC_SYNC_SEGREDO', 'rdc_sync_segredo');
```

**6. Carga inicial e acompanhamento**
No app, ⚙ (administrador) → **Sincronização SharePoint** → **Copiar todos os RDC (carga inicial)**. O mesmo painel mostra quantos RDC já estão no SharePoint, a fila, os erros e o último erro.

## Alternativas: SharePoint direto do app (exige login de cada usuário)

O mesmo app grava em listas do SharePoint. Basta trocar `mode` no `CONFIG`:

| Modo | Login | Requisitos |
|---|---|---|
| `graph` | Conta M365 da empresa | Registro de app no Entra ID pelo TI e permissão de edição no site |
| `flow` | Sem login | Fluxo Power Automate com gatilho HTTP (conector **Premium**) |

**`graph`, passo a passo:**
1. Registre o app no Entra ID:
   - plataforma **SPA**, com redirect igual à URL do app;
   - permissões delegadas `User.Read`, `Sites.ReadWrite.All` e `Sites.Manage.All`, com consentimento do administrador.
2. Preencha `siteUrl`, `clientId` e `tenantId` no `CONFIG`.
3. Entre no app com uma conta proprietária do site e use **⚙ → Criar / revisar listas e biblioteca no site**. Em listas que já existem, o botão acrescenta as colunas e as opções de `Status` que faltam em relação ao Supabase (validação e revisão), sem apagar nada. Isso cria `RDC_Cabecalho`, `RDC_Atividades`, `RDC_Impactos`, `RDC_Fotos` e a biblioteca `RDC_Evidencias`.

**`flow`, passo a passo:**
1. Crie um fluxo com o gatilho “Quando uma solicitação HTTP for recebida”:
   - quem pode disparar: Qualquer pessoa;
   - esquema JSON: o conteúdo de `powerautomate/gatilho_http_schema.json`.
2. Dentro do fluxo:
   1. Criar item em `RDC_Cabecalho`.
   2. Aplicar a cada `atividades` → criar item em `RDC_Atividades`; fazer o mesmo para `impactos`.
   3. Aplicar a cada `fotos` → *Criar arquivo* com `base64ToBinary(ConteudoBase64)` e criar item em `RDC_Fotos`.
   4. Responder com status 200.
3. Cole a URL do gatilho em `flowUrl`.

Nos dois modos SharePoint, o `index.html` precisa estar hospedado em HTTPS. O SharePoint não exibe arquivos `.html`: ele faz o download.
