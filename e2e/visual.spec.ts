import { expect, test } from '@playwright/test'

// Regression screenshots of the rendered formulas; review the images in
// e2e/__screenshots__ whenever they change.
const CASES: [string, string][] = [
  ['syllogism', 'CCpqCCqrCpr'],
  ['modal-duality', 'EMpNLNp'],
  ['quantified', '∀x (φ → ψ) → (∀x φ → ∀x ψ)'],
  ['subscripts-primes', "CKp1p2Ap1'q_{12}"],
  ['sheffer', 'DDpqDpq'],
]

for (const [name, formula] of CASES) {
  test(`renders ${name}`, async ({ page }) => {
    await page.goto('/')
    await page.getByRole('textbox').fill(formula)
    const cards = page.locator('.cards')
    await expect(cards.locator('svg')).toHaveCount(2)
    await expect(cards).toHaveScreenshot(`${name}.png`)
  })
}

test('renders the converter in dark mode', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/')
  await page.getByRole('textbox').fill('CKpqr')
  await expect(page.locator('.cards svg')).toHaveCount(2)
  await expect(page.locator('.cards')).toHaveScreenshot('dark-mode.png')
})
