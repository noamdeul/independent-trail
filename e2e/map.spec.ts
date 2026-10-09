import { expect, test, type Page } from '@playwright/test'

// The illustrated trail map: shown, accessible, under the repository path, and offline.

async function mapLoaded(page: Page) {
  const img = page.locator('.trail-map img')
  await expect(img).toBeVisible()
  await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBe(1179)
}

test('the stations screen shows the map with alt text, a full-size link and map numbers', async ({ page }) => {
  await page.goto('./#/stations')
  await mapLoaded(page)
  const img = page.locator('.trail-map img')
  await expect(img).toHaveAttribute('alt', /מפה מאוירת של שביל העצמאות/)
  const src = (await img.getAttribute('src'))!
  expect(new URL(src, page.url()).pathname).toMatch(/^\/independent-trail\/assets\/trail-map-.+\.webp$/)
  await expect(page.getByRole('link', { name: /פתיחת המפה בגודל מלא/ }).last()).toHaveAttribute('href', src)
  await expect(page.getByText(/המספרים במפה הם של המסלול הרשמי/)).toBeVisible()
  await expect(page.locator('.station-row').nth(4)).toContainText('במפה: 8')
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)

  await page.goto('./#/station/independence-hall')
  await page.getByRole('link', { name: 'במפת השביל: תחנה 10' }).click()
  await expect(page).toHaveURL(/#\/stations$/)
})

test('the map is available offline after the first visit', async ({ page, context }) => {
  await page.goto('./')
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true))
  await page.reload()
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)
  await context.setOffline(true)
  await page.goto('./#/stations')
  await page.reload()
  await mapLoaded(page)
  await context.setOffline(false)
})
