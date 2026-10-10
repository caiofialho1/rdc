/* React island da seção de gráficos; ECharts renderiza em SVG. */
(function () {
  'use strict';
  const e = React.createElement;
  const nf = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
  const hh = minutos => nf.format(minutos / 60);
  const seguro = texto => String(texto).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const tokens = getComputedStyle(document.documentElement);
  const token = nome => tokens.getPropertyValue(nome).trim();
  const tema = {
    trabalho: token('--chart-work'), impacto: token('--chart-impact'), tinta: token('--title-4'),
    eixo: token('--axis'), grade: token('--grid'), plotagem: token('--fill-3'), tooltip: token('--navy'),
    disciplinas: Array.from({ length: 8 }, (_, i) => token(`--disc-${i + 1}`))
  };
  const tooltipBase = { backgroundColor: tema.tooltip, borderWidth: 0,
    textStyle: { color: '#fff', fontFamily: 'Inter, Arial, sans-serif', fontSize: 12 } };

  function ChartCard({ title, className = '', children }) {
    return e('article', { className: `disc-card ${className}`.trim() }, e('h3', null, title), children);
  }

  function Chart({ option, label, className, style }) {
    const ref = React.useRef(null);
    React.useEffect(() => {
      const node = ref.current;
      const chart = echarts.init(node, null, { renderer: 'svg' });
      const resize = new ResizeObserver(() => chart.resize());
      resize.observe(node);
      chart.setOption(option, true);
      return () => { resize.disconnect(); chart.dispose(); };
    }, []);
    React.useEffect(() => {
      const chart = echarts.getInstanceByDom(ref.current);
      if (chart) { chart.setOption(option, true); chart.resize(); }
    }, [option]);
    return e('div', { ref, className, style, role: 'img', 'aria-label': label });
  }

  function Barras({ title, itens, campo, total }) {
    const ordenados = [...itens].reverse();
    const cor = campo === 'hhMin' ? tema.trabalho : tema.impacto;
    const option = {
      animation: false,
      color: [cor],
      tooltip: { ...tooltipBase, trigger: 'item', formatter: p => {
        const item = ordenados[p.dataIndex];
        return `<strong>${seguro(item.nome)}</strong><br>${hh(item[campo])} HH · ${nf.format(item[campo] / total * 100)}%`;
      } },
      grid: { left: 120, right: 58, top: 16, bottom: 34, show: true,
        backgroundColor: tema.plotagem, borderWidth: 0 },
      xAxis: { type: 'value', min: 0, name: 'HH', nameLocation: 'end', nameGap: 8,
        nameTextStyle: { color: tema.tinta, fontSize: 11 },
        axisLine: { show: true, lineStyle: { color: tema.eixo, width: 1.25 } },
        axisTick: { show: false }, axisLabel: { color: tema.tinta, fontSize: 11, formatter: v => nf.format(v) },
        splitLine: { lineStyle: { color: tema.grade, width: .75 } } },
      yAxis: { type: 'category', data: ordenados.map(d => d.nome),
        axisLine: { lineStyle: { color: tema.eixo, width: 1.25 } }, axisTick: { show: false },
        axisLabel: { color: tema.tinta, fontSize: 11, width: 108, overflow: 'truncate' } },
      series: [{ type: 'bar', barMaxWidth: 18, data: ordenados.map(d => d[campo] / 60),
        label: { show: true, position: 'right', color: tema.tinta, fontSize: 11,
          formatter: p => nf.format(p.value) } }]
    };
    return e(ChartCard, { title },
      e('div', { className: 'disc-bar-scroll' },
        e(Chart, { className: 'disc-echart-bars', option,
          style: { height: `${Math.max(260, itens.length * 32 + 50)}px` },
          label: `${title}: ${hh(total)} HH. Comparação de ${itens.length} disciplinas.` })),
      e('ul', { className: 'sr-only', 'aria-label': `${title}: valores por disciplina` },
        itens.map(d => e('li', { key: d.nome }, `${d.nome}: ${hh(d[campo])} HH, ${nf.format(d[campo] / total * 100)}%`))));
  }

  function Donut({ title, linhas, campo, cores }) {
    const total = linhas.reduce((s, d) => s + d[campo], 0);
    const itens = linhas.filter(d => d[campo] > 0).sort((a, b) => b[campo] - a[campo]);
    if (itens.length > 6) return e(Barras, { title, itens, campo, total });
    const rotulados = new Set(itens.filter(d => d[campo] / total >= .1).slice(0, 4).map(d => d.nome));
    const option = {
      animation: false,
      color: itens.map(d => cores[d.nome]),
      tooltip: { ...tooltipBase, trigger: 'item', formatter: p => `${seguro(p.name)}: ${hh(p.value * 60)} HH (${nf.format(p.percent)}%)` },
      series: [{ type: 'pie', radius: ['36%', '85%'], center: ['50%', '50%'], minShowLabelAngle: 15,
        avoidLabelOverlap: true, label: { show: true, position: 'inside',
          formatter: p => rotulados.has(p.name) ? `${nf.format(p.percent)}%` : '',
          color: '#fff', fontFamily: 'Inter, Arial, sans-serif', fontSize: 11, fontWeight: 600 },
        labelLayout: { hideOverlap: true },
        labelLine: { show: false },
        itemStyle: { borderColor: '#FFFFFF', borderWidth: 1 },
        data: itens.map(d => ({ name: d.nome, value: d[campo] / 60 })) }]
    };
    return e(ChartCard, { title },
      total > 0 ? e('div', { className: 'disc-donut-layout' },
        e('div', { className: 'disc-donut-wrap' },
          e(Chart, { className: 'disc-echart-donut', option, label: `${title}: ${hh(total)} HH` }),
          e('div', { className: 'disc-donut-center', 'aria-hidden': 'true' }, e('strong', null, hh(total)), e('span', null, 'HH'))),
        e('ul', { className: 'disc-legend', 'aria-label': `${title}: valores por disciplina` }, itens.map(d => e('li', { key: d.nome },
          e('i', { style: { background: cores[d.nome] }, 'aria-hidden': 'true' }),
          e('span', null, d.nome), e('strong', null, `${hh(d[campo])} HH · ${nf.format(d[campo] / total * 100)}%`)))))
        : e('p', { className: 'disc-empty' }, 'Sem HH no período selecionado.'));
  }

  const dia = iso => new Date(`${iso}T12:00:00`);
  const iso = data => `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
  const curto = data => `${String(data.getDate()).padStart(2, '0')}/${String(data.getMonth() + 1).padStart(2, '0')}`;
  const longo = data => `${curto(data)}/${data.getFullYear()}`;
  function chavePeriodo(data, periodo) {
    if (periodo === 'mensal') return data.slice(0, 7);
    if (periodo === 'diaria') return data;
    const inicio = dia(data);
    inicio.setDate(inicio.getDate() - (inicio.getDay() + 6) % 7);
    return iso(inicio);
  }
  function periodizar(eventos, periodo, ini, fim) {
    if (!ini || !fim || fim < ini) return [];
    const inicio = dia(ini), cursor = dia(ini), fimData = dia(fim);
    if (periodo === 'semanal') cursor.setDate(cursor.getDate() - (cursor.getDay() + 6) % 7);
    if (periodo === 'mensal') cursor.setDate(1);
    const mapa = new Map();
    while (cursor <= fimData) {
      const chave = chavePeriodo(iso(cursor), periodo);
      const ultimo = new Date(cursor);
      if (periodo === 'semanal') ultimo.setDate(ultimo.getDate() + 6);
      if (periodo === 'mensal') ultimo.setMonth(ultimo.getMonth() + 1, 0);
      const visivelIni = cursor < inicio ? inicio : cursor;
      const visivelFim = ultimo > fimData ? fimData : ultimo;
      const rotulo = periodo === 'mensal' ? `${String(cursor.getMonth() + 1).padStart(2, '0')}/${cursor.getFullYear()}`
        : periodo === 'semanal' ? `${curto(visivelIni)}–${curto(visivelFim)}` : curto(cursor);
      mapa.set(chave, { chave, rotulo, intervalo: periodo === 'diaria' ? longo(cursor) : `${longo(visivelIni)} a ${longo(visivelFim)}`,
        hhMin: 0, impactoMin: 0, registros: 0 });
      if (periodo === 'diaria') cursor.setDate(cursor.getDate() + 1);
      else if (periodo === 'semanal') cursor.setDate(cursor.getDate() + 7);
      else cursor.setMonth(cursor.getMonth() + 1);
    }
    for (const evento of eventos) {
      if (evento.data < ini || evento.data > fim) continue;
      const item = mapa.get(chavePeriodo(evento.data, periodo));
      if (!item) continue;
      item.hhMin += evento.hhMin; item.impactoMin += evento.impactoMin; item.registros++;
    }
    return [...mapa.values()];
  }

  function Comparativo({ eventos, ini, fim, eventosCiclo, cicloIni, cicloFim, cicloEstado }) {
    const [periodo, setPeriodo] = React.useState('diaria');
    const [disciplina, setDisciplina] = React.useState('');
    const [responsavel, setResponsavel] = React.useState('');
    const [contrato, setContrato] = React.useState('');
    const diario = periodo === 'diaria';
    const base = diario ? eventosCiclo : eventos;
    const dataIni = diario ? cicloIni : ini, dataFim = diario ? cicloFim : fim;
    const disciplinas = [...new Set(base.map(v => v.nome))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const responsaveis = [...new Set(base.map(v => v.responsavel))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const contratos = [...new Map(base.map(v => [v.contrato, v.contratoNome])).entries()].sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'));
    const discAtiva = disciplinas.includes(disciplina) ? disciplina : '';
    const respAtivo = responsaveis.includes(responsavel) ? responsavel : '';
    const contratoAtivo = contratos.some(([codigo]) => codigo === contrato) ? contrato : '';
    const selecionados = base.filter(v => (!discAtiva || v.nome === discAtiva)
      && (!respAtivo || v.responsavel === respAtivo) && (!contratoAtivo || v.contrato === contratoAtivo));
    const periodos = periodizar(selecionados, periodo, dataIni, dataFim);
    const preenchidos = periodos.filter(v => v.registros);
    const zoom = !diario && periodos.length > 12;
    const option = {
      animation: false,
      color: [tema.trabalho, tema.impacto],
      tooltip: { ...tooltipBase, trigger: 'axis', axisPointer: { type: 'line' }, formatter: pontos => {
        const periodoAtual = periodos[pontos[0]?.dataIndex];
        if (!periodoAtual) return '';
        const valores = pontos.filter(p => p.value != null).map(p =>
          `<div>${p.marker} ${seguro(p.seriesName)}: <strong>${nf.format(p.value)} HH</strong></div>`).join('');
        return `<div><strong>${seguro(periodoAtual.intervalo)}</strong></div>${valores || '<div>Sem RDC no período</div>'}`;
      } },
      grid: { left: 54, right: 20, top: 20, bottom: zoom ? 74 : 46, containLabel: false, show: true,
        backgroundColor: tema.plotagem, borderWidth: 0 },
      xAxis: { type: 'category', data: periodos.map(v => v.rotulo), boundaryGap: false,
        axisLine: { lineStyle: { color: tema.eixo, width: 1.25 } }, axisTick: { show: false },
        axisLabel: { color: tema.tinta, fontFamily: 'Inter, Arial, sans-serif', fontSize: 12,
          interval: 'auto', showMinLabel: true, showMaxLabel: true, margin: 12 } },
      yAxis: { type: 'value', min: 0, name: 'HH', nameTextStyle: { color: tema.tinta, fontSize: 12 },
        axisLabel: { color: tema.tinta, fontSize: 12, formatter: v => nf.format(v) },
        axisLine: { show: true, lineStyle: { color: tema.eixo, width: 1.25 } },
        splitLine: { lineStyle: { color: tema.grade, width: .75 } } },
      dataZoom: zoom ? [
        { type: 'inside', start: 0, end: 100 * Math.min(12, periodos.length) / periodos.length },
        { type: 'slider', start: 0, end: 100 * Math.min(12, periodos.length) / periodos.length,
          bottom: 8, height: 16, borderColor: tema.grade, fillerColor: 'rgba(36,90,134,.12)',
          textStyle: { color: tema.tinta, fontSize: 11 } }
      ] : [],
      series: [
        { name: 'Trabalhado', type: 'line', smooth: true, connectNulls: false, data: periodos.map(d => d.registros ? d.hhMin / 60 : null),
          symbol: 'circle', symbolSize: periodos.length > 14 ? 5 : 8, lineStyle: { width: 2.5 }, itemStyle: { color: tema.trabalho } },
        { name: 'Impacto estimado', type: 'line', smooth: true, connectNulls: false, data: periodos.map(d => d.registros ? d.impactoMin / 60 : null),
          symbol: 'diamond', symbolSize: periodos.length > 14 ? 5 : 8, lineStyle: { width: 2.5, type: 'dashed' }, itemStyle: { color: tema.impacto } }
      ]
    };
    return e(ChartCard, { title: 'HH trabalhado e impacto ao longo do tempo', className: 'disc-wide' },
      diario && e('div', { className: 'disc-cycle-range' }, `Ciclo de medição · ${longo(dia(cicloIni))} a ${longo(dia(cicloFim))}`),
      e('div', { className: 'disc-chart-controls' },
        e('fieldset', { className: 'disc-period' }, e('legend', null, 'Visualização'),
          [['diaria', 'Diária'], ['semanal', 'Semanal'], ['mensal', 'Mensal']].map(([valor, nome]) =>
            e('button', { key: valor, type: 'button', className: periodo === valor ? 'sel' : '',
              'aria-pressed': periodo === valor, onClick: () => setPeriodo(valor) }, nome))),
        e('label', null, 'Disciplina', e('select', { className: 'ctl', value: discAtiva, onChange: ev => setDisciplina(ev.target.value) },
          e('option', { value: '' }, 'Todas'), disciplinas.map(nome => e('option', { key: nome, value: nome }, nome)))),
        e('label', null, 'Responsável', e('select', { className: 'ctl', value: respAtivo, onChange: ev => setResponsavel(ev.target.value) },
          e('option', { value: '' }, 'Todos'), responsaveis.map(nome => e('option', { key: nome, value: nome }, nome)))),
        e('label', null, 'Contrato', e('select', { className: 'ctl', value: contratoAtivo, onChange: ev => setContrato(ev.target.value) },
          e('option', { value: '' }, 'Todos'), contratos.map(([codigo, nome]) => e('option', { key: codigo, value: codigo }, nome))))),
      diario && cicloEstado !== 'pronto' ? e('p', { className: 'disc-empty', role: 'status' },
        cicloEstado === 'erro' ? 'Não foi possível carregar o ciclo de medição.' : 'Carregando ciclo de medição…')
      : preenchidos.length ? e(React.Fragment, null,
        e('div', { className: 'disc-series-legend' },
          e('span', null, e('i', { 'aria-hidden': 'true' }), 'Trabalhado'),
          e('span', null, e('i', { 'aria-hidden': 'true' }), 'Impacto estimado')),
        e(Chart, { className: `disc-echart-line${zoom ? ' com-zoom' : ''}`, option,
          label: `HH trabalhado e impacto por ${periodo === 'diaria' ? 'dia' : periodo === 'semanal' ? 'semana' : 'mês'}` }),
        e('div', { className: 'disc-table-wrap' },
          e('table', { className: 'disc-data', 'aria-label': 'HH trabalhado e de impacto por período' },
            e('thead', null, e('tr', null, e('th', { scope: 'col' }, 'Período'),
              e('th', { scope: 'col' }, 'Trabalhado (HH)'), e('th', { scope: 'col' }, 'Impacto (HH)'))),
            e('tbody', null, preenchidos.map(d => e('tr', { key: d.chave },
              e('th', { scope: 'row' }, d.intervalo),
              e('td', null, hh(d.hhMin)), e('td', null, hh(d.impactoMin)))))))
        ) : e('p', { className: 'disc-empty' }, 'Sem HH no período selecionado.'));
  }

  function Graficos({ linhas, cores, eventos, ini, fim, eventosCiclo, cicloIni, cicloFim, cicloEstado }) {
    return e(React.Fragment, null,
      e(Comparativo, { eventos, ini, fim, eventosCiclo, cicloIni, cicloFim, cicloEstado }),
      e(Donut, { title: 'HH trabalhado por disciplina', linhas, campo: 'hhMin', cores }),
      e(Donut, { title: 'HH de impacto por disciplina', linhas, campo: 'impactoMin', cores }));
  }

  function GraficoHHResponsaveis({ linhas }) {
    const ordenadas = [...linhas].sort((a, b) => b.hh - a.hh || a.nome.localeCompare(b.nome, 'pt-BR'));
    const primeiros = ordenadas.map(l => l.nome.replace(/["']/g, '').trim().split(/\s+/)[0]);
    const ocorrencias = new Map(primeiros.map(nome => [nome, primeiros.filter(p => p === nome).length]));
    const rotulos = new Map(ordenadas.map((l, i) => {
      const palavras = l.nome.replace(/["']/g, '').trim().split(/\s+/);
      return [l.nome, ocorrencias.get(primeiros[i]) > 1 ? `${primeiros[i]} ${palavras.at(-1)[0]}.` : primeiros[i]];
    }));
    const option = {
      animation: false,
      color: [tema.trabalho, tema.impacto],
      legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 7, itemGap: 10,
        textStyle: { color: tema.tinta, fontFamily: 'Inter, Arial, sans-serif', fontSize: 11 } },
      tooltip: { ...tooltipBase, trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: pontos => {
        const nome = ordenadas[pontos[0]?.dataIndex]?.nome || '';
        return `<strong>${seguro(nome)}</strong>` + pontos.map(p =>
          `<div>${p.marker} ${seguro(p.seriesName)}: <strong>${nf.format(p.value)} HH</strong></div>`).join('');
      } },
      grid: { left: 88, right: 22, top: 28, bottom: 28, show: true,
        backgroundColor: tema.plotagem, borderWidth: 0 },
      xAxis: { type: 'value', min: 0,
        axisLabel: { color: tema.tinta, fontSize: 11, formatter: v => nf.format(v) },
        axisLine: { show: true, lineStyle: { color: tema.eixo } },
        splitLine: { lineStyle: { color: tema.grade, width: .75 } } },
      yAxis: { type: 'category', inverse: true, data: ordenadas.map(l => l.nome),
        axisLabel: { color: tema.tinta, fontSize: 11, interval: 0,
          formatter: nome => rotulos.get(nome) || nome },
        axisLine: { lineStyle: { color: tema.eixo } }, axisTick: { show: false } },
      series: [
        { name: 'Trabalhado', type: 'bar', stack: 'hh-responsavel', barMaxWidth: 18,
          data: ordenadas.map(l => l.hh / 60) },
        { name: 'Impacto estimado', type: 'bar', stack: 'hh-responsavel', barMaxWidth: 18,
          label: { show: ordenadas.length <= 6, position: 'right', color: tema.impacto, fontSize: 11,
            formatter: ponto => ponto.value > 0 ? nf.format(ponto.value) : '' },
          data: ordenadas.map(l => l.hhimp / 60) }
      ]
    };
    return e('article', { className: 'resp-chart' }, e('h4', null, 'HH trabalhado e impacto estimado'),
      e(Chart, { option, className: 'resp-echart',
        style: { height: `${Math.max(190, ordenadas.length * 42 + 48)}px` },
        label: 'Barras horizontais empilhadas: HH trabalhado e HH de impacto estimado por responsável' }));
  }

  function GraficosResponsaveis({ linhas }) {
    const ativos = linhas.filter(l => l.rdc > 0);
    if (!ativos.length) return e('p', { className: 'disc-empty' }, 'Sem RDC no período.');
    return e(GraficoHHResponsaveis, { linhas: ativos });
  }

  const root = ReactDOM.createRoot(document.getElementById('graficosDisciplina'));
  const responsaveisRoot = ReactDOM.createRoot(document.getElementById('graficosResponsaveis'));
  window.PainelCharts = { render(linhas, cores, eventos, ini, fim, eventosCiclo, cicloIni, cicloFim, cicloEstado) {
    root.render(e(Graficos, { linhas, cores, eventos, ini, fim, eventosCiclo, cicloIni, cicloFim, cicloEstado }));
  }, renderResponsaveis(linhas) {
    responsaveisRoot.render(e(GraficosResponsaveis, { linhas }));
  }, periodizar, coresDisciplina: nomes => Object.fromEntries(nomes.map((nome, i) =>
    [nome, tema.disciplinas[i % tema.disciplinas.length]])) };
})();
