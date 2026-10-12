import { expect, test, type Page } from '@playwright/test'
import { instalarMocks, logar } from './fixtures/mocks'

/**
 * Layout responsivo e acessibilidade básica (docs/UX_UI_AUDIT.md).
 * Capturas ficam em test-results/visual/ (ignorado pelo git) para inspeção.
 */
const VIEWPORTS = [
  { nome: 'desktop', width: 1440, height: 900 },
  { nome: 'notebook', width: 1024, height: 768 },
  { nome: 'tablet', width: 768, height: 1024 },
  { nome: 'celular', width: 390, height: 844 },
]

const TELAS = ['Contexto', 'Desempenho', 'Comparação', 'Desvios', 'Detalhamento']

async function abrirTela(page: Page, tela: string) {
  const menu = page.getByRole('button', { name: 'Menu e filtros' })
  if (await menu.isVisible()) await menu.click()
  await page.getByRole('navigation', { name: 'Telas do painel' }).getByRole('button', { name: tela }).click()
  await expect(page.getByRole('heading', { level: 2, name: tela, exact: true })).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await instalarMocks(page)
})

for (const vp of VIEWPORTS) {
  test(`sem rolagem horizontal da página em ${vp.width}x${vp.height}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await logar(page)
    for (const tela of TELAS) {
      await abrirTela(page, tela)
      await page.waitForTimeout(150) // ResizeObserver/ECharts
      const larguras = await page.evaluate(() => ({
        doc: document.documentElement.scrollWidth,
        janela: window.innerWidth,
        main: (() => {
          const m = document.querySelector('main')!
          return { scroll: m.scrollWidth, client: m.clientWidth }
        })(),
      }))
      expect(larguras.doc, `${tela}: documento mais largo que a janela`).toBeLessThanOrEqual(larguras.janela)
      expect(larguras.main.scroll, `${tela}: conteúdo transborda o <main>`).toBeLessThanOrEqual(larguras.main.client)
      await page.screenshot({ path: `test-results/visual/${vp.nome}-${tela}.png`, fullPage: true })
    }
  })
}

test('celular: navegação e filtros ficam numa gaveta que fecha com Esc', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await logar(page)
  const nav = page.getByRole('navigation', { name: 'Telas do painel' })
  await expect(nav).toBeHidden()
  await page.getByRole('button', { name: 'Menu e filtros' }).click()
  await expect(page.getByRole('dialog', { name: 'Menu e filtros' })).toBeVisible()
  await page.screenshot({ path: 'test-results/visual/celular-gaveta.png' })
  await page.keyboard.press('Escape')
  await expect(nav).toBeHidden()
})

test('atalho de pendências filtra "Enviado" e abre o Detalhamento com o filtro visível', async ({ page }) => {
  await logar(page)
  await page.getByRole('button', { name: 'Ver no Detalhamento' }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Detalhamento', exact: true })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Filtros ativos' })).toContainText('Status: Enviado')
  await expect(page.getByRole('cell', { name: 'Maria Souza' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'João Lima' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Remover filtro Status' }).click()
  await expect(page.getByRole('cell', { name: 'João Lima' })).toBeVisible()
})

test('ordenação da tabela é acessível por teclado e expõe aria-sort', async ({ page }) => {
  await logar(page)
  await page.getByRole('button', { name: 'Detalhamento', exact: true }).click()
  const th = page.getByRole('columnheader', { name: /Responsável/ })
  await expect(th).toHaveAttribute('aria-sort', 'none')
  await th.getByRole('button').focus()
  await page.keyboard.press('Enter')
  await expect(th).toHaveAttribute('aria-sort', 'ascending')
})

test('diálogo de carga fecha com Esc e devolve o foco', async ({ page }) => {
  await logar(page)
  const abrir = page.getByRole('button', { name: 'Atualizar carga produção' })
  await abrir.click()
  await expect(page.getByRole('dialog', { name: 'Atualizar carga produção' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(abrir).toBeFocused()
})

test('gráficos têm descrição textual e números de eixo em pt-BR', async ({ page }) => {
  await logar(page)
  await page.getByRole('button', { name: 'Desempenho' }).click()
  await expect(page.getByRole('img', { name: /HH trabalhado por disciplina: PAC 8,0 HH/ })).toBeVisible()
  const erros: string[] = []
  page.on('console', (m) => m.type() === 'error' && erros.push(m.text()))
  await page.getByRole('button', { name: 'Desvios' }).click()
  await expect(page.getByRole('img', { name: /por responsável/ })).toBeVisible()
  expect(erros).toEqual([])
})
