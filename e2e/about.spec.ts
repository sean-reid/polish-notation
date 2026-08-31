import { expect, test } from '@playwright/test'

test('about tab shows history and references', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'About' }).click()
  await expect(page.getByRole('heading', { name: 'Why it needs no parentheses' })).toBeVisible()
  await expect(page.locator('.references li')).toHaveCount(9)
  await expect(page).toHaveURL(/#about$/)
})
