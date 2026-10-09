import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

// Group sizes 1, 2, 3, 5 and 8, team mode on one shared device, and
// editing the group in the middle of the route.

const step = (page: Page, title: string) =>
  page.locator('section.step').filter({ has: page.locator('h3', { hasText: title }) })
const nextStep = (page: Page) => page.getByRole('button', { name: /^לשלב הבא/ }).click()
const roleItems = (page: Page) => page.getByRole('region', { name: 'תפקידים בתחנה' }).locator('.role-list li')

async function expectFits(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
  const small = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('.btn, .icon-btn, .segmented button, .toggle, .card-btn, select, .radio')]
      .filter((el) => el.offsetParent !== null)
      .map((el) => ({ text: el.textContent?.trim(), ...el.getBoundingClientRect().toJSON() }))
      .filter((r) => r.width < 44 || r.height < 44),
  )
  expect(small).toEqual([])
}

/** Sets the participant list on the welcome or group screen. */
async function setPeople(page: Page, names: string[]) {
  const rows = page.locator('.person')
  while ((await rows.count()) < names.length) await page.getByRole('button', { name: 'הוספת משתתף/ת' }).click()
  while ((await rows.count()) > names.length) await rows.last().getByRole('button', { name: /^הסרת/ }).click()
  for (let i = 0; i < names.length; i++) await page.getByLabel(`משתתף/ת ${i + 1}`, { exact: true }).fill(names[i])
}

test.beforeEach(async ({ page }) => {
  await page.goto('./')
  await page.evaluate(() => localStorage.clear())
  await page.goto('./')
})

test('one participant: personal wording, no roles, "העיר שלי"', async ({ page }) => {
  await setPeople(page, ['רוני'])
  await expect(page.getByRole('button', { name: 'הסרת רוני' })).toBeDisabled()
  await expect(page.getByText(/משחק\/ת לבד/).first()).toBeVisible()
  await expect(page.getByText(/המשימה: לתכנן עיר חדשה/)).toBeVisible()
  await page.getByRole('button', { name: 'מתחילים', exact: true }).click()

  await expect(page.getByRole('region', { name: 'איך משחקים בתחנה' })).toContainText('עוברים על כל השלבים בקצב שלך')
  await expect(page.getByRole('region', { name: 'תפקידים בתחנה' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: /^המשימה שלי:/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'עניתי בעל פה' }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'לא מצאתי' }).first()).toBeVisible()
  await expectFits(page)

  await page.goto('./#/station/gymnasium')
  await expect(step(page, 'כרטיסי נקודת מבט')).toContainText('עוברים על כל הכרטיסים')

  await page.goto('./#/station/independence-hall')
  await nextStep(page)
  await nextStep(page)
  await step(page, 'המגילה').getByLabel('השם שלי').fill('רוני')
  await step(page, 'המגילה').getByLabel('שם העיר').fill('חולות')
  await expect(step(page, 'המגילה').locator('.charter-doc')).toContainText('אני, רוני, מקים/ה את העיר חולות.')
  await page.getByRole('button', { name: 'סיימתי את התחנה' }).click()

  await page.goto('./#/finish')
  await expect(page.getByRole('heading', { name: 'העיר שלי: חולות' })).toBeVisible()
  await expect(page.locator('.participants-line')).toHaveText('משתתף/ת: רוני')
  await expect(page.getByRole('heading', { name: 'כל הכבוד, רוני!' })).toBeVisible()
})

test('two participants: several roles each, swapped at the next station', async ({ page }) => {
  await setPeople(page, ['דנה', 'גיל'])
  await expect(page.getByText(/כל אחד מקבל כמה תפקידים/)).toBeVisible()
  await page.getByRole('button', { name: 'מתחילים', exact: true }).click()
  await expect(roleItems(page)).toHaveText(['דנה ניווט, חיפוש בשטח, הצגת החלטה', 'גיל הקראה, תיעוד'])
  await page.getByRole('button', { name: 'סיימנו את התחנה' }).click()
  await expect(roleItems(page)).toHaveText(['דנה הקראה, תיעוד', 'גיל ניווט, חיפוש בשטח, הצגת החלטה'])
  await expectFits(page)
})

test('five participants: one role each, rotating, with a manual change', async ({ page }) => {
  await setPeople(page, ['א1', 'ב2', 'ג3', 'ד4', 'ה5'])
  await page.getByRole('button', { name: 'מתחילים', exact: true }).click()
  await expect(roleItems(page)).toHaveText(['א1 ניווט', 'ב2 הקראה', 'ג3 חיפוש בשטח', 'ד4 תיעוד', 'ה5 הצגת החלטה'])
  await page.getByRole('button', { name: 'שינוי חלוקה ידני' }).click()
  await page.getByRole('combobox', { name: /^ניווט/ }).selectOption({ label: 'ה5' })
  await expect(roleItems(page).last()).toHaveText('ה5 ניווט, הצגת החלטה')
  await page.reload()
  await expect(roleItems(page).last()).toHaveText('ה5 ניווט, הצגת החלטה')
  await page.getByRole('button', { name: 'סיימנו את התחנה' }).click()
  await expect(roleItems(page)).toHaveText(['א1 הצגת החלטה', 'ב2 ניווט', 'ג3 הקראה', 'ד4 חיפוש בשטח', 'ה5 תיעוד'])
  await expectFits(page)
})

test('eight participants: one group with free helpers, or teams on one device with separate cities', async ({ page }) => {
  await setPeople(page, ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח'])
  await expect(page.getByRole('radio', { name: 'קבוצה אחת' })).toBeChecked()
  await expect(page.getByText(/אין סנכרון בין מכשירים/)).toHaveCount(0)

  // one group: five roles, the rest join freely
  await page.getByRole('button', { name: 'מתחילים', exact: true }).click()
  await expect(roleItems(page)).toHaveCount(5)
  await expect(page.getByText(/שאר הקבוצה מצטרפים לחיפוש ולדיון/)).toBeVisible()
  await nextStep(page)
  await step(page, 'אתגר תקציב').getByRole('button', { name: /^הצללה/ }).click()
  await expectFits(page)

  // switch to teams from the group screen
  await page.getByRole('link', { name: /עריכת המשתתפים/ }).click()
  await page.getByRole('radio', { name: 'צוותים של 2–4' }).check()
  await expect(page.getByText(/כל הצוותים משתמשים במכשיר הזה/)).toBeVisible()
  await expect(page.getByText(/אין סנכרון בין מכשירים/)).toBeVisible()
  await expect(page.locator('.team-list li')).toHaveText(['צוות א: 4 משתתפים', 'צוות ב: 4 משתתפים'])
  await expectFits(page)
  await page.getByRole('link', { name: 'חזרה לתחנה' }).click()

  const teamSwitch = page.getByRole('group', { name: 'הצוות שעונה עכשיו במכשיר:' })
  await expect(teamSwitch.getByRole('button', { name: 'צוות א' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('התפקידים בצוות א')).toBeVisible()
  await expect(roleItems(page)).toHaveCount(4)
  // team א starts fresh, the whole-group answer is kept aside
  const budget = step(page, 'אתגר תקציב')
  await expect(budget.getByRole('button', { name: /^הצללה/ })).toHaveAttribute('aria-pressed', 'false')
  await budget.getByRole('button', { name: /^ספסל/ }).click()
  await teamSwitch.getByRole('button', { name: 'צוות ב' }).click()
  await expect(page.getByText('התפקידים בצוות ב')).toBeVisible()
  await step(page, 'אתגר תקציב').getByRole('button', { name: /^ברז מי שתייה/ }).click()
  await expect(step(page, 'אתגר תקציב').getByRole('button', { name: /^ספסל/ })).toHaveAttribute('aria-pressed', 'false')
  await page.reload()
  await expect(step(page, 'אתגר תקציב').getByRole('button', { name: /^ברז מי שתייה/ })).toHaveAttribute('aria-pressed', 'true')

  await page.goto('./#/finish')
  await expect(page.getByRole('heading', { name: 'העיר של צוות א' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'העיר של צוות ב' })).toBeVisible()
  const compare = page.getByRole('region', { name: 'השוואה בין ההצעות' })
  await expect(compare).toContainText('אין מנצחים')
  await expect(compare).toContainText('צוות א: ספסל')
  await expect(compare).toContainText('צוות ב: ברז מי שתייה')
  await expectFits(page)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /^הורדת ״העיר שלנו״/ }).click(),
  ])
  const text = readFileSync((await download.path())!, 'utf8')
  expect(text).toContain('== העיר של צוות א ==')
  expect(text).toContain('חברי הצוות: א, ג, ה וז')

  // back to one group: the whole-group answer is still there
  await page.goto('./#/group')
  await page.getByRole('radio', { name: 'קבוצה אחת' }).check()
  await page.goto('./#/station/kiosk')
  await expect(step(page, 'אתגר תקציב').getByRole('button', { name: /^הצללה/ })).toHaveAttribute('aria-pressed', 'true')
})

test('editing the group mid-route keeps answers, updates roles and survives a refresh', async ({ page }) => {
  await setPeople(page, ['דנה', 'גיל', 'רוני'])
  await page.getByRole('button', { name: 'מתחילים', exact: true }).click()
  await page.getByRole('button', { name: 'סיימנו את התחנה' }).click()
  await page.getByRole('button', { name: 'סיימנו את התחנה' }).click()
  // station 3, three people
  const match = step(page, 'מי גר איפה?')
  await expect(match).toContainText('פתרו יחד')
  await match.getByRole('group', { name: /משפחת שקט/ }).getByRole('button', { name: 'מגרש ב' }).click()
  await expect(roleItems(page)).toContainText(['רוני'])

  await page.getByRole('link', { name: /עריכת המשתתפים/ }).click()
  await page.getByRole('button', { name: 'הסרת רוני' }).click()
  await page.getByRole('button', { name: 'הוספת משתתף/ת' }).click()
  await page.getByLabel('משתתף/ת 3', { exact: true }).fill('מאיה')
  await page.getByLabel(/^גיל/).nth(2).fill('6')
  await expect(page.getByText(/הצעה לפי הגילים:/)).toContainText('קלילה')
  await expect(page.getByRole('radio', { name: /רגילה/ })).toBeChecked()
  await page.getByRole('link', { name: 'חזרה לתחנה' }).click()

  await expect(page).toHaveURL(/#\/station\/weiss-house$/)
  await expect(roleItems(page)).not.toContainText(['רוני'])
  await expect(page.getByRole('region', { name: 'תפקידים בתחנה' })).toContainText('מאיה')
  await expect(step(page, 'מי גר איפה?').getByRole('group', { name: /משפחת שקט/ }).getByRole('button', { name: 'מגרש ב' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.reload()
  await expect(page.getByRole('region', { name: 'תפקידים בתחנה' })).toContainText('מאיה')
  await expect(step(page, 'מי גר איפה?').getByRole('group', { name: /משפחת שקט/ }).getByRole('button', { name: 'מגרש ב' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.getByRole('link', { name: 'סיום' }).click()
  await expect(page.locator('.participants-line')).toHaveText('המשתתפים: דנה, גיל ומאיה')

  // reset clears progress but keeps the group
  await page.getByRole('button', { name: 'איפוס' }).click()
  await page.getByRole('button', { name: 'כן, למחוק' }).click()
  await expect(page.getByLabel('משתתף/ת 3', { exact: true })).toHaveValue('מאיה')
})
