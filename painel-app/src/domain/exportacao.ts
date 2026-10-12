/** Porta planilhas()/exportação de painel.html: 4 abas, mesmas colunas. */
import type { Recorte } from './filtros'
import { fmtData, fmtDH, fmtHora } from './formatters'

const FUNCOES: Array<[string, string]> = [
  ['qtd_ajudante', 'Ajudante'],
  ['qtd_pintor', 'Pintor'],
  ['qtd_jatista', 'Jatista'],
  ['qtd_mecanico', 'Mecânico'],
  ['qtd_montador_andaime', 'Montador de Andaime'],
  ['qtd_alpinista_n1', 'Alpinista N1'],
  ['qtd_soldador', 'Soldador'],
]

function hr(min: number | null): number | null {
  return min == null ? null : Math.round((min / 60) * 100) / 100
}

export function planilhasExportacao(recorte: Recorte): Record<string, Record<string, unknown>[]> {
  const porRdc = new Map(recorte.rdcs.map((r) => [r.codigo, r]))

  const RDC = recorte.rdcs.map((r) => ({
    Codigo: r.codigo,
    Contrato: r.contrato ?? '',
    ContratoNome: r.contrato_nome ?? '',
    Data: fmtData(r.data_rdc),
    Responsavel: r.responsavel,
    Funcao: r.responsavel_funcao ?? '',
    Area: r.area ?? '',
    Ativo: r.ativo,
    AtivoDescricao: r.ativo_descricao ?? '',
    OM: r.om,
    Situacao: r.status,
    Revisao: r.revisao,
    Atividades: r.qtd_atividades,
    Impactos: r.qtd_impactos,
    Fotos: r.qtd_fotos,
    HorasAtividades: hr(r.min_atividades),
    HH: hr(r.hh_min),
    EfetivoMax: r.efetivo_max,
    HorasImpacto: hr(r.min_impacto),
    HHImpacto: hr(r.hh_impacto_min),
    PTS: r.pts == null ? '' : r.pts ? 'Sim' : 'Não',
    PTSSolicitacao: fmtHora(r.pts_solicitacao),
    PTSAbertura: fmtHora(r.pts_abertura),
    EsperaPTSMin: r.espera_pts_min,
    Bloqueio: r.bloqueio == null ? '' : r.bloqueio ? 'Sim' : 'Não',
    BloqueioAtivo: r.bloqueio_ativo ?? '',
    BloqueioHora: fmtHora(r.bloqueio_hora),
    RecebidoEm: fmtDH(r.recebido_em),
    ValidadoPor: r.validado_por ?? '',
    ValidadoEm: fmtDH(r.validado_em),
    ObsValidacao: r.obs_validacao ?? '',
  }))

  const Atividades = recorte.atividades.map((a) => ({
    RDC: a.rdc,
    Contrato: porRdc.get(a.rdc)?.contrato ?? '',
    Data: fmtData(porRdc.get(a.rdc)?.data_rdc ?? null),
    Responsavel: porRdc.get(a.rdc)?.responsavel,
    Ativo: porRdc.get(a.rdc)?.ativo,
    OM: porRdc.get(a.rdc)?.om,
    Ordem: a.ordem,
    Disciplina: a.disciplina,
    Servico: a.servico,
    TipoAndaime: a.tipo_andaime ?? '',
    DescricaoOutros: a.descricao_outros ?? '',
    Inicio: fmtHora(a.inicio),
    Fim: fmtHora(a.fim),
    DuracaoMin: a.duracao_min,
    ...Object.fromEntries(FUNCOES.map(([chave, titulo]) => [titulo, (a as unknown as Record<string, number>)[chave]])),
    Efetivo: a.efetivo_total,
    HH: hr(a.efetivo_total * a.duracao_min),
    Observacao: a.observacao ?? '',
  }))

  const Impactos = recorte.impactos.map((i) => {
    const rdc = porRdc.get(i.rdc)
    return {
      RDC: i.rdc,
      Contrato: rdc?.contrato ?? '',
      Data: fmtData(rdc?.data_rdc ?? null),
      Responsavel: rdc?.responsavel,
      Ativo: rdc?.ativo,
      OM: rdc?.om,
      Ordem: i.ordem,
      Descricao: i.descricao,
      Inicio: fmtHora(i.inicio),
      Fim: fmtHora(i.fim),
      DuracaoMin: i.duracao_min,
      EfetivoRDC: rdc?.efetivo_max,
      HHImpacto: hr(i.duracao_min * (rdc?.efetivo_max ?? 0)),
    }
  })

  const Fotos = recorte.fotos.map((f) => ({
    RDC: f.rdc,
    Atividade: f.atividade,
    Foto: f.codigo,
    DataHora: fmtDH(f.data_hora_foto),
    Latitude: f.latitude,
    Longitude: f.longitude,
    PrecisaoM: f.precisao_m,
    OrigemGPS: f.gps_fonte ?? '',
    Mapa: f.latitude != null ? `https://www.google.com/maps?q=${f.latitude},${f.longitude}` : '',
    Caminho: f.caminho,
  }))

  return { RDC, Atividades, Impactos, Fotos }
}
