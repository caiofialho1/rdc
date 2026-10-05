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
3. Para cancelar/apagar, rode também `supabase/migracao_v5_cancelar_apagar.sql`.
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

## Alternativas: SharePoint (se o TI exigir os dados no Microsoft 365)

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
3. Entre no app com uma conta proprietária do site e use **⚙ → Criar listas e biblioteca no site**. Isso cria `RDC_Cabecalho`, `RDC_Atividades`, `RDC_Impactos`, `RDC_Fotos` e a biblioteca `RDC_Evidencias`.

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
