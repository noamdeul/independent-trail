import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

const shots = process.env.SCREENSHOT_DIR

async function snap(page: Page, name: string) {
  if (shots) await page.screenshot({ path: `${shots}/${name}.png`, fullPage: true })
}

async function expectNoHorizontalScroll(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
}

async function expectTapTargets(page: Page) {
  const small = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('.btn, .topnav a, .dots a, .disclosure-button, .station-row, .radio, .brand, .links a')]
      .filter((el) => el.offsetParent !== null)
      .map((el) => ({ text: el.textContent?.trim(), ...el.getBoundingClientRect().toJSON() }))
      .filter((r) => r.width < 44 || r.height < 44),
  )
  expect(small).toEqual([])
}

test.beforeEach(async ({ page }) => {
  await page.goto('./')
  await page.evaluate(() => localStorage.clear())
  await page.goto('./')
})

test('welcome screen is Hebrew RTL and fits 375px', async ({ page }) => {
  await expect(page.locator('html')).toHaveAttribute('lang', 'he')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByRole('heading', { level: 1, name: 'הרפתקה בשדרה' })).toBeVisible()
  await expect(page.getByText('7 תחנות')).toBeVisible()
  await expect(page.getByText('כ־60–90 דקות (הערכה)')).toBeVisible()
  await expect(page.getByLabel('מבוגר/ת')).toHaveValue('נועם')
  await expect(page.getByLabel('ילד/ה ראשון/ה')).toHaveValue('עומרי')
  await expect(page.getByLabel('ילד/ה שני/ה')).toHaveValue('אלה')
  await expect(page.getByText('מים לכל אחד')).toBeVisible()
  await expect(page.getByRole('button', { name: 'ממשיכים מאיפה שעצרנו' })).toHaveCount(0)
  await expectNoHorizontalScroll(page)
  await expectTapTargets(page)
  await snap(page, '01-welcome')
})

test('full family flow: names, roles, complete, skip, refresh, revisit, finish, reset', async ({ page }) => {
  await page.getByLabel('ילד/ה שני/ה').fill('אלה מאיה')
  await page.getByRole('button', { name: 'מתחילים', exact: true }).click()

  // Station 1
  await expect(page).toHaveURL(/#\/station\/kiosk$/)
  await expect(page.getByText('תחנה 1 מתוך 7')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('הקיוסק הראשון')
  const roles = page.getByRole('region', { name: 'תפקידים בתחנה' })
  await expect(roles).toContainText('מנווט/ת עומרי')
  await expect(roles).toContainText('מקריא/ה אלה מאיה')
  await roles.getByRole('button', { name: 'החלפת תפקידים' }).click()
  await expect(roles).toContainText('מנווט/ת אלה מאיה')

  // Reveal is hidden until asked for; no hint on this creative station
  await expect(page.getByText('כל שם וכל רשימה מתאימים')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'צריכים רמז?' })).toHaveCount(0)
  await page.getByRole('button', { name: 'הסבר ורעיונות' }).click()
  await expect(page.getByText(/כל שם וכל רשימה מתאימים/)).toBeVisible()

  await page.getByLabel('מה חשבנו? (לא חובה)').fill('קיוסק הגזוז של השדרה: גזוז, ארטיק, מים')
  await expectNoHorizontalScroll(page)
  await expectTapTargets(page)
  await snap(page, '02-station-1')
  await page.getByRole('button', { name: 'סיימנו את התחנה' }).click()

  // Station 2: skip without writing anything
  await expect(page).toHaveURL(/#\/station\/mosaic$/)
  await expect(page.getByText('תחנה 2 מתוך 7')).toBeVisible()
  await expect(page.getByText('ייתכן שהמזרקה לא פועלת')).toBeVisible()
  await page.getByRole('button', { name: 'צריכים רמז?' }).click()
  await expect(page.getByText(/רמז טוב מתאר צבע/)).toBeVisible()
  await page.getByRole('button', { name: 'דילוג, נחזור אחר כך' }).click()

  // Station 3, then refresh: progress and position survive
  await expect(page).toHaveURL(/#\/station\/weiss-house$/)
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('בית עקיבא אריה ויס')

  // Back on the welcome screen we can resume
  await page.getByRole('link', { name: /למסך הפתיחה/ }).click()
  await expect(page.getByLabel('ילד/ה שני/ה')).toHaveValue('אלה מאיה')
  await page.getByRole('button', { name: 'ממשיכים מאיפה שעצרנו' }).click()
  await expect(page).toHaveURL(/#\/station\/weiss-house$/)

  // All stations list shows statuses
  await page.getByRole('link', { name: 'תחנות' }).click()
  const rows = page.locator('.station-row')
  await expect(rows).toHaveCount(7)
  await expect(rows.nth(0)).toContainText('הושלמה')
  await expect(rows.nth(1)).toContainText('דולגה')
  await expect(rows.nth(2)).toContainText('טרם ביקרנו')
  await expect(rows.nth(2)).toContainText('כאן עצרנו')
  await expectNoHorizontalScroll(page)
  await snap(page, '03-stations')

  // Go back to the skipped station and complete it
  await rows.nth(1).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('מזרקת הפסיפס של נחום גוטמן')
  await page.getByRole('button', { name: 'סיימנו את התחנה' }).click()
  await expect(page).toHaveURL(/#\/station\/weiss-house$/)

  // Complete the rest
  for (let i = 3; i <= 7; i++) {
    await expect(page.getByText(`תחנה ${i} מתוך 7`)).toBeVisible()
    if (i === 7) {
      await expect(page.getByText('היכל העצמאות: סגור לשיפוצים')).toBeVisible()
      await expect(page.getByText('התחנה מתוכננת לביקור מבחוץ בלבד.')).toBeVisible()
      await page.getByLabel('מה חשבנו? (לא חובה)').fill('"נולדה מדינה!" ושאלה: מה הרגשת?')
      await snap(page, '04-station-7')
    }
    await page.getByRole('button', { name: 'סיימנו את התחנה' }).click()
  }

  // Finish
  await expect(page).toHaveURL(/#\/finish$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('כל הכבוד, סיימתם!')
  await expect(page.locator('.big-count')).toContainText('7 מתוך 7')
  await expect(page.getByText('קיוסק הגזוז של השדרה')).toBeVisible()
  await expect(page.getByText(/גלידה/)).toBeVisible()
  await page.getByRole('radio', { name: 'פסל מאיר דיזנגוף' }).check()
  await page.reload()
  await expect(page.getByRole('radio', { name: 'פסל מאיר דיזנגוף' })).toBeChecked()
  await expectNoHorizontalScroll(page)
  await expectTapTargets(page)
  await snap(page, '05-finish')

  // Download summary
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'הורדת סיכום (קובץ טקסט)' }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/^shdera-summary-\d{4}-\d{2}-\d{2}\.txt$/)
  const text = readFileSync((await download.path())!, 'utf8')
  expect(text).toContain('נועם, עומרי ואלה מאיה')
  expect(text).toContain('הושלמו 7 מתוך 7')
  expect(text).toContain('התחנה האהובה: פסל מאיר דיזנגוף')
  expect(text).toContain('קיוסק הגזוז של השדרה')

  // Reset needs confirmation; cancel keeps everything
  await page.getByRole('button', { name: 'איפוס' }).click()
  await page.getByRole('button', { name: 'ביטול' }).click()
  await expect(page.locator('.big-count')).toContainText('7 מתוך 7')
  await page.getByRole('button', { name: 'איפוס' }).click()
  await expect(page.getByRole('alertdialog')).toContainText('למחוק את כל ההתקדמות?')
  await page.getByRole('button', { name: 'כן, למחוק' }).click()
  await expect(page).toHaveURL(/#\/$/)
  await page.reload()
  await expect(page.getByRole('button', { name: 'מתחילים', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'ממשיכים מאיפה שעצרנו' })).toHaveCount(0)
  // Names are kept after reset
  await expect(page.getByLabel('ילד/ה שני/ה')).toHaveValue('אלה מאיה')
})

test('navigation links open Google Maps walking directions with Hebrew queries', async ({ page }) => {
  await page.goto('./#/station/kiosk')
  const link = page.getByRole('link', { name: /ניווט בהליכה/ })
  await expect(link).toHaveAttribute('target', '_blank')
  const href = (await link.getAttribute('href'))!
  const url = new URL(href)
  expect(url.origin + url.pathname).toBe('https://www.google.com/maps/dir/')
  expect(url.searchParams.get('api')).toBe('1')
  expect(url.searchParams.get('travelmode')).toBe('walking')
  expect(url.searchParams.get('destination')).toBe('שדרות רוטשילד 10, תל אביב-יפו')
  expect(href).not.toMatch(/[֐-׿]/)

  await page.goto('./#/station/independence-hall')
  const hall = new URL((await page.getByRole('link', { name: /ניווט בהליכה/ }).getAttribute('href'))!)
  expect(hall.searchParams.get('destination')).toBe('היכל העצמאות, שדרות רוטשילד 16, תל אביב-יפו')
})

test('about screen lists sources, cautions and what was not verified', async ({ page }) => {
  await page.getByRole('link', { name: 'על המסלול ומקורות' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('על המסלול ומקורות')
  await expect(page.getByText(/זה לא המסלול הרשמי המלא/)).toBeVisible()
  await expect(page.getByText(/פס הסימון/)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'מה לא אומת' })).toBeVisible()
  await expect(page.locator('a[href*="tel-aviv.gov.il"]')).toBeVisible()
  await expectNoHorizontalScroll(page)
  await snap(page, '06-about')
})

test('works under the repository path and offline after the first visit', async ({ page, context }) => {
  // Assets are loaded relative to /independent-trail/, not from the domain root
  const requests: string[] = []
  page.on('request', (r) => requests.push(new URL(r.url()).pathname))
  await page.reload()
  expect(requests.filter((p) => !p.startsWith('/independent-trail/'))).toEqual([])

  // First visit installs the service worker; a later visit is controlled by it.
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true))
  await page.reload()
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'הרפתקה בשדרה' })).toBeVisible()
  await expect(page.getByText('אין חיבור לאינטרנט')).toBeVisible()
  await page.getByRole('button', { name: 'מתחילים', exact: true }).click()
  await expect(page.getByText('תחנה 1 מתוך 7')).toBeVisible()
  await expect(page.getByText(/בשנת 1910/)).toBeVisible()
  await page.goto('./#/station/independence-hall')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('היכל העצמאות')
  await snap(page, '07-offline')
  await context.setOffline(false)
})

test('keeps working when localStorage is unavailable', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 },
    baseURL: 'http://localhost:4173/independent-trail/',
  })
  await context.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('denied', 'SecurityError')
      },
    })
  })
  const page = await context.newPage()
  await page.goto('./')
  await expect(page.getByText('השמירה במכשיר לא זמינה')).toBeVisible()
  await page.getByRole('button', { name: 'מתחילים', exact: true }).click()
  await page.getByRole('button', { name: 'סיימנו את התחנה' }).click()
  await expect(page.getByText('תחנה 2 מתוך 7')).toBeVisible()
  await page.getByRole('link', { name: 'תחנות' }).click()
  await expect(page.locator('.station-row').first()).toContainText('הושלמה')
  await context.close()
})

test('respects reduced motion', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce', baseURL: 'http://localhost:4173/independent-trail/' })
  const page = await context.newPage()
  await page.goto('./')
  const duration = await page.locator('.btn-primary').evaluate((el) => getComputedStyle(el).transitionDuration)
  expect(duration).toMatch(/^0s/)
  await context.close()
})
