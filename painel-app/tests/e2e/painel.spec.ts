import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import * as XLSX from 'xlsx'
import { ADMIN, EXPORTAR_OK, instalarMocks, logar } from './fixtures/mocks'

test.beforeEach(async ({ page }) => {
  await instalarMocks(page)
})

test('login recusa credenciais erradas e aceita as corretas', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Nome').fill('alguém')
  await page.getByLabel('Senha').fill('senha-errada')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('alert')).toHaveText('Nome ou senha inválidos.')

  await page.getByLabel('Nome').fill(ADMIN.nome)
  await page.getByLabel('Senha').fill(ADMIN.senha)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible()
})

test('Painel executivo (tela inicial) mostra o resumo de pendências do recorte', async ({ page }) => {
  await logar(page)
  await expect(page.getByRole('heading', { level: 2, name: 'Painel executivo', exact: true })).toBeVisible()
  // RDC_1 está 'Enviado' (aguardando validação), sem... tem contrato; RDC_2 tem PTS=false.
  const pendencias = page.getByRole('region', { name: 'Pendências do recorte' })
  await expect(pendencias.getByText('aguardando validação')).toBeVisible()
  await expect(pendencias.getByText('sem contrato')).toBeVisible()
})

test('Painel executivo calcula HH trabalhado e mostra a emissão diária do recorte', async ({ page }) => {
  await logar(page)
  // ATIVIDADE_1: efetivo 2 x 240min/60 = 8 HH
  const kpi = page.getByRole('group', { name: 'Total HH trabalhado', exact: true })
  await expect(kpi.locator('.exec-kpi__valor')).toHaveText('8,0HH')
  // Emissão diária (antes na tela Desempenho, removida)
  await expect(page.getByRole('heading', { level: 2, name: 'Emissão diária', exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Calendário de emissão diária (rolável)' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Telas do painel' }).getByRole('button', { name: 'Desempenho' })).toHaveCount(0)
})

test('Produção: KPIs de produtividade, contrato/área do RDC, situação e agrupamento', async ({ page }) => {
  await logar(page)
  await page.getByRole('navigation', { name: 'Telas do painel' }).getByRole('button', { name: 'Produção', exact: true }).click()
  // PRODUCAO_RESP_OK: Maria Souza, LAV 10 m² com 8 HH -> 1,25 m²/HH; REC FAB 50 kg sem RDC e sem preço
  await expect(page.getByRole('group', { name: 'Produtividade PAC' })).toContainText('1,25')
  await expect(page.getByRole('group', { name: 'Produtividade REC e TEL' })).toContainText('Nenhuma produção em kg com HH vinculado')
  await expect(page.getByText('1 registro(s) com produção sem preço, fora do total')).toBeVisible()
  const tabela = page.getByRole('region', { name: 'Produção detalhada' })
  await expect(tabela.getByRole('cell', { name: 'ROTINA' })).toBeVisible()
  await expect(tabela.getByRole('cell', { name: 'Área 1' })).toBeVisible()
  await expect(tabela.getByText('sem preço: FAB')).toBeVisible()
  // situação: filtra e conta por ativo × OM × disciplina × dia
  await tabela.getByRole('button', { name: /Produção sem RDC 1/ }).click()
  await expect(tabela.getByRole('cell', { name: 'ROTINA' })).toHaveCount(0)
  await tabela.getByRole('button', { name: /Todas as situações 2/ }).click()
  // agrupamento por contrato com detalhe expansível
  await tabela.getByLabel('Agrupar por').selectOption({ label: 'Contrato' })
  await tabela.getByRole('button', { name: 'ROTINA' }).click()
  await expect(tabela.getByRole('cell', { name: 'TAG-100 OM OM-123', exact: true })).toBeVisible()
})

test('Exportar Excel baixa um arquivo .xlsx com o recorte carregado', async ({ page }) => {
  await logar(page)
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exportar Excel' }).click()])
  expect(download.suggestedFilename()).toMatch(/^RDC_.*\.xlsx$/)
})

test('Exportar observações RDO gera a planilha no formato do RDO', async ({ page }) => {
  await logar(page)
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exportar observações RDO' }).click()])
  expect(download.suggestedFilename()).toMatch(/^Observacoes_RDO_.*\.xlsx$/)
  const wb = XLSX.read(readFileSync(await download.path()))
  const linhas = XLSX.utils.sheet_to_json<Record<string, string>>(wb.Sheets.Observacoes_RDO)
  expect(Object.keys(linhas[0])).toEqual(['Data', 'Hora', 'Equipamento', 'OM', 'Horario_Solicitacao', 'Horario_Abertura', 'Impacto', 'Descricao_Macro_RDO'])
  const maria = linhas.find((l) => l.Equipamento === 'TAG-100')!
  expect(maria.Data).toBe('01/10/2026')
  // RDC_1: espera de PTS de 30 min (dentro da meta de 40) e impacto "Chuva" registrado
  expect(maria.Impacto).toBe('Sim — IMPACTO CHUVA')
  expect(maria.Descricao_Macro_RDO).toContain('Executante: Maria Souza.')
})

test('Desvios lista os impactos do recorte', async ({ page }) => {
  await logar(page)
  await page.getByRole('button', { name: 'Desvios' }).click()
  await expect(page.getByText('Chuva')).toBeVisible()
})

test('Detalhe do RDC abre da tabela do Painel executivo e permite validar', async ({ page }) => {
  await logar(page)
  const tabela = page.getByRole('region', { name: 'Tabela de RDC (rolável)' })
  await tabela.getByRole('row', { name: /Maria Souza/ }).click()
  const painel = page.getByRole('dialog', { name: /RDC-/ })
  await expect(painel).toBeVisible()
  // mão de obra por função: 2 pintores × 4 h = 8,0 HH
  await expect(page.getByLabel('Efetivo por função').getByRole('listitem')).toHaveText(/Pintor\s*2/)
  await expect(page.getByRole('row', { name: 'Pintor 2 8,0 100,0%' })).toBeVisible()
  // descrição da atividade executada: serviço + observação do encarregado
  await expect(page.getByText('Pintura de fundo')).toBeVisible()
  await expect(page.getByRole('definition').filter({ hasText: 'Fundo aplicado na face norte da viga' })).toBeVisible()
  await painel.getByRole('button', { name: 'Validar' }).click()
  // sem erro após a decisão (mock sempre retorna ok:true)
  await expect(page.getByText('Não foi possível registrar a decisão.')).not.toBeVisible()
  // Esc fecha o painel e devolve o foco à tabela
  await page.keyboard.press('Escape')
  await expect(painel).toBeHidden()
})

test('Tabela do Painel executivo: Enter abre o RDC e a seleção define contrato em lote', async ({ page }) => {
  await logar(page)
  const tabela = page.getByRole('region', { name: 'Tabela de RDC (rolável)' })
  await tabela.getByRole('row', { name: /João Lima/ }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: /RDC-/ })).toBeVisible()
  await page.getByRole('button', { name: 'Fechar', exact: true }).click()
  await tabela.getByRole('checkbox', { name: /Selecionar RDC-/ }).first().check()
  const lote = page.getByRole('group', { name: 'Ação em lote' })
  await lote.getByLabel('Número do contrato para os selecionados').fill('5900108690')
  await lote.getByRole('button', { name: 'Definir contrato' }).click()
  await expect(lote).toBeHidden()
})

test('Falha na atualização mantém os dados anteriores com aviso, sem apagar nada', async ({ page }) => {
  let chamadas = 0
  await page.route('**/rest/v1/rpc/rdc_admin_exportar', async (route) => {
    chamadas++
    if (chamadas === 1) return route.fulfill({ json: EXPORTAR_OK })
    return route.fulfill({ status: 500, json: { message: 'erro interno' } })
  })
  await logar(page)
  const pendencias = page.getByRole('region', { name: 'Pendências do recorte' })
  await expect(pendencias.getByText('aguardando validação')).toBeVisible()

  // força um novo fetch mudando o período -> 2ª chamada falha
  await page.getByLabel('Mês medição').selectOption({ label: 'Setembro' })
  await expect(page.getByText('Não foi possível atualizar. Veja abaixo a última consulta que carregou com sucesso.')).toBeVisible()
  // o resumo de pendências antigo continua visível (dado não foi apagado)
  await expect(pendencias.getByText('aguardando validação')).toBeVisible()
})

function planilhaTeste(): Buffer {
  const linhas = [
    ['Contrato', 'ROTINA'],
    ['Ativo', 'TAG-TESTE'],
    ['Início', new Date(2026, 8, 21)],
    ['Término', new Date(2026, 9, 20)],
    [],
    [],
    [],
    [],
    ['Item', 'Descrição', 'Prev', 'Exec (%)', 'Observação', 'LAV'],
    [1, 'Viga X', 100, 0.5, null, new Date(2026, 8, 25)],
  ]
  const ws = XLSX.utils.aoa_to_sheet(linhas, { cellDates: true })
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'MC_PAC')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

/** Cria uma pasta real com as planilhas (o input é webkitdirectory: só aceita diretório). */
function pastaCom(dir: string, arquivos: Record<string, Buffer>): string {
  mkdirSync(dir, { recursive: true })
  for (const [nome, buf] of Object.entries(arquivos)) writeFileSync(join(dir, nome), buf)
  return dir
}

test('Atualizar carga produção: lê a planilha e grava via rdc_admin_mc_importar', async ({ page }, testInfo) => {
  await logar(page)
  await page.getByRole('button', { name: 'Atualizar carga produção' }).click()

  // Regressão: o atributo ficava ausente e o navegador abria o seletor de arquivos, não de pasta.
  const input = page.locator('input[type="file"]')
  await expect(input).toHaveAttribute('webkitdirectory', '')

  await input.setInputFiles(pastaCom(testInfo.outputPath('memorias'), { 'planilha-teste.xlsx': planilhaTeste() }))

  await expect(page.getByText(/Carga concluída:/)).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(/Gravada: planilha-teste\.xlsx\|MC_PAC — 1 itens, 0 lançamentos diários/)).toBeVisible()
})

test('Atualizar carga produção: cópia duplicada já gravada é removida sem acusar erro', async ({ page }, testInfo) => {
  // O banco já tem a chave da cópia; a leitura a detecta como duplicada e pede 'remover'.
  await page.route('**/rest/v1/rpc/rdc_admin_mc_status', (route) =>
    route.fulfill({ json: { ok: true, nome: 'Admin Teste', arquivos: [{ chave: 'b-copia.xlsx|MC_PAC', sha1: 'antigo' }] } }),
  )
  await logar(page)
  await page.getByRole('button', { name: 'Atualizar carga produção' }).click()
  const buf = planilhaTeste()
  await page.locator('input[type="file"]').setInputFiles(pastaCom(testInfo.outputPath('memorias'), { 'a-original.xlsx': buf, 'b-copia.xlsx': buf }))

  await expect(page.getByText(/Carga concluída:/)).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('Removida do banco (conteúdo repetido): b-copia.xlsx|MC_PAC')).toBeVisible()
  await expect(page.getByText(/^Erro —/)).toHaveCount(0)
})
