/**
 * Schemas Zod para as 8 RPCs do Supabase que o Painel de Controle usa.
 * Campos e formatos vêm de docs/DATABASE_AUDIT.md (schema.sql + migrações) —
 * nada aqui foi inventado; o que não existe no banco não tem campo aqui.
 */
import { z } from 'zod'

const erro = z.object({ ok: z.literal(false), erro: z.string() })

export const StatusRdc = z.enum(['Rascunho', 'Enviado', 'Validado', 'Em revisão', 'Substituído', 'Cancelado'])
export type StatusRdc = z.infer<typeof StatusRdc>

export const Disciplina = z.enum(['PAC', 'REC', 'TEL/COB', 'ANDAIME'])
export type Disciplina = z.infer<typeof Disciplina>

export const Situacao = z.enum(['Produção com RDC', 'Produção sem RDC', 'RDC sem produção'])
export type Situacao = z.infer<typeof Situacao>

export const Unidade = z.enum(['m2', 'kg'])

// ---------------------------------------------------------------------------
// rdc_admin_login
// ---------------------------------------------------------------------------
export const LoginResponse = z.union([erro, z.object({ ok: z.literal(true), nome: z.string() })])
export type LoginResponse = z.infer<typeof LoginResponse>

// ---------------------------------------------------------------------------
// rdc_admin_exportar
// ---------------------------------------------------------------------------
export const RdcRow = z.object({
  codigo: z.string(),
  data_rdc: z.string(),
  responsavel: z.string(),
  responsavel_funcao: z.string().nullable(),
  area: z.string().nullable(),
  ativo: z.string(),
  ativo_descricao: z.string().nullable(),
  om: z.string(),
  status: StatusRdc,
  revisao: z.number(),
  revisao_de: z.string().nullable(),
  substituido_por: z.string().nullable(),
  recebido_em: z.string(),
  enviado_por: z.string().nullable(),
  validado_por: z.string().nullable(),
  validado_em: z.string().nullable(),
  obs_validacao: z.string().nullable(),
  qtd_atividades: z.number().nullable(),
  qtd_impactos: z.number().nullable(),
  qtd_fotos: z.number().nullable(),
  pts: z.boolean().nullable(),
  pts_solicitacao: z.string().nullable(),
  pts_abertura: z.string().nullable(),
  espera_pts_min: z.number().nullable(),
  bloqueio: z.boolean().nullable(),
  bloqueio_ativo: z.string().nullable(),
  bloqueio_hora: z.string().nullable(),
  contrato: z.string().nullable(),
  contrato_nome: z.string().nullable(),
  editado_por: z.string().nullable(),
  editado_em: z.string().nullable(),
  min_atividades: z.number(),
  hh_min: z.number(),
  efetivo_max: z.number(),
  min_impacto: z.number(),
  hh_impacto_min: z.number(),
})
export type RdcRow = z.infer<typeof RdcRow>

export const AtividadeRow = z.object({
  codigo: z.string(),
  rdc: z.string(),
  ordem: z.number(),
  disciplina: Disciplina,
  servico: z.string(),
  tipo_andaime: z.string().nullable(),
  descricao_outros: z.string().nullable(),
  observacao: z.string().nullable(),
  inicio: z.string(),
  fim: z.string(),
  duracao_min: z.number(),
  qtd_ajudante: z.number(),
  qtd_pintor: z.number(),
  qtd_jatista: z.number(),
  qtd_mecanico: z.number(),
  qtd_montador_andaime: z.number(),
  qtd_alpinista_n1: z.number(),
  qtd_soldador: z.number(),
  efetivo_total: z.number(),
})
export type AtividadeRow = z.infer<typeof AtividadeRow>

export const ImpactoRow = z.object({
  codigo: z.string(),
  rdc: z.string(),
  ordem: z.number(),
  descricao: z.string(),
  inicio: z.string(),
  fim: z.string(),
  duracao_min: z.number(),
})
export type ImpactoRow = z.infer<typeof ImpactoRow>

export const FotoRow = z.object({
  codigo: z.string(),
  rdc: z.string(),
  atividade: z.string(),
  caminho: z.string(),
  data_hora_foto: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  precisao_m: z.number().nullable(),
  gps_fonte: z.enum(['foto', 'aparelho']).nullable(),
})
export type FotoRow = z.infer<typeof FotoRow>

export const ExportarResponse = z.union([
  erro,
  z.object({
    ok: z.literal(true),
    nome: z.string(),
    rdcs: z.array(RdcRow),
    atividades: z.array(AtividadeRow),
    impactos: z.array(ImpactoRow),
    fotos: z.array(FotoRow),
  }),
])
export type ExportarResponse = z.infer<typeof ExportarResponse>

// ---------------------------------------------------------------------------
// rdc_admin_producao (vw_mc_rdc_dia) e rdc_admin_producao_resp (vw_mc_producao_responsavel)
// ---------------------------------------------------------------------------
const etapas = {
  lav: z.number().nullable(),
  slv: z.number().nullable(),
  st2: z.number().nullable(),
  st3: z.number().nullable(),
  jat_1: z.number().nullable(),
  jat_2: z.number().nullable(),
  prm_c5: z.number().nullable(),
  a05: z.number().nullable(),
  f22: z.number().nullable(),
  a06: z.number().nullable(),
  fab: z.number().nullable(),
  desm: z.number().nullable(),
  mont: z.number().nullable(),
}

export const ProducaoRow = z.object({
  tag_chave: z.string().nullable(),
  data: z.string().nullable(),
  om: z.string().nullable(),
  disciplina: z.string().nullable(),
  situacao: Situacao,
  unidade: Unidade.nullable(),
  ativos_mc: z.array(z.string()).nullable(),
  tags_rdc: z.array(z.string()).nullable(),
  rdcs: z.array(z.string()).nullable(),
  qtd_rdc: z.number().nullable(),
  horas: z.number().nullable(),
  homem_hora: z.number().nullable(),
  ...etapas,
})
export type ProducaoRow = z.infer<typeof ProducaoRow>

export const ProducaoResponse = z.union([
  erro,
  z.object({ ok: z.literal(true), nome: z.string(), linhas: z.array(ProducaoRow) }),
])
export type ProducaoResponse = z.infer<typeof ProducaoResponse>

export const ProducaoRespRow = z.object({
  responsavel: z.string(),
  tag: z.string().nullable(),
  data: z.string().nullable(),
  om: z.string().nullable(),
  disciplina: z.string().nullable(),
  situacao: Situacao,
  unidade: Unidade.nullable(),
  ...etapas,
  valor: z.number().nullable(),
  etapas_sem_preco: z.string().nullable(),
  participacao: z.number().nullable(),
  horas: z.number().nullable(),
  homem_hora: z.number().nullable(),
})
export type ProducaoRespRow = z.infer<typeof ProducaoRespRow>

export const PrecoRow = z.object({
  contrato_codigo: z.string(),
  disciplina: z.string(),
  etapa: z.string(),
  item_qqp: z.number().nullable(),
  descricao: z.string().nullable(),
  unidade: Unidade,
  preco: z.number(),
  fonte: z.string().nullable(),
})
export type PrecoRow = z.infer<typeof PrecoRow>

export const ProducaoRespResponse = z.union([
  erro,
  z.object({ ok: z.literal(true), nome: z.string(), linhas: z.array(ProducaoRespRow), precos: z.array(PrecoRow) }),
])
export type ProducaoRespResponse = z.infer<typeof ProducaoRespResponse>

// ---------------------------------------------------------------------------
// rdc_admin_mc_status / rdc_admin_mc_importar — fluxo "Atualizar carga produção"
// ---------------------------------------------------------------------------
export const McStatusResponse = z.union([
  erro,
  z.object({ ok: z.literal(true), arquivos: z.array(z.object({ chave: z.string(), sha1: z.string().nullable() })) }),
])
export type McStatusResponse = z.infer<typeof McStatusResponse>

// Item de uma "folha" (aba MC_PAC/MC_REC/MC_TEL) lido no navegador — ver domain/xlsxCarga.ts
export const ItemMc = z.object({
  linha: z.number(),
  item: z.string().nullable(),
  subitem: z.string().nullable(),
  ref_projeto: z.string().nullable(),
  om: z.string().nullable(),
  centro_custo: z.string().nullable(),
  area: z.string().nullable(),
  area2: z.string().nullable(),
  descricao: z.string(),
  larg: z.number().nullable(),
  comp: z.number().nullable(),
  qtd: z.number().nullable(),
  lados: z.number().nullable(),
  criterio: z.number().nullable(),
  peso_unit: z.number().nullable(),
  prev: z.number().nullable(),
  exec_pct: z.number().nullable(),
  exec_qtd: z.number().nullable(),
  obs: z.string().nullable(),
  etapas: z.record(z.string(), z.string()),
  marca: z.string().nullable(),
})
export type ItemMc = z.infer<typeof ItemMc>

export const DiarioMc = z.object({ data: z.string(), etapa: z.string(), valor: z.number() })
export type DiarioMc = z.infer<typeof DiarioMc>

export const FolhaMc = z.object({
  chave: z.string(),
  arquivo: z.string(),
  caminho: z.string(),
  aba: z.string(),
  sha1: z.string().nullable(),
  disciplina: z.enum(['PAC', 'REC', 'TEL']),
  unidade: Unidade,
  contrato: z.string(),
  contrato_codigo: z.string().nullable(),
  ativo: z.string(),
  periodo_ini: z.string().nullable(),
  periodo_fim: z.string().nullable(),
  data_elaboracao: z.string().nullable(),
  delineador: z.string().nullable(),
  itens: z.array(ItemMc),
  diario: z.array(DiarioMc),
  avisos: z.array(z.string()),
})
export type FolhaMc = z.infer<typeof FolhaMc>

export const RemoverMc = z.object({ acao: z.literal('remover'), chave: z.string() })

// Mesmo formato de retorno de rdc_admin_mc_importar (migracao_v15): a ação
// 'remover' devolve só {ok, acao, chave}, sem itens/diario.
export const McImportarResponse = z.union([
  erro,
  z.object({ ok: z.literal(true), acao: z.literal('gravar').optional(), chave: z.string().optional(), itens: z.number(), diario: z.number() }),
  z.object({ ok: z.literal(true), acao: z.literal('remover'), chave: z.string() }),
])
export type McImportarResponse = z.infer<typeof McImportarResponse>

// ---------------------------------------------------------------------------
// rdc_admin_editar / rdc_validar
// ---------------------------------------------------------------------------
export const CamposEditaveis = z.object({
  contrato: z.string().optional(),
  contrato_nome: z.string().optional(),
  responsavel: z.string().optional(),
  responsavel_funcao: z.string().optional(),
  data_rdc: z.string().optional(),
  area: z.string().optional(),
  ativo: z.string().optional(),
  ativo_descricao: z.string().optional(),
  om: z.string().optional(),
  pts: z.boolean().optional(),
  pts_solicitacao: z.string().optional(),
  pts_abertura: z.string().optional(),
  bloqueio: z.boolean().optional(),
  bloqueio_ativo: z.string().optional(),
  bloqueio_hora: z.string().optional(),
})
export type CamposEditaveis = z.infer<typeof CamposEditaveis>

export const EditarResponse = z.union([erro, z.object({ ok: z.literal(true), editados: z.number() })])
export type EditarResponse = z.infer<typeof EditarResponse>

export const Decisao = z.enum(['Validado', 'Em revisão', 'Cancelado'])
export type Decisao = z.infer<typeof Decisao>

export const ValidarResponse = z.union([
  erro,
  z.object({ ok: z.literal(true), status: StatusRdc, por: z.string() }),
])
export type ValidarResponse = z.infer<typeof ValidarResponse>
