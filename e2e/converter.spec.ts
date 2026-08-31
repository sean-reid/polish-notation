import { expect, test, type Page } from '@playwright/test'

const input = (page: Page) => page.getByRole('textbox')
const renderedSvg = (page: Page) => page.locator('.formula-svg svg')

test('converts Polish notation to conventional notation', async ({ page }) => {
  await page.goto('/')
  await input(page).fill('CKpqr')
  await expect(page.getByTestId('badge')).toHaveText('Polish notation')
  await expect(renderedSvg(page)).toHaveCount(2)
  await expect(page.locator('.latex-source').nth(0)).toHaveText('CKpqr')
  await expect(page.locator('.latex-source').nth(1)).toHaveText('p \\land q \\to r')
})

test('converts conventional notation to Polish notation', async ({ page }) => {
  await page.goto('/')
  await input(page).fill('~(p & q) <-> (~p \\/ ~q)')
  await expect(page.getByTestId('badge')).toHaveText('Conventional notation')
  await expect(page.locator('.latex-source').nth(0)).toHaveText('ENKpqANpNq')
})

test('click on the rendered formula copies its LaTeX', async ({ page }) => {
  await page.goto('/')
  await input(page).fill('CKpqr')
  await page.locator('.formula').nth(1).click()
  await expect(page.locator('.copied').nth(1)).toHaveClass(/show/)
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('p \\land q \\to r')
})

test('downloads SVG and PNG images of the formula', async ({ page }) => {
  await page.goto('/')
  await input(page).fill('EMpNLNp')
  await expect(renderedSvg(page)).toHaveCount(2)

  const svgDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'SVG' }).first().click()
  expect((await svgDownload).suggestedFilename()).toBe('polish-notation.svg')

  const pngDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'PNG' }).first().click()
  expect((await pngDownload).suggestedFilename()).toBe('polish-notation.png')
})

test('invalid input shows a positioned hint and keeps the last good result dimmed', async ({
  page,
}) => {
  await page.goto('/')
  await input(page).fill('CKpqr')
  await expect(renderedSvg(page)).toHaveCount(2)
  await input(page).fill('CKpq')
  await expect(page.getByTestId('error')).toContainText("'C' needs 1 more argument")
  await expect(page.getByTestId('badge')).toContainText('Not yet valid Polish notation')
  await expect(page.locator('.card.stale')).toHaveCount(2)
  await input(page).fill('CKpqr')
  await expect(page.locator('.card.stale')).toHaveCount(0)
})

test('example chips fill the input', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: "Peirce's law" }).click()
  await expect(input(page)).toHaveValue('CCCpqpp')
  await expect(page.locator('.latex-source').nth(1)).toHaveText('((p \\to q) \\to p) \\to p')
})

test('supported syntax reference lists the operator table', async ({ page }) => {
  await page.goto('/')
  await page.getByText('Supported syntax').click()
  await expect(page.getByRole('cell', { name: 'Non-conjunction' })).toBeVisible()
})

test('buttons meet the 44px touch target size', async ({ page }) => {
  await page.goto('/')
  await input(page).fill('CKpqr')
  for (const button of await page.getByRole('button').all()) {
    if (!(await button.isVisible())) continue
    const box = await button.boundingBox()
    expect(box, await button.textContent()).not.toBeNull()
    expect(box!.height, await button.textContent()).toBeGreaterThanOrEqual(44)
  }
})
