import type { Page, Route } from '@playwright/test'

export const ADMIN = { nome: 'Admin Teste', senha: 'senha-correta-123' }

const RDC_1 = {
  codigo: 'RDC-20261001-080000-AAAA',
  data_rdc: '2026-10-01',
  responsavel: 'Maria Souza',
  responsavel_funcao: 'Encarregada',
  area: 'Área 1',
  ativo: 'TAG-100',
  ativo_descricao: 'Silo 1',
  om: 'OM-123',
  status: 'Enviado',
  revisao: 0,
  revisao_de: null,
  substituido_por: null,
  recebido_em: '2026-10-01T18:00:00Z',
  enviado_por: 'Maria Souza',
  validado_por: null,
  validado_em: null,
  obs_validacao: null,
  qtd_atividades: 1,
  qtd_impactos: 1,
  qtd_fotos: 0,
  pts: true,
  pts_solicitacao: '2026-10-01T07:00:00Z',
  pts_abertura: '2026-10-01T07:30:00Z',
  espera_pts_min: 30,
  bloqueio: false,
  bloqueio_ativo: null,
  bloqueio_hora: null,
  contrato: '5900108690',
  contrato_nome: 'ROTINA',
  editado_por: null,
  editado_em: null,
  min_atividades: 240,
  hh_min: 480,
  efetivo_max: 2,
  min_impacto: 30,
  hh_impacto_min: 60,
}

const RDC_2 = {
  ...RDC_1,
  codigo: 'RDC-20261002-080000-BBBB',
  data_rdc: '2026-10-02',
  responsavel: 'João Lima',
  status: 'Validado',
  validado_por: 'Admin Teste',
  validado_em: '2026-10-02T20:00:00Z',
  pts: false,
  pts_solicitacao: null,
  pts_abertura: null,
  espera_pts_min: null,
  contrato: null,
  contrato_nome: null,
  qtd_impactos: 0,
  min_impacto: 0,
  hh_impacto_min: 0,
}

const ATIVIDADE_1 = {
  codigo: `${RDC_1.codigo}-A01`,
  rdc: RDC_1.codigo,
  ordem: 1,
  disciplina: 'PAC',
  servico: 'Pintura de fundo',
  tipo_andaime: null,
  descricao_outros: null,
  observacao: 'Fundo aplicado na face norte da viga',
  inicio: '2026-10-01T08:00:00Z',
  fim: '2026-10-01T12:00:00Z',
  duracao_min: 240,
  qtd_ajudante: 0,
  qtd_pintor: 2,
  qtd_jatista: 0,
  qtd_mecanico: 0,
  qtd_montador_andaime: 0,
  qtd_alpinista_n1: 0,
  qtd_soldador: 0,
  efetivo_total: 2,
}

const IMPACTO_1 = {
  codigo: `${RDC_1.codigo}-I01`,
  rdc: RDC_1.codigo,
  ordem: 1,
  descricao: 'Chuva',
  inicio: '2026-10-01T09:00:00Z',
  fim: '2026-10-01T09:30:00Z',
  duracao_min: 30,
}

export const EXPORTAR_OK = {
  ok: true,
  nome: ADMIN.nome,
  rdcs: [RDC_1, RDC_2],
  atividades: [ATIVIDADE_1],
  impactos: [IMPACTO_1],
  fotos: [],
}

export const PRODUCAO_OK = {
  ok: true,
  nome: ADMIN.nome,
  linhas: [
    {
      tag_chave: 'TAG100',
      data: '2026-10-01',
      om: 'OM-123',
      disciplina: 'PAC',
      situacao: 'Produção com RDC',
      unidade: 'm2',
      ativos_mc: ['TAG-100'],
      tags_rdc: ['TAG-100'],
      rdcs: [RDC_1.codigo],
      qtd_rdc: 1,
      horas: 4,
      homem_hora: 8,
      lav: 10,
      slv: null,
      st2: null,
      st3: null,
      jat_1: null,
      jat_2: null,
      prm_c5: null,
      a05: null,
      f22: null,
      a06: null,
      fab: null,
      desm: null,
      mont: null,
    },
    {
      tag_chave: 'TAG200',
      data: '2026-10-02',
      om: null,
      disciplina: 'REC',
      situacao: 'Produção sem RDC',
      unidade: 'kg',
      ativos_mc: ['TAG-200'],
      tags_rdc: null,
      rdcs: null,
      qtd_rdc: null,
      horas: null,
      homem_hora: null,
      lav: null,
      slv: null,
      st2: null,
      st3: null,
      jat_1: null,
      jat_2: null,
      prm_c5: null,
      a05: null,
      f22: null,
      a06: null,
      fab: 50,
      desm: null,
      mont: null,
    },
  ],
}

export const PRODUCAO_RESP_OK = {
  ok: true,
  nome: ADMIN.nome,
  linhas: [
    {
      responsavel: 'Maria Souza',
      tag: 'TAG-100',
      data: '2026-10-01',
      om: 'OM-123',
      disciplina: 'PAC',
      situacao: 'Produção com RDC',
      unidade: 'm2',
      lav: 10,
      slv: null,
      st2: null,
      st3: null,
      jat_1: null,
      jat_2: null,
      prm_c5: null,
      a05: null,
      f22: null,
      a06: null,
      fab: null,
      desm: null,
      mont: null,
      valor: 67.2,
      etapas_sem_preco: null,
      participacao: 1,
      horas: 4,
      homem_hora: 8,
    },
    {
      responsavel: 'Sem RDC',
      tag: 'TAG-200',
      data: '2026-10-02',
      om: null,
      disciplina: 'REC',
      situacao: 'Produção sem RDC',
      unidade: 'kg',
      lav: null,
      slv: null,
      st2: null,
      st3: null,
      jat_1: null,
      jat_2: null,
      prm_c5: null,
      a05: null,
      f22: null,
      a06: null,
      fab: 50,
      desm: null,
      mont: null,
      valor: null,
      etapas_sem_preco: 'FAB',
      participacao: null,
      horas: null,
      homem_hora: null,
    },
  ],
  precos: [
    { contrato_codigo: '5900108690', disciplina: 'PAC', etapa: 'LAV', item_qqp: 70, descricao: 'Lavagem', unidade: 'm2', preco: 6.72, fonte: 'QQP_ROT' },
  ],
}

export async function instalarMocks(page: Page): Promise<void> {
  await page.route('**/rest/v1/rpc/**', async (route: Route) => {
    const url = new URL(route.request().url())
    const fn = url.pathname.split('/').pop()
    const body = route.request().postDataJSON() as Record<string, unknown>

    if (fn === 'rdc_admin_login') {
      if (body.p_nome === ADMIN.nome && body.p_senha === ADMIN.senha) {
        return route.fulfill({ json: { ok: true, nome: ADMIN.nome } })
      }
      return route.fulfill({ json: { ok: false, erro: 'Nome ou senha inválidos.' } })
    }
    if (fn === 'rdc_admin_exportar') return route.fulfill({ json: EXPORTAR_OK })
    if (fn === 'rdc_admin_producao') return route.fulfill({ json: PRODUCAO_OK })
    if (fn === 'rdc_admin_producao_resp') return route.fulfill({ json: PRODUCAO_RESP_OK })
    if (fn === 'rdc_admin_mc_status') return route.fulfill({ json: { ok: true, arquivos: [] } })
    if (fn === 'rdc_admin_mc_importar') {
      // Mesmo formato de retorno da função SQL (supabase/migracao_v15_carga_producao.sql).
      const arq = body.p_arquivo as { acao?: string; chave: string; itens?: unknown[]; diario?: unknown[] }
      if (arq.acao === 'remover') return route.fulfill({ json: { ok: true, acao: 'remover', chave: arq.chave } })
      return route.fulfill({ json: { ok: true, acao: 'gravar', chave: arq.chave, itens: arq.itens?.length ?? 0, diario: arq.diario?.length ?? 0 } })
    }
    if (fn === 'rdc_admin_editar') return route.fulfill({ json: { ok: true, editados: (body.p_codigos as string[]).length } })
    if (fn === 'rdc_validar') return route.fulfill({ json: { ok: true, status: body.p_decisao, por: ADMIN.nome } })
    return route.abort('blockedbyclient')
  })
}

export async function logar(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByLabel('Nome').fill(ADMIN.nome)
  await page.getByLabel('Senha').fill(ADMIN.senha)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.getByRole('button', { name: 'Sair' }).waitFor()
}
