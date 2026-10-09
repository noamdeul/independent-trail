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
    [
      ...document.querySelectorAll<HTMLElement>(
        '.btn, .topnav a, .dots a, .disclosure-button, .station-row, .radio, .brand, .links a, .toggle, .card-btn, .segmented button, .order-buttons button',
      ),
    ]
      .filter((el) => el.offsetParent !== null)
      .map((el) => ({ text: el.textContent?.trim(), ...el.getBoundingClientRect().toJSON() }))
      .filter((r) => r.width < 44 || r.height < 44),
  )
  expect(small).toEqual([])
}

/** A mission step section, found by its title. */
const step = (page: Page, title: string) =>
  page.locator('section.step').filter({ has: page.locator('h3', { hasText: title }) })

const nextStep = (page: Page) => page.getByRole('button', { name: /^לשלב הבא/ }).click()

/** The tests below are about missions: continue with the written story when the discovery card asks. */
async function readStory(page: Page) {
  const choice = page.getByRole('button', { name: 'ממשיכים עם הסיפור הכתוב' })
  await choice.or(page.locator('section.mission')).first().waitFor()
  if (await choice.isVisible()) await choice.click()
}

test.beforeEach(async ({ page }) => {
  await page.goto('./')
  await page.evaluate(() => localStorage.clear())
  await page.goto('./')
})

test('welcome screen: Hebrew RTL, frame story, route modes, fits 375px', async ({ page }) => {
  await expect(page.locator('html')).toHaveAttribute('lang', 'he')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByRole('heading', { level: 1, name: 'הרפתקה בשדרה' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'איך בונים עיר?' })).toBeVisible()
  await expect(page.getByText(/משחק בדיוני בהשראת ההיסטוריה/).first()).toBeVisible()
  await expect(page.getByRole('radio', { name: /רגילה, כ־90–120 דקות/ })).toBeChecked()
  await expect(page.getByText('כ־90–120 דקות (הערכה)')).toBeVisible()
  await page.getByRole('radio', { name: /קלילה/ }).check()
  await expect(page.getByText('כ־60–90 דקות (הערכה)')).toBeVisible()
  await expect(page.getByLabel('משתתף/ת 1', { exact: true })).toHaveValue('')
  await expect(page.getByLabel('משתתף/ת 2', { exact: true })).toHaveValue('')
  await expect(page.getByLabel('משתתף/ת 3', { exact: true })).toHaveValue('')
  await expect(page.locator('.person-age input')).toHaveCount(3)
  // no ages, no suggestion; an age only suggests a level, never switches it
  await expect(page.getByText(/הצעה לפי הגילים:/)).toHaveCount(0)
  await page.locator('.person-age input').first().fill('13')
  await expect(page.getByText(/הצעה לפי הגילים:/)).toContainText('מאתגרת')
  await expect(page.getByRole('radio', { name: /קלילה/ })).toBeChecked()
  await expectNoHorizontalScroll(page)
  await expectTapTargets(page)
  await snap(page, '01-welcome')
})

test('full family flow through the interactive missions to "our city"', async ({ page }) => {
  await page.getByLabel('משתתף/ת 1', { exact: true }).fill('דנה')
  await page.getByLabel('משתתף/ת 2', { exact: true }).fill('גיל')
  await page.getByLabel('משתתף/ת 3', { exact: true }).fill('רוני')
  await page.getByRole('radio', { name: /מאתגרת/ }).check()
  await page.getByRole('button', { name: 'מתחילים', exact: true }).click()
  await readStory(page)

  // ---- Station 1: story, roles, more, progressive steps, budget, choice, bonus
  await expect(page).toHaveURL(/#\/station\/kiosk$/)
  await readStory(page)
  await expect(page.getByText('תחנה 1 מתוך 7')).toBeVisible()
  await expect(page.locator('.story-text')).toContainText('בשנת 1910 הוקם כאן הקיוסק הראשון')
  const roles = page.getByRole('region', { name: 'תפקידים בתחנה' })
  await expect(roles.locator('.role-list li')).toHaveText(['דנה ניווט, תיעוד', 'גיל הקראה, הצגת החלטה', 'רוני חיפוש בשטח'])
  await roles.getByRole('button', { name: 'החלפת תפקידים' }).click()
  await expect(roles.locator('.role-list li').first()).toHaveText('דנה חיפוש בשטח')

  // challenge level: the extra reading is already open
  await expect(page.getByText(/קיוסק יכול להיות יותר מחנות/)).toBeVisible()

  await expect(page.locator('section.step')).toHaveCount(1)
  await step(page, 'חיפוש ראיות').getByLabel('דבר ראשון').fill('עצים')
  await step(page, 'חיפוש ראיות').getByRole('button', { name: 'לא מצאנו' }).nth(1).click()
  await nextStep(page)

  const budget = step(page, 'אתגר תקציב')
  await budget.getByRole('button', { name: /^הצללה/ }).click()
  await budget.getByRole('button', { name: /^ספסל/ }).click()
  await expect(budget.locator('.meter')).toContainText('נשארו 3')
  await expect(budget.getByRole('button', { name: /^שלט ברור/ })).not.toHaveAttribute('aria-disabled', 'true')
  await budget.getByRole('button', { name: /^ברז מי שתייה/ }).click()
  await expect(budget.locator('.meter')).toContainText('נשארו 0')
  // Going over budget is not allowed
  const light = budget.getByRole('button', { name: /^תאורה/ })
  await expect(light).toHaveAttribute('aria-disabled', 'true')
  await light.click({ force: true })
  await expect(light).toHaveAttribute('aria-pressed', 'false')
  await expectNoHorizontalScroll(page)
  await expectTapTargets(page)
  await nextStep(page)

  const decide = step(page, 'החלטה')
  await decide.getByRole('button', { name: /^ילדים/ }).click()
  await decide.getByLabel('איך השדרוגים עוזרים?').fill('צל ומים למי שמשחק')
  await decide.getByRole('button', { name: 'דוגמה למחשבה' }).click()
  await expect(decide.getByText('זו רק דוגמה. אין תשובה אחת נכונה.')).toBeVisible()
  await expect(page.getByRole('button', { name: /^לשלב הבא/ })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'דילמת בונוס (לא חובה)' })).toBeVisible()
  await page.locator('.bonus').getByLabel('התשובה שלנו').fill('על הספסל')
  await snap(page, '02-station-1')
  await page.getByRole('button', { name: 'סיימנו את התחנה' }).click()

  // ---- Station 2: see/think, categorize with graded hints and explicit solution, then skip
  await expect(page).toHaveURL(/#\/station\/mosaic$/)
  await readStory(page)
  await expect(page.getByText('ייתכן שהמזרקה לא פועלת')).toBeVisible()
  await expect(page.getByText(/אם פרט מסוים אינו נראה/)).toBeVisible()
  await step(page, 'התבוננות').getByLabel('ראינו (מה רואים ממש)').first().fill('דג גדול')
  await step(page, 'התבוננות').getByLabel('אנחנו חושבים (מה הוא מספר)').first().fill('סיפור יונה')
  await nextStep(page)
  const sort = step(page, 'חידה')
  await sort.getByRole('group', { name: 'יונה במעי הדג' }).getByRole('button', { name: 'סיפור מקראי' }).click()
  await sort.getByRole('group', { name: 'ביקור הרצל ביפו' }).getByRole('button', { name: 'סיפור מקראי' }).click()
  await expect(sort.getByText(/בפתרון:/)).toHaveCount(0)
  await sort.getByRole('button', { name: 'רמז ראשון' }).click()
  await expect(sort.getByText(/רמז 1:/)).toBeVisible()
  await expect(sort.getByText(/רמז 2:/)).toHaveCount(0)
  await sort.getByRole('button', { name: 'רמז שני' }).click()
  await expect(sort.getByText(/רק כרטיס אחד מגיע מהתנ״ך/)).toBeVisible()
  await sort.getByRole('button', { name: 'הצגת פתרון והסבר' }).click()
  await expect(sort.getByText(/ביקור הרצל ביפו והכרזת העצמאות הם אירועים היסטוריים מתועדים/)).toBeVisible()
  await expect(sort.locator('.cat-solution')).toHaveCount(3)
  await page.getByRole('button', { name: 'דילוג, נחזור אחר כך' }).click()

  // ---- Station 3: match, lottery, rule
  await expect(page).toHaveURL(/#\/station\/weiss-house$/)
  await readStory(page)
  await expect(page.getByText(/איור סכמטי של מגרשים בדיוניים/)).toBeVisible()
  const match = step(page, 'מי גר איפה?')
  await match.getByRole('group', { name: /משפחת שקט/ }).getByRole('button', { name: 'מגרש ב' }).click()
  await match.getByRole('group', { name: /משפחת ילדים/ }).getByRole('button', { name: 'מגרש ג' }).click()
  await match.getByRole('group', { name: /משפחת חנות/ }).getByRole('button', { name: 'מגרש א' }).click()
  await nextStep(page)
  const lottery = step(page, 'הגרלה')
  await expect(lottery.getByText('איזו נותנת סיכוי שווה?')).toBeVisible()
  await lottery.getByRole('button', { name: 'מגרילים!' }).click()
  const rows = lottery.locator('tbody tr')
  await expect(rows).toHaveCount(3)
  await expect(rows.nth(0)).toContainText('משפחת שקט')
  await expect(rows.nth(0)).toContainText('מגרש ב')
  await lottery.getByRole('button', { name: 'רוצים לרשום?' }).click()
  await lottery.getByLabel('האם ״הוגן״ חייב להיות ״אקראי״?').fill('לא תמיד')
  await nextStep(page)
  const rule = step(page, 'הכלל שלנו')
  await rule.getByRole('button', { name: /^שילוב/ }).click()
  await rule.getByLabel('כלל ההוגנות שלנו במשפט אחד').fill('קודם צרכים, ואז הגרלה')
  await expectNoHorizontalScroll(page)
  await expectTapTargets(page)
  await snap(page, '03-station-3')

  // Refresh: answers and open steps survive
  await page.reload()
  await expect(step(page, 'הכלל שלנו').getByRole('button', { name: /^שילוב/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(step(page, 'הגרלה').locator('tbody tr')).toHaveCount(3)
  await page.getByRole('button', { name: 'סיימנו את התחנה' }).click()

  // ---- Station 4: per-plan pros and cons, pick a plan
  await expect(page).toHaveURL(/#\/station\/gymnasium$/)
  await readStory(page)
  await expect(page.getByText(/המבנה הישן נהרס ב־1959/)).toBeVisible()
  await expect(page.getByText(/לא מתוכננת כניסה/)).toBeVisible()
  await expect(step(page, 'כרטיסי נקודת מבט')).toContainText('בקבוצה גדולה כמה אנשים מייצגים אותה עמדה')
  await step(page, 'כרטיסי נקודת מבט').getByRole('button', { name: 'ענינו בעל פה' }).click()
  await nextStep(page)
  const plan = step(page, 'בוחרים תוכנית')
  await plan.getByRole('button', { name: 'רוצים לרשום יתרון וחיסרון?' }).click()
  await plan.getByLabel('יתרון').nth(1).fill('שומרים חלק מהזיכרון')
  await plan.getByRole('button', { name: /^שמירת חלק מהמבנה/ }).click()
  await page.getByRole('button', { name: 'סיימנו את התחנה' }).click()

  // ---- Station 5: order with up/down buttons
  await expect(page).toHaveURL(/#\/station\/founders$/)
  await readStory(page)
  await nextStep(page)
  const order = step(page, 'סדר השכבות')
  // start: city, land, homes -> move city down twice
  await order.getByRole('button', { name: 'הזזת התפתחות עיר למטה' }).click()
  await order.getByRole('button', { name: 'הזזת התפתחות עיר למטה' }).click()
  await expect(order.locator('.order-label')).toHaveText(['הכנת השטח', 'הקמת שכונה ובתים', 'התפתחות עיר'])
  await order.getByRole('button', { name: 'הצגת פתרון והסבר' }).click()
  await expect(order.getByText(/מלמטה למעלה: הכנת השטח/)).toBeVisible()
  await page.getByRole('button', { name: 'סיימנו את התחנה' }).click()

  // ---- Station 6: budget 15, then the cut to 12 starting from the earlier plan
  await expect(page).toHaveURL(/#\/station\/dizengoff-statue$/)
  await readStory(page)
  await nextStep(page)
  const b15 = step(page, 'תקציב של 15')
  await b15.getByRole('button', { name: /^גינה ומגרש משחקים/ }).click()
  await b15.getByRole('button', { name: /^ספרייה/ }).click()
  await b15.getByRole('button', { name: /^ספסלים וברזי מים/ }).click()
  await expect(b15.locator('.meter')).toContainText('נשארו 2')
  await nextStep(page)
  const cut = step(page, 'הודעה דחופה')
  await expect(cut.getByText('התקציב קטן ב־3 נקודות.')).toHaveCount(0)
  await cut.getByRole('button', { name: 'חשפו הודעה' }).click()
  await expect(cut.getByRole('alert')).toContainText('התקציב קטן ב־3 נקודות.')
  await expect(cut.locator('.meter')).toContainText('חריגה של 1')
  await expect(cut.getByText(/התוכנית חורגת מהתקציב/)).toBeVisible()
  await cut.getByRole('button', { name: /^ספסלים וברזי מים/ }).click()
  await expect(cut.locator('.meter')).toContainText('נשארו 1')
  await cut.getByLabel('מה בחרנו להגן עליו').fill('הגינה')
  await snap(page, '04-station-6')
  await page.getByRole('button', { name: 'סיימנו את התחנה' }).click()

  // ---- Station 7: timeline, follow-up, principles, charter
  await expect(page).toHaveURL(/#\/station\/independence-hall$/)
  await readStory(page)
  await expect(page.getByRole('note')).toContainText('היכל העצמאות סגור לשיפוצים לפי הבדיקה מ־9.10.2026.')
  await expect(page.getByRole('note')).toContainText('לא מתוכננת כניסה.')
  const timeline = step(page, 'חידת רצף')
  await expect(timeline.getByText(/כמה שנים חלפו/)).toHaveCount(0)
  // start: declaration, kiosk, gymnasium, ahuzat -> 1909, 1910, 1948, 1959
  const up = (label: string) => timeline.getByRole('button', { name: `הזזת ${label} למעלה` }).click()
  await up('הקמת אחוזת בית: 1909')
  await up('הקמת אחוזת בית: 1909')
  await up('הקמת אחוזת בית: 1909')
  await up('הקמת הקיוסק הראשון: 1910')
  await expect(timeline.locator('.order-label')).toHaveText([
    'הקמת אחוזת בית: 1909',
    'הקמת הקיוסק הראשון: 1910',
    'הכרזת העצמאות: 1948',
    'הריסת מבנה הגימנסיה הישן: 1959',
  ])
  await expect(timeline.getByText('כמה שנים חלפו מהקמת אחוזת בית עד הכרזת העצמאות?')).toBeVisible()
  await timeline.getByLabel('התשובה שלנו').fill('39')
  await timeline.locator('.followup').getByRole('button', { name: 'רמז ראשון' }).click()
  await expect(timeline.getByText(/השוו בין 1909 ל־1948/)).toBeVisible()
  await timeline.getByRole('button', { name: 'הצגת התשובה' }).click()
  await expect(timeline.getByText('39 שנים.')).toBeVisible()
  await nextStep(page)

  const principles = step(page, 'שלושה עקרונות')
  await expect(principles.locator('.plan-reminder')).toContainText('מקום המפגש')
  await principles.getByRole('button', { name: /^חלוקה הוגנת/ }).click()
  await principles.getByRole('button', { name: /^מקום למשחק ולמפגש/ }).click()
  await principles.getByRole('button', { name: /^שמירה על העבר/ }).click()
  await expect(principles.getByRole('button', { name: /^נגישות/ })).toHaveAttribute('aria-disabled', 'true')
  await principles.getByLabel('החלטה מתחנה שמתאימה לעיקרון').first().fill('הכלל מבית ויס')
  await nextStep(page)

  const charter = step(page, 'המגילה')
  await charter.getByLabel('שם הצוות').fill('השדרה')
  await charter.getByLabel('שם העיר').fill('עיר החולות')
  const doc = charter.locator('.charter-doc')
  await expect(doc).toContainText('אנחנו, צוות השדרה, מקימים את העיר עיר החולות.')
  await expect(doc).toContainText('בעיר שלנו חשוב לנו חלוקה הוגנת, מקום למשחק ולמפגש ושמירה על העבר.')
  await expect(doc).toContainText(
    'לכן נבנה גינה ומגרש משחקים וספרייה, נשמור על חלק מהמבנה ההיסטורי ונחליט על חלוקה באמצעות קודם צרכים, ואז הגרלה.',
  )
  await expectNoHorizontalScroll(page)
  await expectTapTargets(page)
  await snap(page, '05-station-7')
  await page.getByRole('button', { name: 'סיימנו את התחנה' }).click()

  // Station 2 was skipped, so we go back to it, answers intact
  await expect(page).toHaveURL(/#\/station\/mosaic$/)
  await readStory(page)
  await expect(step(page, 'חידה').locator('.cat-solution')).toHaveCount(3)
  await page.getByRole('button', { name: 'סיימנו את התחנה' }).click()

  // ---- Finish: "our city" card, answers, favorite, download, reset
  await expect(page).toHaveURL(/#\/finish$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('כל הכבוד, סיימתם!')
  const card = page.locator('.city-card')
  await expect(card.getByRole('heading', { name: 'העיר שלנו: עיר החולות' })).toBeVisible()
  await expect(card).toContainText('הצוות: דנה, גיל ורוני')
  await expect(page.locator('.participants-line')).toHaveText('המשתתפים: דנה, גיל ורוני')
  await expect(card).toContainText('הצללה, ספסל וברז מי שתייה')
  await expect(card).toContainText('קודם צרכים, ואז הגרלה')
  await expect(card).toContainText('שמירת חלק מהמבנה והוספת בנייה חדשה')
  await expect(card).toContainText('הגינה')
  await expect(card.locator('.charter-doc')).toContainText('עיר החולות')
  await expect(card).toContainText('משחק בדיוני בהשראת ההיסטוריה')
  await page.getByRole('button', { name: /הצגת התשובות/ }).click()
  await expect(page.locator('.answers')).toContainText('דג גדול')
  await page.getByRole('radio', { name: 'בית עקיבא אריה ויס' }).check()
  await expectNoHorizontalScroll(page)
  await expectTapTargets(page)
  await snap(page, '06-finish')

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'הורדת ״העיר שלנו״ (קובץ טקסט)' }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/^our-city-\d{4}-\d{2}-\d{2}\.txt$/)
  const text = readFileSync((await download.path())!, 'utf8')
  expect(text).toContain('משתתפים: דנה, גיל ורוני')
  expect(text).toContain('הושלמו 7 מתוך 7')
  expect(text).toContain('התחנה האהובה: בית עקיבא אריה ויס')
  expect(text).toContain('אנחנו, צוות השדרה, מקימים את העיר עיר החולות.')
  expect(text).toContain('בחרנו: הצללה, ספסל וברז מי שתייה (10 מתוך 10)')
  expect(text).toContain('בונוס: על הספסל')
  expect(text).toContain('זה משחק בדיוני בהשראת ההיסטוריה')

  await page.getByRole('button', { name: 'איפוס' }).click()
  await page.getByRole('button', { name: 'ביטול' }).click()
  await page.getByRole('button', { name: 'איפוס' }).click()
  await page.getByRole('button', { name: 'כן, למחוק' }).click()
  await expect(page).toHaveURL(/#\/$/)
  await page.reload()
  await expect(page.getByRole('button', { name: 'מתחילים', exact: true })).toBeVisible()
  await page.goto('./#/station/kiosk')
  await readStory(page)
  await expect(page.locator('section.step')).toHaveCount(1)
  await expect(page.getByLabel('דבר ראשון')).toHaveValue('')
})

test('light level shows fewer steps and more explanation, and the level can change mid-route', async ({ page }) => {
  await page.getByRole('radio', { name: /קלילה/ }).check()
  await page.getByRole('button', { name: 'מתחילים', exact: true }).click()
  await readStory(page)
  // the observation step is skipped at the light level
  await expect(page.locator('section.step h3').first()).toContainText('אתגר תקציב')
  await step(page, 'אתגר תקציב').getByRole('button', { name: /^הצללה/ }).click()
  await nextStep(page)
  await expect(page.locator('section.step')).toHaveCount(2)
  await expect(page.getByRole('button', { name: /^לשלב הבא/ })).toHaveCount(0)
  await expect(page.getByText('זו רק דוגמה. אין תשובה אחת נכונה.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'דילמת בונוס (לא חובה)' })).toHaveCount(0)

  // switch to regular on the station: the extra step appears, the answer stays
  const levels = page.getByRole('group', { name: 'רמת הפעילות' })
  await levels.getByRole('button', { name: 'רגילה' }).click()
  await expect(page.locator('section.step h3').first()).toContainText('חיפוש ראיות')
  await expect(step(page, 'אתגר תקציב').getByRole('button', { name: /^הצללה/ })).toHaveAttribute('aria-pressed', 'true')
  await levels.getByRole('button', { name: 'מאתגרת' }).click()
  await page.reload()
  await expect(page.getByRole('group', { name: 'רמת הפעילות' }).getByRole('button', { name: 'מאתגרת' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

test('navigation links open Google Maps walking directions with Hebrew queries', async ({ page }) => {
  await page.goto('./#/station/kiosk')
  await readStory(page)
  const link = page.getByRole('link', { name: /ניווט בהליכה/ })
  await expect(link).toHaveAttribute('target', '_blank')
  const href = (await link.getAttribute('href'))!
  const url = new URL(href)
  expect(url.origin + url.pathname).toBe('https://www.google.com/maps/dir/')
  expect(url.searchParams.get('api')).toBe('1')
  expect(url.searchParams.get('travelmode')).toBe('walking')
  expect(url.searchParams.get('destination')).toBe('הקיוסק הראשון, שדרות רוטשילד פינת הרצל, תל אביב')
  expect(href).not.toMatch(/[֐-׿]/)
})

test('about screen lists sources, cautions and what was not verified', async ({ page }) => {
  await page.getByRole('link', { name: 'על המסלול ומקורות' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('על המסלול ומקורות')
  await expect(page.getByText(/זה לא המסלול הרשמי המלא/)).toBeVisible()
  await expect(page.getByText(/ייתכן שהסימון לא רציף/)).toBeVisible()
  await expect(page.getByText(/כל העלויות, המשפחות והתרחישים במשימות בדיוניים/)).toBeVisible()
  await expect(page.getByText('משרד החינוך: מעמד הגרלת הצדפים לאחוזת בית')).toBeVisible()
  await expect(page.getByText('ארכיון המדינה: מגילת העצמאות')).toBeVisible()
  await expect(page.locator('a[href*="tel-aviv.gov.il"]')).toBeVisible()
  await expect(page.getByText('בית הכנסת הגדול: אלנבי 110')).toBeVisible()
  await expectNoHorizontalScroll(page)
  await snap(page, '07-about')
})

test('works under the repository path and offline after the first visit', async ({ page, context }) => {
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
  await readStory(page)
  await expect(page.getByText('תחנה 1 מתוך 7')).toBeVisible()
  await nextStep(page)
  await expect(step(page, 'אתגר תקציב')).toBeVisible()
  await page.goto('./#/station/independence-hall')
  await readStory(page)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('היכל העצמאות')
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
  await readStory(page)
  await nextStep(page)
  await step(page, 'אתגר תקציב').getByRole('button', { name: /^הצללה/ }).click()
  await expect(step(page, 'אתגר תקציב').locator('.meter')).toContainText('נשארו 6')
  await page.getByRole('button', { name: 'סיימנו את התחנה' }).click()
  await expect(page.getByText('תחנה 2 מתוך 7')).toBeVisible()
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
