// Supabase Edge Function "sync-sharepoint"
// Copia os RDC do Supabase para o SharePoint (listas RDC_* e biblioteca RDC_Evidencias).
// Chamada pelo banco (gatilho + agendamento, ver supabase/migracao_v7_sync_sharepoint.sql); usuários não fazem login.
//
// Segredos (Supabase → Edge Functions → Secrets):
//   MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET  registro de app no Entra ID (permissão de APLICATIVO no site)
//   SP_SITE_URL                                    ex.: https://caiofialho.sharepoint.com/sites/pelotizacaoslz
//   RDC_SYNC_SEGREDO                               texto aleatório; o mesmo valor vai no Vault como 'rdc_sync_segredo'
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já vêm do próprio Supabase.
// Ao publicar, DESLIGUE "Verify JWT" (a autenticação é pelo cabeçalho x-rdc-sync).

import { createClient } from 'jsr:@supabase/supabase-js@2';

const env = (k: string) => {
  const v = Deno.env.get(k);
  if (!v) throw new Error(`Segredo ${k} não configurado`);
  return v;
};

const LISTAS = { cabecalho: 'RDC_Cabecalho', atividades: 'RDC_Atividades', impactos: 'RDC_Impactos', fotos: 'RDC_Fotos', biblioteca: 'RDC_Evidencias' };
const BUCKET = 'rdc-evidencias';
const TEMPO_MAX_MS = 100_000; // a função tem ~150 s; para antes e deixa o resto para a próxima chamada

const sb = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });

/* ---------- Microsoft Graph (credencial de aplicativo) ---------- */
let token: { v: string; exp: number } | null = null;
async function getToken(): Promise<string> {
  if (token && token.exp > Date.now() + 60_000) return token.v;
  const r = await fetch(`https://login.microsoftonline.com/${env('MS_TENANT_ID')}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env('MS_CLIENT_ID'), client_secret: env('MS_CLIENT_SECRET'),
      scope: 'https://graph.microsoft.com/.default', grant_type: 'client_credentials',
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`Entra ID: ${j.error_description || j.error || r.status}`);
  token = { v: j.access_token, exp: Date.now() + j.expires_in * 1000 };
  return token.v;
}

class GraphError extends Error { constructor(msg: string, public status: number) { super(msg); } }

async function graph(path: string, opts: { method?: string; body?: unknown; contentType?: string } = {}) {
  const { method = 'GET', body, contentType } = opts;
  const url = path.startsWith('http') ? path : 'https://graph.microsoft.com/v1.0' + path;
  const isBlob = body instanceof Blob;
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    const r = await fetch(url, {
      method,
      headers: {
        Authorization: 'Bearer ' + await getToken(),
        ...(body !== undefined ? { 'Content-Type': contentType || (isBlob ? (body as Blob).type : 'application/json') } : {}),
      },
      body: body === undefined ? undefined : isBlob ? (body as Blob) : JSON.stringify(body),
    });
    if (r.status === 429 || r.status === 503 || r.status === 504) {
      await new Promise(res => setTimeout(res, (Number(r.headers.get('Retry-After')) || 2 ** tentativa) * 1000));
      continue;
    }
    if (!r.ok) throw new GraphError(`Graph ${method} ${r.status}: ${(await r.text()).slice(0, 300)}`, r.status);
    return r.status === 204 ? null : r.json();
  }
  throw new Error('SharePoint ocupado (limite de tentativas)');
}

let siteIdCache = '', driveIdCache = '';
async function siteId() {
  if (!siteIdCache) {
    const u = new URL(env('SP_SITE_URL'));
    siteIdCache = (await graph(`/sites/${u.hostname}:${u.pathname.replace(/\/$/, '') || '/'}`)).id;
  }
  return siteIdCache;
}
async function driveId() {
  if (!driveIdCache) driveIdCache = (await graph(`/sites/${await siteId()}/lists/${encodeURIComponent(LISTAS.biblioteca)}/drive`)).id;
  return driveIdCache;
}
const itens = async (lista: string) => `/sites/${await siteId()}/lists/${encodeURIComponent(lista)}/items`;

// POST não aceita campo vazio de escolha/data: tira null e ''. PATCH mantém '' (limpa texto) e tira null.
const semVazios = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined && v !== ''));
const semNulos = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined));
const ignora404 = (e: unknown) => { if (!(e instanceof GraphError && e.status === 404)) throw e; };

/* ---------- mapa RDC → itens no SharePoint ---------- */
type ItemSP = { titulo: string; rdc_codigo: string; lista: string; item_id: string; drive_item_id?: string | null };
async function mapa(rdc: string) {
  const { data, error } = await sb.from('rdc_sp_itens').select('*').eq('rdc_codigo', rdc);
  if (error) throw error;
  return new Map((data as ItemSP[]).map(x => [x.titulo, x]));
}
async function guardar(x: ItemSP) {
  const { error } = await sb.from('rdc_sp_itens').upsert(x);
  if (error) throw error;
}

/* ---------- colunas: cria as das versões novas do app; campo sem coluna não trava a cópia ---------- */
const col = (name: string, tipo: Record<string, unknown>) => ({ name, ...tipo });
const COLUNAS_NOVAS: Record<string, Record<string, unknown>[]> = {
  [LISTAS.cabecalho]: [col('Pts', { boolean: {} }), col('PtsSolicitacao', { dateTime: { format: 'dateTime' } }),
    col('PtsAbertura', { dateTime: { format: 'dateTime' } }), col('Bloqueio', { boolean: {} }), col('BloqueioAtivo', { text: {} }),
    col('BloqueioHora', { dateTime: { format: 'dateTime' } }), col('Contrato', { text: {} }), col('ContratoNome', { text: {} })],
  [LISTAS.atividades]: [col('Contrato', { text: {} })],
  [LISTAS.impactos]: [col('Contrato', { text: {} })],
  [LISTAS.fotos]: [col('Latitude', { number: {} }), col('Longitude', { number: {} }), col('PrecisaoM', { number: {} }), col('GpsFonte', { text: {} })],
};
const colunasCache = new Map<string, Set<string>>();
async function colunas(lista: string) {
  let tem = colunasCache.get(lista);
  if (!tem) {
    const base = `/sites/${await siteId()}/lists/${encodeURIComponent(lista)}/columns`;
    const r = await graph(`${base}?$select=name&$top=500`);
    tem = new Set<string>((r.value || []).map((c: { name: string }) => c.name));
    for (const c of COLUNAS_NOVAS[lista] || []) {
      if (tem.has(c.name as string)) continue;
      try { await graph(base, { method: 'POST', body: c }); tem.add(c.name as string); }
      catch (e) { console.warn(`coluna ${lista}.${c.name} não criada: ${(e as Error).message}`); }
    }
    colunasCache.set(lista, tem);
  }
  return tem;
}
async function soColunas(lista: string, fields: Record<string, unknown>) {
  const tem = await colunas(lista);
  return Object.fromEntries(Object.entries(fields).filter(([k]) => k === 'Title' || tem.has(k)));
}

async function criarItem(rdc: string, lista: string, fields: Record<string, unknown>, extra: Partial<ItemSP> = {}) {
  const it = await graph(await itens(lista), { method: 'POST', body: { fields: semVazios(await soColunas(lista, fields)) } });
  await guardar({ titulo: String(fields.Title), rdc_codigo: rdc, lista, item_id: it.id, ...extra });
}

/* ---------- sincronização de um RDC: deixa o SharePoint igual ao banco ---------- */
async function sincronizar(codigo: string) {
  const { data: d, error } = await sb.rpc('rdc_para_sharepoint', { p_codigo: codigo });
  if (error) throw error;
  const m = await mapa(codigo);
  if (!d) return apagar(codigo, m);

  // cabeçalho: muda com validação, revisão e cancelamento
  const h = m.get(codigo);
  let atualizado = false;
  if (h) {
    try {
      await graph(`${await itens(LISTAS.cabecalho)}/${h.item_id}/fields`, { method: 'PATCH', body: semNulos(await soColunas(LISTAS.cabecalho, d.cabecalho)) });
      atualizado = true;
    } catch (e) { ignora404(e); } // apagado à mão no SharePoint: cria de novo
  }
  if (!atualizado) await criarItem(codigo, LISTAS.cabecalho, d.cabecalho);

  // atividades, impactos e fotos não mudam depois de enviados (a revisão gera um RDC novo)
  for (const a of d.atividades) if (!m.has(a.Title)) await criarItem(codigo, LISTAS.atividades, a);
  for (const x of d.impactos) if (!m.has(x.Title)) await criarItem(codigo, LISTAS.impactos, x);
  for (const f of d.fotos) {
    if (m.has(f.Title)) continue;
    const { data: blob, error: e } = await sb.storage.from(BUCKET).download(f.Caminho);
    if (e || !blob) throw new Error(`Foto ${f.Caminho}: ${e?.message || 'não encontrada'}`);
    const caminho = [codigo, f.Atividade_ID, f.NomeArquivo].map(encodeURIComponent).join('/');
    const arq = await graph(`/drives/${await driveId()}/root:/${caminho}:/content`, { method: 'PUT', body: blob, contentType: 'image/jpeg' });
    const { Caminho: _, ...campos } = f;
    await criarItem(codigo, LISTAS.fotos, { ...campos, URLArquivo: arq.webUrl }, { drive_item_id: arq.id });
  }
}

// RDC apagado no banco: remove itens das listas e a pasta de fotos
async function apagar(codigo: string, m: Map<string, ItemSP>) {
  for (const x of m.values()) {
    try { await graph(`${await itens(x.lista)}/${x.item_id}`, { method: 'DELETE' }); } catch (e) { ignora404(e); }
  }
  try { await graph(`/drives/${await driveId()}/root:/${encodeURIComponent(codigo)}`, { method: 'DELETE' }); } catch (e) { ignora404(e); }
  const { error } = await sb.from('rdc_sp_itens').delete().eq('rdc_codigo', codigo);
  if (error) throw error;
}

/* ---------- processamento da fila ---------- */
Deno.serve(async req => {
  if (req.headers.get('x-rdc-sync') !== env('RDC_SYNC_SEGREDO')) return new Response('não autorizado', { status: 401 });
  const fim = Date.now() + TEMPO_MAX_MS;
  let ok = 0, falhas = 0;
  while (Date.now() < fim) {
    const { data, error } = await sb.rpc('rdc_sync_pegar', { p_limite: 10 });
    if (error) return Response.json({ erro: error.message }, { status: 500 });
    const lote = (data || []) as { id: number; codigo: string }[];
    if (!lote.length) break;
    const porCodigo = new Map<string, number[]>();
    for (const x of lote) porCodigo.set(x.codigo, [...(porCodigo.get(x.codigo) || []), x.id]);
    for (const [codigo, ids] of porCodigo) {
      let erro: string | null = null;
      try { await sincronizar(codigo); ok++; } catch (e) { erro = String((e as Error).message || e); falhas++; console.error(codigo, erro); }
      for (const id of ids) await sb.rpc('rdc_sync_concluir', { p_id: id, p_erro: erro });
    }
  }
  return Response.json({ ok, falhas });
});
