/* Carga da produção: lê as memórias de cálculo (abas MC_PAC / MC_REC / MC_TEL) no navegador e devolve
   uma lista de "folhas" prontas para gravar no Supabase. É o mesmo critério de FormulariosMedicao/_carga_supabase/importar_mc.py.
   Nada sai do computador aqui: o envio é feito pelo painel, com a sessão do administrador. */
(function (global) {
  'use strict';
  const ABAS = { MC_PAC: ['PAC', 'm2'], MC_REC: ['REC', 'kg'], MC_TEL: ['TEL', 'kg'] };
  const CONTRATOS = { TELHADO: '5900111362', ROTINA: '5900108690', GALPAO: '5900111078' };
  const PASTA_FORA = new Set(['TELHADO']); // outro layout/etapas: fora até o mapeamento ser definido

  const norm = v => String(v ?? '').normalize('NFKD').replace(/[^\x00-\x7f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  const num = v => (typeof v === 'number' && Number.isFinite(v)) ? v : null;
  const txt = v => { if (v == null) return null; const s = String(v).trim(); return s && s !== '-' ? s : null; };

  // número de série do Excel -> 'AAAA-MM-DD' (só para células formatadas como data)
  function serialParaIso(serial) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(serial + 1e-9) * 86400000);
    return d.toISOString().slice(0, 10);
  }

  /* Acesso às células (linha/coluna a partir de 1, como no openpyxl). */
  function folhaDe(ws) {
    const ref = ws['!ref'] ? XLSX.utils.decode_range(ws['!ref']) : { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };
    const maxRow = ref.e.r + 1, maxCol = ref.e.c + 1;
    const cel = (r, c) => {
      const x = ws[XLSX.utils.encode_cell({ r: r - 1, c: c - 1 })];
      if (!x) return { v: null, d: null };
      if (x.t === 'e') return { v: x.w || '#ERRO', d: null };
      const v = x.v === undefined ? null : x.v;
      const ehData = x.t === 'n' && typeof v === 'number' && x.z && XLSX.SSF.is_date(x.z);
      return { v, d: ehData ? serialParaIso(v) : null };
    };
    return { cel, maxRow, maxCol };
  }

  function depoisDoRotulo(F, rotulo, linhas = [1, 2, 3, 4, 5, 6, 7, 8]) {
    const alvo = norm(rotulo);
    for (const r of linhas) {
      for (let c = 1; c <= F.maxCol; c++) {
        if (norm(F.cel(r, c).v).replace(/:+$/, '') === alvo) {
          for (let k = c + 1; k < Math.min(c + 6, F.maxCol + 1); k++) {
            const x = F.cel(r, k);
            if (x.v !== null && x.v !== '') return x;
          }
        }
      }
    }
    return { v: null, d: null };
  }

  function mapearColunas(F) {
    const cab = new Map();
    for (let c = 1; c <= F.maxCol; c++) { const v = F.cel(9, c).v; if (v !== null && v !== '') cab.set(c, norm(v)); }
    const m = {}, usados = new Set();
    const pega = (chave, teste) => {
      for (const [c, h] of cab) if (!usados.has(c) && teste(h)) { m[chave] = c; usados.add(c); return; }
    };
    pega('item', h => h === 'item');
    pega('subitem', h => h === 'subitem');
    pega('ref_projeto', h => h.startsWith('referencia projeto'));
    pega('om', h => h.startsWith('ordem de manutencao'));
    pega('centro_custo', h => h.startsWith('centro de custo'));
    pega('area', h => h.startsWith('area de referencia') && !h.endsWith('2'));
    pega('area2', h => h.startsWith('area de referencia2'));
    pega('descricao', h => h.startsWith('descricao'));
    pega('larg', h => h.startsWith('larg'));
    pega('comp', h => h.startsWith('comp'));
    pega('qtd', h => h.startsWith('quantidade'));
    pega('lados', h => h.startsWith('lados'));
    pega('criterio', h => h.startsWith('criterio'));
    pega('peso_unit', h => h.startsWith('kg/'));
    pega('prev', h => h.startsWith('prev') || h === 'total kg');
    pega('exec_pct', h => h.startsWith('exec') && h.includes('(%)'));
    pega('exec_qtd', h => h.startsWith('exec') && !h.includes('(%)'));
    pega('obs', h => h.startsWith('observ'));
    let colData = null;
    for (const [c, h] of cab) if (h === 'data') { colData = c; break; }
    return { m, cab, colData };
  }

  function lerAba(F) {
    const { m, cab, colData } = mapearColunas(F);
    if (!('descricao' in m)) return null;
    const obs = m.obs || 0, limite = colData || 1e6;
    const colEtapas = [...cab.keys()].filter(c => obs < c && c < limite);
    const colMarca = colData && !cab.has(colData - 1) ? colData - 1 : null;
    const rotulo9 = c => String(F.cel(9, c).v).trim();
    const itens = [];
    for (let r = 10; r <= F.maxRow; r++) {
      const desc = F.cel(r, m.descricao).v;
      if (desc === null || desc === '' || desc === 0) continue;
      const g = k => (k in m ? F.cel(r, m[k]).v : null);
      const etapas = {};
      for (const c of colEtapas) { const d = F.cel(r, c).d; if (d) etapas[rotulo9(c)] = d; }
      itens.push({
        linha: r, item: txt(g('item')), subitem: txt(g('subitem')), ref_projeto: txt(g('ref_projeto')),
        om: txt(g('om')), centro_custo: txt(g('centro_custo')), area: txt(g('area')), area2: txt(g('area2')),
        descricao: txt(desc), larg: num(g('larg')), comp: num(g('comp')), qtd: num(g('qtd')), lados: num(g('lados')),
        criterio: num(g('criterio')), peso_unit: num(g('peso_unit')), prev: num(g('prev')),
        exec_pct: num(g('exec_pct')), exec_qtd: num(g('exec_qtd')), obs: txt(g('obs')), etapas,
        marca: colMarca ? txt(F.cel(r, colMarca).v) : null
      });
    }
    const diario = [];
    if (colData) {
      const etq = [];
      for (let c = colData + 1; c <= F.maxCol; c++) { const v = F.cel(9, c).v; if (v !== null && v !== '' && v !== 0 && v !== false) etq.push([c, rotulo9(c)]); }
      for (let r = 10; r <= F.maxRow; r++) {
        const d = F.cel(r, colData).d;
        if (!d) continue;
        for (const [c, e] of etq) { const v = num(F.cel(r, c).v); if (v) diario.push({ data: d, etapa: e, valor: v }); }
      }
    }
    return { itens, diario };
  }

  async function sha1De(buf) {
    if (!global.crypto?.subtle) return null;
    const h = await crypto.subtle.digest('SHA-1', buf);
    return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
  }

  const arred6 = x => Math.round(x * 1e6) / 1e6;

  /* Lê um arquivo e devolve as folhas (uma por aba válida). `vistos` evita gravar duas cópias iguais. */
  async function lerArquivo(file, caminho, vistos) {
    const nome = file.name, buf = await file.arrayBuffer(), sha = await sha1De(buf);
    const wb = XLSX.read(buf, { type: 'array', sheets: Object.keys(ABAS), cellNF: true, cellDates: false, cellText: false });
    const folhas = [], ignoradas = [];
    for (const [aba, [disc, unid]] of Object.entries(ABAS)) {
      const ws = wb.Sheets[aba];
      if (!ws) continue;
      const F = folhaDe(ws), chave = `${nome}|${aba}`;
      const lido = lerAba(F);
      if (!lido || !lido.itens.length) continue;
      let { itens, diario } = lido;
      const contrato = txt(depoisDoRotulo(F, 'Contrato').v), ativo = txt(depoisDoRotulo(F, 'Ativo').v);
      if (!contrato || !ativo) { ignoradas.push({ chave, motivo: 'aba sem contrato/ativo (modelo vazio)' }); continue; }
      let ini = depoisDoRotulo(F, 'Início').d, fim = depoisDoRotulo(F, 'Término').d;
      const avisos = [];
      if (ini && fim && ini > fim) { [ini, fim] = [fim, ini]; avisos.push('período invertido na planilha — datas trocadas'); }
      const valores = new Set(diario.map(x => arred6(x.valor)));
      if (new Set(diario.map(x => x.data)).size >= 5 && valores.size <= 2) {
        avisos.push(`tabela diária ignorada: valor repetido todos os dias (${[...valores].join(', ')}), parece acumulado e não produção do dia`);
        diario = [];
      }
      const digest = JSON.stringify(itens.map(i => [i.area, i.descricao, i.larg, i.comp, i.qtd, i.exec_qtd]));
      const dupKey = [ativo, disc, ini, fim, digest].join('\u0001');
      if (vistos.has(dupKey)) { ignoradas.push({ chave, motivo: `conteúdo idêntico a ${vistos.get(dupKey)} (mesmo ativo/período) — ignorada para não duplicar`, duplicada: true }); continue; }
      vistos.set(dupKey, chave);
      folhas.push({
        chave, arquivo: nome, caminho, aba, sha1: sha, disciplina: disc, unidade: unid, contrato,
        contrato_codigo: CONTRATOS[norm(contrato).toUpperCase()] || null, ativo, periodo_ini: ini, periodo_fim: fim,
        data_elaboracao: depoisDoRotulo(F, 'Data Elaboração').d, delineador: txt(depoisDoRotulo(F, 'Delineador').v),
        itens, diario, avisos
      });
    }
    return { folhas, ignoradas };
  }

  /* files: FileList/array de File (de <input webkitdirectory>); onProgresso({i, n, nome}) */
  async function lerPasta(files, onProgresso) {
    const todos = [...files].map(f => ({ f, caminho: (f.webkitRelativePath || f.name).replace(/\\/g, '/') }));
    const validos = [], fora = [];
    for (const x of todos) {
      const partes = x.caminho.split('/'), nome = partes.at(-1);
      if (!/\.(xlsx|xlsm)$/i.test(nome) || nome.startsWith('~$')) continue;
      if (partes.slice(0, -1).some(p => PASTA_FORA.has(p.toUpperCase()))) { fora.push(x.caminho); continue; }
      validos.push(x);
    }
    validos.sort((a, b) => (a.caminho < b.caminho ? -1 : a.caminho > b.caminho ? 1 : 0));
    const vistos = new Map(), folhas = [], ignoradas = [], erros = [];
    for (let i = 0; i < validos.length; i++) {
      const { f, caminho } = validos[i];
      onProgresso && onProgresso({ i: i + 1, n: validos.length, nome: f.name });
      try {
        const r = await lerArquivo(f, caminho, vistos);
        folhas.push(...r.folhas); ignoradas.push(...r.ignoradas);
      } catch (e) { erros.push({ arquivo: f.name, erro: String(e?.message || e) }); }
      await new Promise(r => setTimeout(r)); // devolve o controle ao navegador entre arquivos
    }
    return { folhas, ignoradas, erros, foraTelhado: fora, lidos: validos.length };
  }

  global.PainelCarga = { lerPasta, lerArquivo, norm, serialParaIso };
})(window);
