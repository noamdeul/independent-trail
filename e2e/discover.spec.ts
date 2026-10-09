import { expect, test, type Page } from '@playwright/test'

// "מגלים את הסיפור": a manual hand-off to the official trail app, the written
// story as an alternative, and coming back to the exact same point.

const card = (page: Page) => page.getByRole('region', { name: 'מגלים את הסיפור' })
const watched = (page: Page) => page.getByRole('button', { name: /^צפינו \/ האזנו, ממשיכים|^צפיתי \/ האזנתי, ממשיכים/ })

async function setPeople(page: Page, names: string[]) {
  const rows = page.locator('.person')
  while ((await rows.count()) < names.length) await page.getByRole('button', { name: 'הוספת משתתף/ת' }).click()
  while ((await rows.count()) > names.length) await rows.last().getByRole('button', { name: /^הסרת/ }).click()
  for (let i = 0; i < names.length; i++) await page.getByLabel(`משתתף/ת ${i + 1}`, { exact: true }).fill(names[i])
}

/** What the browser does when you switch to another app. */
async function leaveForAnotherApp(page: Page) {
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
}

test.beforeEach(async ({ page }) => {
  await page.goto('./')
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.goto('./')
})

test('discovery card: prep question, station name, store link only, then the mission', async ({ page }) => {
  await page.getByRole('button', { name: 'מתחילים', exact: true }).click()
  const c = card(page)
  await expect(c).toContainText('שאלת הכנה: גלו פרט אחד על החיים בעיר הצעירה.')
  await expect(c).toContainText('התחנה באפליקציה: הקיוסק הראשון')
  await expect(c).toContainText(
    'עברו לאפליקציית שביל העצמאות, בחרו בתחנה הזו וצפו או האזינו לקטע. לאחר מכן חזרו לכאן.',
  )
  const store = c.getByRole('link', { name: /להתקנת האפליקציה באייפון/ })
  await expect(store).toHaveAttribute('href', 'https://apps.apple.com/il/app/id1422469642')
  await expect(c).toContainText('זה קישור לחנות האפליקציות, לא לתחנה.')
  // nothing pretends to open the station or play the clip
  await expect(c.getByRole('link')).toHaveCount(1)
  await expect(page.locator('video, audio, iframe')).toHaveCount(0)
  await expect(page.getByText(/פתיחת התחנה|פתיחת הקטע/)).toHaveCount(0)
  // the mission waits for a choice, and the story is not shown twice
  await expect(page.locator('section.mission')).toHaveCount(0)
  await expect(page.getByText('המשימה תופיע אחרי שבוחרים איך מגלים את הסיפור.')).toBeVisible()
  await expect(page.locator('.story-text')).toHaveCount(0)

  await watched(page).click()
  await expect(page.getByRole('heading', { name: 'מה גיליתם?' })).toBeVisible()
  await expect(page.getByText('שתפו פרט אחד לפני שמתחילים במשימה.')).toBeVisible()
  await expect(page.locator('section.mission')).toBeVisible()
  // the written story is folded, but still there
  await expect(page.locator('.story-text')).toHaveCount(0)
  await page.getByRole('button', { name: 'הסיפור הכתוב (לא חובה)' }).click()
  await expect(page.locator('.story-text')).toContainText('בשנת 1910 הוקם כאן הקיוסק הראשון')

  await page.getByLabel('הפרט שגילינו (לא חובה)').fill('הפנס הראשון')
  await page.getByRole('button', { name: 'שיתפנו' }).click()
  await expect(page.getByRole('button', { name: 'שיתפנו' })).toHaveAttribute('aria-pressed', 'true')

  await page.reload()
  await expect(page.getByLabel('הפרט שגילינו (לא חובה)')).toHaveValue('הפנס הראשון')
  await expect(page.locator('section.mission')).toBeVisible()

  await page.goto('./#/finish')
  await page.getByRole('button', { name: /הצגת התשובות/ }).click()
  await expect(page.locator('.answers')).toContainText('מגלים את הסיפור: צפינו או האזנו באפליקציה הרשמית. מה גילינו: הפנס הראשון')
})

test('the written story path, and changing your mind', async ({ page }) => {
  await page.goto('./#/station/mosaic')
  await expect(card(page)).toContainText('שאלת הכנה: שימו לב כיצד תמונות מספרות על תקופות שונות.')
  await page.getByRole('button', { name: 'ממשיכים עם הסיפור הכתוב' }).click()
  await expect(page.locator('.story-text')).toContainText('נחום גוטמן היה צייר')
  await expect(page.locator('section.mission')).toBeVisible()
  await page.getByRole('button', { name: 'מעדיפים וידאו או קריינות?' }).click()
  await expect(card(page)).toBeVisible()
  await watched(page).click()
  await expect(page.locator('.story-text')).toHaveCount(0)
  // the mission stays open now that it has started
  await expect(page.locator('section.mission')).toBeVisible()
})

test('switching to the official app and back restores the station, step, answers and scroll', async ({ page }) => {
  await page.getByRole('button', { name: 'מתחילים', exact: true }).click()
  await page.getByRole('button', { name: 'סיימנו את התחנה' }).click()
  await page.getByRole('button', { name: 'סיימנו את התחנה' }).click()
  // station 3: open the second step and answer it
  await expect(page).toHaveURL(/#\/station\/weiss-house$/)
  await watched(page).click()
  await page.getByRole('button', { name: /^לשלב הבא/ }).click()
  const match = page.locator('section.step').first()
  await match.getByRole('group', { name: /משפחת שקט/ }).getByRole('button', { name: 'מגרש ב' }).click()
  await page.getByRole('button', { name: 'מגרילים!' }).scrollIntoViewIfNeeded()
  const y = await page.evaluate(() => window.scrollY)
  expect(y).toBeGreaterThan(200)

  await leaveForAnotherApp(page)
  // the browser may throw the page away while the other app is open
  await page.reload()

  await expect(page).toHaveURL(/#\/station\/weiss-house$/)
  await expect(page.locator('section.step')).toHaveCount(2)
  await expect(
    page.locator('section.step').first().getByRole('group', { name: /משפחת שקט/ }).getByRole('button', { name: 'מגרש ב' }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(y - 50)
})

test('playing alone uses personal wording', async ({ page }) => {
  await setPeople(page, ['רוני'])
  await page.getByRole('button', { name: 'מתחילים', exact: true }).click()
  await expect(card(page)).toContainText('עוברים לאפליקציית שביל העצמאות, בוחרים בתחנה הזו')
  await page.getByRole('button', { name: 'צפיתי / האזנתי, ממשיכים' }).click()
  await expect(page.getByRole('heading', { name: 'מה גילית?' })).toBeVisible()
  await expect(page.locator('section.discover').getByRole('button', { name: 'עניתי בעל פה', exact: true })).toBeVisible()
})

test('in team mode the whole group watches once, and every team gets the mission', async ({ page }) => {
  await setPeople(page, ['א', 'ב', 'ג', 'ד', 'ה', 'ו'])
  await page.getByRole('radio', { name: 'צוותים של 2–4' }).check()
  await page.getByRole('button', { name: 'מתחילים', exact: true }).click()
  await watched(page).click()
  const teams = page.getByRole('group', { name: 'הצוות שעונה עכשיו במכשיר:' })
  await teams.getByRole('button', { name: 'צוות ב' }).click()
  await expect(page.locator('section.mission')).toBeVisible()
  await expect(card(page)).toHaveCount(0)
  await teams.getByRole('button', { name: 'צוות א' }).click()
  await expect(page.locator('section.mission')).toBeVisible()
})

test('the about screen does not promise offline media', async ({ page }) => {
  await page.goto('./#/about')
  await expect(page.getByText(/גם הווידאו והקריינות באפליקציה הרשמית עשויים לדרוש חיבור/)).toBeVisible()
  await expect(page.getByText(/אין קישורים מאומתים לפתיחת תחנה מסוימת באפליקציה הרשמית/)).toBeVisible()
})
