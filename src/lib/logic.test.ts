import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BudgetStep, Step } from '../content'
import { independenceShort as route } from '../content/independence-short'
import { drawLottery } from '../components/steps'
import { walkingDirectionsUrl } from './maps'
import { budgetCost, budgetSelection, charterText, charterValues, cityPlan, findCharterStep, findStep, joinHebrew } from './plan'
import {
  bonusKey,
  createProgress,
  displayNames,
  familyLine,
  isStepAnswered,
  loadNames,
  loadProgress,
  nextStationId,
  normalizeProgress,
  resumeStationId,
  rolesFor,
  saveProgress,
  type Progress,
  type StepResponse,
} from './progress'
import { hrefFor, parseHash } from './router'
import { stationNotices } from './siteStatus'
import { createStorage } from './storage'
import { buildSummary } from './summary'

const names = { parent: 'דנה', kids: ['גיל', 'רוני'] as [string, string] }
const allSteps: Step[] = route.stations.flatMap((s) => s.mission.steps)

function withStatus(p: Progress, id: string, status: 'done' | 'skipped' | 'pending'): Progress {
  return { ...p, stations: { ...p.stations, [id]: { ...p.stations[id], status } } }
}

function withResponses(p: Progress, responses: Record<string, StepResponse>): Progress {
  return { ...p, responses: { ...p.responses, ...responses } }
}

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('route content', () => {
  it('has 7 stations in order, each with one of the seven themes', () => {
    expect(route.stations.map((s) => s.name)).toEqual([
      'הקיוסק הראשון',
      'מזרקת הפסיפס של נחום גוטמן',
      'בית עקיבא אריה ויס',
      'הגימנסיה הרצליה ומגדל שלום',
      'האנדרטה למייסדי העיר',
      'פסל מאיר דיזנגוף',
      'היכל העצמאות',
    ])
    expect(route.stations.map((s) => s.theme)).toEqual([
      'מקום מפגש',
      'סיפורים וזהות',
      'חלוקה הוגנת',
      'שימור ופיתוח',
      'האנשים שמאחורי העיר',
      'ניהול העיר',
      'עקרונות משותפים',
    ])
  })

  it('gives every station a story, more content, 2–3 steps and a bonus', () => {
    for (const s of route.stations) {
      expect(s.story.length, s.id).toBeGreaterThan(80)
      expect(s.more.length, s.id).toBeGreaterThan(0)
      expect(s.mission.steps.length, s.id).toBeGreaterThanOrEqual(2)
      expect(s.mission.steps.length, s.id).toBeLessThanOrEqual(3)
      expect(s.mission.bonus.length, s.id).toBeGreaterThan(10)
    }
  })

  it('uses globally unique step ids and valid cross references', () => {
    const ids = allSteps.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const step of allSteps) {
      if (step.kind === 'budget' && step.startFrom) expect(findStep(route, step.startFrom)?.kind).toBe('budget')
      if (step.kind === 'lottery') expect(findStep(route, step.from)?.kind).toBe('match')
      if (step.kind === 'order') expect([...step.start].sort()).toEqual(step.cards.map((c) => c.id).sort())
      if (step.kind === 'charter') {
        expect(findStep(route, step.from.principles)?.kind).toBe('choice')
        expect(findStep(route, step.from.preserve)?.kind).toBe('choice')
        expect(findStep(route, step.from.divide)?.kind).toBe('choice')
        for (const b of step.from.build) expect(findStep(route, b)?.kind).toBe('budget')
      }
    }
  })

  it('gives closed tasks two graded hints and a solution, and open tasks no solution', () => {
    for (const step of allSteps) {
      if (step.kind === 'categorize' || step.kind === 'order') {
        expect(step.hints, step.id).toHaveLength(2)
        expect(step.solution, step.id).toBeTruthy()
      } else {
        expect(step.solution, step.id).toBeUndefined()
      }
    }
  })

  it('starts order puzzles in a shuffled order', () => {
    for (const step of allSteps)
      if (step.kind === 'order') expect(step.start, step.id).not.toEqual(step.cards.map((c) => c.id))
  })

  it('keeps Independence Hall visit type, status and check date apart', () => {
    const hall = route.stations.find((s) => s.id === 'independence-hall')!
    expect(hall.visitType).toBe('exterior')
    expect(hall.siteStatus).toMatchObject({ status: 'closed_for_renovation', lastChecked: '2026-10-09' })
    expect(stationNotices(hall).map((n) => n.text).join(' ')).toBe(
      'היכל העצמאות סגור לשיפוצים לפי הבדיקה מ־9.10.2026. לא מתוכננת כניסה. בתחנה זו עוצרים מחוץ לבניין.',
    )
  })

  it('builds map queries from name and address, without coordinates', () => {
    for (const s of route.stations) {
      expect(s.mapsQuery, s.id).toMatch(/תל אביב$/)
      expect(s.mapsQuery, s.id).not.toMatch(/\d+\.\d{3,}/)
      const parsed = new URL(walkingDirectionsUrl(s.mapsQuery))
      expect(parsed.searchParams.get('destination')).toBe(s.mapsQuery)
      expect(parsed.searchParams.get('travelmode')).toBe('walking')
    }
  })
})

describe('budget', () => {
  const kiosk = findStep(route, 's1-budget') as BudgetStep
  const cut = findStep(route, 's6-cut') as BudgetStep

  it('adds fictional costs', () => {
    expect(budgetCost(kiosk, ['shade', 'bench', 'water'])).toBe(10)
    expect(budgetCost(kiosk, [])).toBe(0)
  })

  it('starts the reduced budget from the earlier plan until the family edits it', () => {
    const p = withResponses(createProgress(route), { 's6-budget': { selected: ['park', 'library', 'benches'] } })
    expect(budgetSelection(cut, p.responses)).toEqual(['park', 'library', 'benches'])
    expect(budgetCost(cut, budgetSelection(cut, p.responses))).toBe(13)
    const edited = withResponses(p, { 's6-cut': { selected: ['park', 'library'] } })
    expect(budgetSelection(cut, edited.responses)).toEqual(['park', 'library'])
  })
})

describe('lottery', () => {
  it('gives every family a different plot', () => {
    for (let i = 0; i < 20; i++) {
      const result = drawLottery(['quiet', 'kids', 'shop'], ['a', 'b', 'c'])
      expect(Object.keys(result).sort()).toEqual(['kids', 'quiet', 'shop'])
      expect(new Set(Object.values(result)).size).toBe(3)
    }
  })
})

describe('city plan and charter', () => {
  const charterStep = findCharterStep(route)!

  it('collects plan items per station and fills the charter from earlier answers', () => {
    const p = withResponses(createProgress(route), {
      's1-budget': { selected: ['shade', 'water'] },
      's1-decide': { selected: ['kids'], text: { why: 'צל ומים לילדים' } },
      's2-create': { text: { story: 'סיפור', mosaic: 'יום פתיחת הגינה' } },
      's3-rule': { selected: ['mix'] },
      's4-plan': { selected: ['partial'], text: { 'partial:pro': 'שומרים זיכרון' } },
      's6-budget': { selected: ['park', 'library', 'trees'] },
      's6-cut': { selected: ['park', 'library'], text: { protect: 'הגינה' } },
      's7-principles': { selected: ['fair', 'play', 'voice'] },
      's7-charter': { text: { team: 'השדרה', city: 'עיר החולות' } },
    })
    const plan = cityPlan(route, p, { includeCharter: false })
    const byStation = Object.fromEntries(plan.map((s) => [s.station.id, s.lines]))
    expect(byStation.kiosk).toEqual(['הצללה וברז מי שתייה', 'ילדים', 'צל ומים לילדים'])
    expect(byStation.mosaic).toEqual(['יום פתיחת הגינה'])
    expect(byStation['dizengoff-statue']).toEqual(['גינה ומגרש משחקים וספרייה', 'הגינה'])

    const text = charterText(charterValues(route, p, charterStep))
    expect(text).toBe(
      [
        'אנחנו, צוות השדרה, מקימים את העיר עיר החולות.',
        'בעיר שלנו חשוב לנו חלוקה הוגנת, מקום למשחק ולמפגש והשתתפות התושבים בהחלטות.',
        'לכן נבנה גינה ומגרש משחקים וספרייה, נשמור על חלק מהמבנה ההיסטורי ונחליט על חלוקה באמצעות שילוב של הגרלה והתאמה לצרכים.',
      ].join('\n'),
    )
  })

  it('leaves blanks instead of inventing answers', () => {
    const text = charterText(charterValues(route, createProgress(route), charterStep))
    expect(text.match(/______/g)?.length).toBe(8)
  })

  it('lets the family override a suggestion', () => {
    const p = withResponses(createProgress(route), {
      's3-rule': { selected: ['lottery'] },
      's7-charter': { text: { divide: 'צדפים, כמו ב־1909' } },
    })
    expect(charterValues(route, p, charterStep).divide).toBe('צדפים, כמו ב־1909')
  })

  it('uses the typed rule when "another idea" is picked', () => {
    const p = withResponses(createProgress(route), { 's3-rule': { selected: ['other'], text: { rule: 'כל אחד בתורו' } } })
    expect(charterValues(route, p, charterStep).divide).toBe('כל אחד בתורו')
  })
})

describe('progress', () => {
  it('goes to the next pending station, then wraps to skipped ones', () => {
    let p = createProgress(route)
    expect(nextStationId(route, p, null)).toBe('kiosk')
    p = withStatus(p, 'kiosk', 'skipped')
    expect(nextStationId(route, p, 'kiosk')).toBe('mosaic')
    for (const s of route.stations.slice(1)) p = withStatus(p, s.id, 'done')
    expect(nextStationId(route, p, 'independence-hall')).toBe('kiosk')
    p = withStatus(p, 'kiosk', 'done')
    expect(nextStationId(route, p, 'kiosk')).toBeNull()
  })

  it('resumes at the current station unless it is done', () => {
    let p: Progress = { ...createProgress(route), started: true, currentStationId: 'weiss-house' }
    expect(resumeStationId(route, p)).toBe('weiss-house')
    p = withStatus(p, 'weiss-house', 'done')
    expect(resumeStationId(route, p)).toBe('kiosk')
  })

  it('rotates three roles between the kids and the parent, with a manual shift', () => {
    const p = createProgress(route)
    const at = (id: string, prog = p) => rolesFor(route, prog, names, id).map((r) => `${r.label}:${r.name}`)
    expect(at('kiosk')).toEqual(['מנווט/ת:גיל', 'חוקר/ת:רוני', 'מציג/ה:דנה'])
    expect(at('mosaic')).toEqual(['מנווט/ת:רוני', 'חוקר/ת:דנה', 'מציג/ה:גיל'])
    const shifted = { ...p, stations: { ...p.stations, kiosk: { ...p.stations.kiosk, roleShift: 1 } } }
    expect(at('kiosk', shifted)).toEqual(['מנווט/ת:רוני', 'חוקר/ת:דנה', 'מציג/ה:גיל'])
  })

  it('counts "answered out loud" as an answer', () => {
    expect(isStepAnswered(undefined)).toBe(false)
    expect(isStepAnswered({ hints: 2 })).toBe(false)
    expect(isStepAnswered({ aloud: true })).toBe(true)
    expect(isStepAnswered({ text: { a: '  ' } })).toBe(false)
    expect(isStepAnswered({ text: { a: 'כן' } })).toBe(true)
  })

  it('survives corrupt, old or foreign stored data', () => {
    expect(normalizeProgress(route, 'garbage')).toEqual(createProgress(route))
    expect(normalizeProgress(route, { version: 1, started: true })).toEqual(createProgress(route))
    const odd = normalizeProgress(route, {
      version: 2,
      started: true,
      mode: 'light',
      currentStationId: 'nope',
      favoriteStationId: 'mosaic',
      stations: { kiosk: { status: 'weird', stepsOpen: 99, roleShift: -4 }, ghost: {} },
      responses: {
        's1-budget': { selected: ['shade', 3], hints: 9, text: { a: 'x', b: 7 } },
        'not-a-step': { aloud: true },
      },
    })
    expect(odd.mode).toBe('light')
    expect(odd.currentStationId).toBeNull()
    expect(odd.stations.kiosk).toEqual({ status: 'pending', stepsOpen: 3, roleShift: 0 })
    expect(odd.stations).not.toHaveProperty('ghost')
    expect(odd.responses['s1-budget']).toEqual({ selected: ['shade'], hints: 2, text: { a: 'x' } })
    expect(odd.responses).not.toHaveProperty('not-a-step')
    expect(odd.favoriteStationId).toBe('mosaic')
  })

  it('round-trips responses through localStorage', () => {
    const storage = createStorage()
    const p = withResponses(withStatus({ ...createProgress(route), started: true }, 'gymnasium', 'done'), {
      's3-match': { assign: { quiet: 'b' } },
      [bonusKey('kiosk')]: { text: { answer: 'הספסל' } },
    })
    saveProgress(storage, p)
    const loaded = loadProgress(createStorage(), route)
    expect(loaded.stations.gymnasium.status).toBe('done')
    expect(loaded.responses['s3-match']).toEqual({ assign: { quiet: 'b' } })
    expect(loaded.responses['kiosk:bonus'].text?.answer).toBe('הספסל')
  })

  it('falls back to memory when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const storage = createStorage()
    expect(storage.persistent).toBe(false)
    expect(storage.set('a', '1')).toBe(false)
    expect(storage.get('a')).toBe('1')
  })
})

describe('names', () => {
  it('starts empty and uses generic labels', () => {
    const empty = { parent: '', kids: ['', ''] as [string, string] }
    expect(loadNames(createStorage(), route)).toEqual(empty)
    expect(displayNames(empty, route)).toEqual({ parent: 'מבוגר/ת', kids: ['ילד/ה 1', 'ילד/ה 2'] })
  })

  it('joins only the names that were entered', () => {
    expect(familyLine({ parent: '', kids: ['', ''] })).toBeNull()
    expect(familyLine({ parent: 'דנה', kids: ['', 'רוני'] })).toBe('דנה ורוני')
    expect(familyLine(names)).toBe('דנה, גיל ורוני')
    expect(joinHebrew(['א', 'ב', 'ג'])).toBe('א, ב וג')
  })
})

describe('router', () => {
  it('parses and builds hash routes', () => {
    expect(parseHash('')).toEqual({ name: 'welcome' })
    expect(parseHash('#/station/mosaic')).toEqual({ name: 'station', id: 'mosaic' })
    expect(parseHash('#/stations')).toEqual({ name: 'stations' })
    expect(parseHash('#/finish')).toEqual({ name: 'finish' })
    expect(parseHash('#/about')).toEqual({ name: 'about' })
    expect(parseHash('#/whatever')).toEqual({ name: 'welcome' })
    expect(hrefFor({ name: 'station', id: 'kiosk' })).toBe('#/station/kiosk')
  })
})

describe('summary', () => {
  it('builds the "our city" text with plan, answers and the fiction note', () => {
    let p = withStatus(createProgress(route), 'kiosk', 'done')
    p = withResponses(
      { ...p, favoriteStationId: 'kiosk' },
      {
        's1-evidence': { text: { item0: 'עצים' }, notFound: ['item1'] },
        's1-budget': { selected: ['shade', 'bench'] },
        's2-sort': { assign: { jonah: 'bible' } },
        's5-order': { aloud: true },
        [bonusKey('kiosk')]: { text: { answer: 'על הספסל' } },
      },
    )
    const text = buildSummary(route, p, names, new Date(2026, 9, 10))
    expect(text).toContain('הצוות: דנה, גיל ורוני')
    expect(text).toContain('הושלמו 1 מתוך 7')
    expect(text).toContain('התחנה האהובה: הקיוסק הראשון')
    expect(text).toContain(route.frame.disclaimer)
    expect(text).toContain('מקום המפגש (מקום מפגש)')
    expect(text).toContain('הצללה וספסל')
    expect(text).toContain('דבר ראשון: עצים')
    expect(text).toContain('דבר שני: לא מצאנו')
    expect(text).toContain('בחרנו: הצללה וספסל (7 מתוך 10)')
    expect(text).toContain('יונה במעי הדג: סיפור מקראי')
    expect(text).toContain('ענינו בעל פה')
    expect(text).toContain('בונוס: על הספסל')
  })

  it('omits the team line when no names were entered', () => {
    const text = buildSummary(route, createProgress(route), { parent: '', kids: ['', ''] })
    expect(text).not.toContain('הצוות:')
    expect(text).toContain('עוד לא נשמרו החלטות.')
  })
})
