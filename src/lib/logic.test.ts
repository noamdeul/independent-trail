import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BudgetStep, Step } from '../content'
import { independenceShort as route } from '../content/independence-short'
import { drawLottery } from '../components/steps'
import { walkingDirectionsUrl } from './maps'
import { budgetCost, budgetSelection, charterText, charterValues, cityPlan, findCharterStep, findStep, joinHebrew } from './plan'
import {
  assignRoles,
  autoTeams,
  defaultGroup,
  normalizeGroup,
  repairTeams,
  rolesByPerson,
  suggestLevel,
  teamsActive,
  type GroupSettings,
  type Participant,
} from './group'
import {
  bonusKey,
  discoverKey,
  createProgress,
  isStepAnswered,
  loadProgress,
  namesLine,
  nextStationId,
  normalizeProgress,
  resumeStationId,
  saveProgress,
  scopedResponses,
  visibleSteps,
  type Progress,
  type StepResponse,
} from './progress'
import { hrefFor, parseHash } from './router'
import { stationNotices } from './siteStatus'
import { createStorage } from './storage'
import { boards, buildSummary, discoverLine } from './summary'
import { hasPlayableMedia } from '../components/DiscoverCard'

const people = (n: number): Participant[] => Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `שם${i + 1}` }))
const groupOf = (n: number, extra: Partial<GroupSettings> = {}): GroupSettings => ({
  ...defaultGroup(route),
  participants: people(n),
  ...extra,
})
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
    const plan = cityPlan(route, p.responses, { includeCharter: false })
    const byStation = Object.fromEntries(plan.map((s) => [s.station.id, s.lines]))
    expect(byStation.kiosk).toEqual(['הצללה וברז מי שתייה', 'ילדים', 'צל ומים לילדים'])
    expect(byStation.mosaic).toEqual(['יום פתיחת הגינה'])
    expect(byStation['dizengoff-statue']).toEqual(['גינה ומגרש משחקים וספרייה', 'הגינה'])

    const text = charterText(charterValues(route, p.responses, charterStep))
    expect(text).toBe(
      [
        'אנחנו, צוות השדרה, מקימים את העיר עיר החולות.',
        'בעיר שלנו חשוב לנו חלוקה הוגנת, מקום למשחק ולמפגש והשתתפות התושבים בהחלטות.',
        'לכן נבנה גינה ומגרש משחקים וספרייה, נשמור על חלק מהמבנה ההיסטורי ונחליט על חלוקה באמצעות שילוב של הגרלה והתאמה לצרכים.',
      ].join('\n'),
    )
  })

  it('leaves blanks instead of inventing answers', () => {
    const text = charterText(charterValues(route, createProgress(route).responses, charterStep))
    expect(text.match(/______/g)?.length).toBe(8)
  })

  it('lets the family override a suggestion', () => {
    const p = withResponses(createProgress(route), {
      's3-rule': { selected: ['lottery'] },
      's7-charter': { text: { divide: 'צדפים, כמו ב־1909' } },
    })
    expect(charterValues(route, p.responses, charterStep).divide).toBe('צדפים, כמו ב־1909')
  })

  it('prefers the typed rule over the generic phrase of the picked card', () => {
    const p = withResponses(createProgress(route), { 's3-rule': { selected: ['mix'], text: { rule: 'קודם צרכים, ואז הגרלה' } } })
    expect(charterValues(route, p.responses, charterStep).divide).toBe('קודם צרכים, ואז הגרלה')
  })

  it('uses the typed rule when "another idea" is picked', () => {
    const p = withResponses(createProgress(route), { 's3-rule': { selected: ['other'], text: { rule: 'כל אחד בתורו' } } })
    expect(charterValues(route, p.responses, charterStep).divide).toBe('כל אחד בתורו')
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
    expect(odd.version).toBe(3)
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
  it('joins only the names that were entered', () => {
    expect(namesLine(['', ' '])).toBeNull()
    expect(namesLine(['דנה', '', 'רוני'])).toBe('דנה ורוני')
    expect(namesLine(['דנה', 'גיל', 'רוני'])).toBe('דנה, גיל ורוני')
    expect(joinHebrew(['א', 'ב', 'ג'])).toBe('א, ב וג')
  })
})

describe('group', () => {
  it('starts with three empty participants that have stable ids, and no personal details', () => {
    const g = defaultGroup(route)
    expect(g.participants).toEqual([
      { id: 'p1', name: '', age: undefined },
      { id: 'p2', name: '', age: undefined },
      { id: 'p3', name: '', age: undefined },
    ])
    expect(suggestLevel(g.participants)).toBeNull()
    expect(g.level).toBe('regular')
  })

  it('normalizes stored groups and never ends up empty', () => {
    expect(normalizeGroup(route, { version: 1, participants: [] }).participants).toHaveLength(3)
    const g = normalizeGroup(route, {
      version: 1,
      participants: [{ id: 'x', name: 'א', age: '200' }, { id: 'x', name: 'dup' }, { id: 'y', name: 'ב', age: 7 }, { name: 'no id' }],
      mode: 'teams',
      level: 'hard',
      teams: [{ id: 't1' }],
      teamOf: { x: 't1', ghost: 't1', y: 'nope' },
    })
    expect(g.participants).toEqual([
      { id: 'x', name: 'א', age: undefined },
      { id: 'y', name: 'ב', age: 7 },
    ])
    expect(g.level).toBe('regular')
    expect(g.teams).toEqual([{ id: 't1', name: 'צוות א' }])
    expect(g.teamOf).toEqual({ x: 't1' })
    expect(teamsActive(g)).toBe(false)
  })

  it('suggests a level from ages, but only when ages were entered', () => {
    expect(suggestLevel(people(3))).toBeNull()
    expect(suggestLevel([{ id: 'a', name: '', age: 6 }, { id: 'b', name: '', age: 40 }])).toBe('light')
    expect(suggestLevel([{ id: 'a', name: '', age: 9 }, { id: 'b', name: '' }])).toBe('regular')
    expect(suggestLevel([{ id: 'a', name: '', age: 13 }, { id: 'b', name: '', age: 45 }])).toBe('challenge')
  })

  it('splits 6+ people into teams of 2–4 and repairs teams after edits', () => {
    const six = autoTeams(people(6))
    expect(six.teams).toHaveLength(2)
    const eight = autoTeams(people(8))
    expect(eight.teams).toHaveLength(2)
    expect(Object.values(eight.teamOf).filter((t) => t === 't1')).toHaveLength(4)
    expect(autoTeams(people(9)).teams).toHaveLength(3)
    // a new person joins: they go to the smallest team; someone leaves: their entry goes away
    let g = repairTeams(groupOf(8, { mode: 'teams', ...eight }))
    expect(teamsActive(g)).toBe(true)
    g = repairTeams({ ...g, participants: [...g.participants, { id: 'new', name: 'חדש' }] })
    expect(g.teamOf.new).toBeDefined()
    g = repairTeams({ ...g, participants: g.participants.slice(3) })
    expect(teamsActive(g)).toBe(true)
    // below six people, teams switch off without losing the setting
    const small = repairTeams({ ...g, participants: g.participants.slice(0, 5) })
    expect(small.mode).toBe('teams')
    expect(teamsActive(small)).toBe(false)
  })
})

describe('roles', () => {
  const roles = route.roles
  const byPerson = (n: number, station: number, shift = 0) =>
    rolesByPerson(assignRoles(roles, people(n), station, shift), people(n)).map((x) => x.roles.length)

  it('has the five roles', () => {
    expect(roles.map((r) => r.label)).toEqual(['ניווט', 'הקראה', 'חיפוש בשטח', 'תיעוד', 'הצגת החלטה'])
  })

  it('gives one person every role', () => {
    expect(byPerson(1, 0)).toEqual([5])
  })

  it('splits roles between two people and swaps them at the next station', () => {
    expect(byPerson(2, 0)).toEqual([3, 2])
    const a = assignRoles(roles, people(2), 0).map((s) => s.personId)
    const b = assignRoles(roles, people(2), 1).map((s) => s.personId)
    expect(b).toEqual(a.map((id) => (id === 'p1' ? 'p2' : 'p1')))
  })

  it('gives everyone a role with 3 and 5 people, rotating each station', () => {
    expect(byPerson(3, 0)).toEqual([2, 2, 1])
    expect(byPerson(5, 0)).toEqual([1, 1, 1, 1, 1])
    const nav = (n: number, st: number) => assignRoles(roles, people(n), st)[0].personId
    expect(nav(5, 0)).not.toBe(nav(5, 1))
  })

  it('passes the lead role to many different people over the route with 8 people', () => {
    const leads = new Set(route.stations.map((_, i) => assignRoles(roles, people(8), i)[0].personId))
    expect(leads.size).toBe(7)
    expect(byPerson(8, 0).filter((c) => c === 0)).toHaveLength(3)
  })

  it('lets the group override a role, falling back when that person leaves', () => {
    const slots = assignRoles(roles, people(3), 0, 0, { read: 'p3' })
    expect(slots.find((s) => s.role.id === 'read')).toMatchObject({ personId: 'p3', auto: false })
    const after = assignRoles(roles, people(2), 0, 0, { read: 'p3' })
    expect(after.find((s) => s.role.id === 'read')?.auto).toBe(true)
  })
})

describe('levels and team answers', () => {
  it('shows fewer steps at the light level, but always at least two', () => {
    for (const station of route.stations) {
      const light = visibleSteps(station, 'light')
      expect(light.length, station.id).toBeGreaterThanOrEqual(2)
      expect(light.length, station.id).toBeLessThanOrEqual(visibleSteps(station, 'regular').length)
    }
    expect(route.stations.reduce((n, s) => n + visibleSteps(s, 'light').length, 0)).toBeLessThan(allSteps.length)
  })

  it('keeps each team\'s answers apart from the whole group\'s', () => {
    const p = withResponses(createProgress(route), {
      's1-budget': { selected: ['shade'] },
      's1-budget@t1': { selected: ['bench'] },
      's1-budget@t2': { selected: ['water'] },
    })
    expect(scopedResponses(p, null)['s1-budget'].selected).toEqual(['shade'])
    expect(scopedResponses(p, 't1')['s1-budget'].selected).toEqual(['bench'])
    expect(scopedResponses(p, 't2')).not.toHaveProperty('s1-budget@t2')
  })

  it('loads v2 progress and keeps team-scoped answers', () => {
    const loaded = normalizeProgress(route, {
      version: 2,
      mode: 'light',
      responses: { 's1-budget': { selected: ['shade'] }, 's1-budget@t1': { selected: ['bench'] }, 's1-budget@bad key': {} },
      roleOverrides: { 'kiosk|all': { read: 'p2' }, 'ghost|all': { read: 'p1' } },
    })
    expect(loaded.version).toBe(3)
    expect(Object.keys(loaded.responses).sort()).toEqual(['s1-budget', 's1-budget@t1'])
    expect(loaded.roleOverrides).toEqual({ 'kiosk|all': { read: 'p2' } })
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
    const g = { ...defaultGroup(route), participants: [{ id: 'a', name: 'דנה' }, { id: 'b', name: 'גיל' }, { id: 'c', name: '' }] }
    const text = buildSummary(route, p, g, new Date(2026, 9, 10))
    expect(text).toContain('העיר שלנו · הרפתקה בשדרה')
    expect(text).toContain('משתתפים: דנה וגיל')
    expect(text).not.toContain('משתתף/ת 3')
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

  it('speaks to a single player personally', () => {
    const p = withResponses(createProgress(route), {
      's5-order': { aloud: true },
      's7-charter': { text: { team: 'רוני', city: 'חולות' } },
    })
    const text = buildSummary(route, p, groupOf(1), new Date(2026, 9, 10))
    expect(text).toContain('העיר שלי · הרפתקה בשדרה')
    expect(text).toContain('משתתף/ת: שם1')
    expect(text).toContain('עניתי בעל פה')
    expect(text).toContain('אני, רוני, מקים/ה את העיר חולות.')
  })

  it('gives each team its own city and compares them without ranking', () => {
    const p = withResponses(createProgress(route), {
      's1-budget@t1': { selected: ['shade'] },
      's1-budget@t2': { selected: ['bench', 'water'] },
    })
    const g = repairTeams(groupOf(8, { mode: 'teams', ...autoTeams(people(8)) }))
    const text = buildSummary(route, p, g, new Date(2026, 9, 10))
    expect(text).toContain('== העיר של צוות א ==')
    expect(text).toContain('== העיר של צוות ב ==')
    expect(text).toContain('חברי הצוות: שם1, שם3, שם5 ושם7')
    expect(text).toContain('== השוואה בין ההצעות (בלי מנצחים) ==')
    expect(text).toContain('צוות א: הצללה')
    expect(text).toContain('צוות ב: ספסל וברז מי שתייה')
    expect(text).not.toMatch(/מנצח[^י]|ניקוד|מקום ראשון/)
  })

  it('works with no answers and no names at all', () => {
    const unnamed = { ...defaultGroup(route) }
    const text = buildSummary(route, createProgress(route), unnamed)
    expect(text).toContain('עוד לא נשמרו החלטות.')
    expect(text).toContain('3 משתתפים')
    expect(text).not.toContain('משתתף/ת 1')
  })

  it('never hides saved answers: earlier group answers and removed teams get their own card', () => {
    const p = withResponses(createProgress(route), {
      's1-budget': { selected: ['shade'] },
      's1-budget@t1': { selected: ['bench'] },
      's1-budget@t3': { selected: ['water'] },
    })
    const twoTeams = repairTeams(groupOf(8, { mode: 'teams', ...autoTeams(people(8), 2) }))
    const b = boards(twoTeams, p)
    expect(b.map((x) => x.title)).toEqual(['העיר של כל הקבוצה', 'העיר של צוות א', 'העיר של צוות ב', 'העיר של צוות ג'])
    expect(b[0].note).toContain('לפני החלוקה לצוותים')
    expect(b[3].note).toContain('כבר לא פעיל')
    expect(b[3].responses['s1-budget'].selected).toEqual(['water'])
    // teams switched off: the group card plus every team that answered
    const together = { ...twoTeams, mode: 'together' as const }
    expect(boards(together, p).map((x) => x.title)).toEqual(['העיר שלנו', 'העיר של צוות א', 'העיר של צוות ג'])
    // no team answers, no teams: just one card
    expect(boards(groupOf(3), withResponses(createProgress(route), { 's1-budget': { selected: ['shade'] } }))).toHaveLength(1)
    const text = buildSummary(route, p, twoTeams)
    expect(text).toContain('== העיר של צוות ג ==')
    expect(text).toContain('העיר של צוות ג: ברז מי שתייה')
  })
})

describe('official app media', () => {
  it('uses a manual hand-off everywhere, with no invented links or files', () => {
    const questions = route.stations.map((s) => s.media?.prepQuestion)
    expect(questions).toEqual([
      'גלו פרט אחד על החיים בעיר הצעירה.',
      'שימו לב כיצד תמונות מספרות על תקופות שונות.',
      'נסו לגלות איך חילקו את המגרשים.',
      'שימו לב מה השתנה במקום הזה.',
      'איזה פרט בסיפור המייסדים היה חדש לכם?',
      'איזה פרט חדש גיליתם על ראש העיר הראשון?',
      'גלו פרט אחד על הבית או על הכרזת המדינה.',
    ])
    for (const s of route.stations) {
      expect(s.media?.kind, s.id).toBe('manual')
      expect(s.media?.url, s.id).toBeUndefined()
      expect(s.media?.appStationName, s.id).toBeTruthy()
      expect(hasPlayableMedia(s.media), s.id).toBe(false)
    }
    expect(route.officialApp?.storeUrl).toBe('https://apps.apple.com/il/app/id1422469642')
  })

  it('only plays media that has a verified URL', () => {
    expect(hasPlayableMedia({ kind: 'video', appStationName: 'x', prepQuestion: 'q' })).toBe(false)
    expect(hasPlayableMedia({ kind: 'manual', appStationName: 'x', prepQuestion: 'q', url: 'https://example.org/a.mp4' })).toBe(false)
    expect(hasPlayableMedia({ kind: 'audio', appStationName: 'x', prepQuestion: 'q', url: 'https://example.org/a.mp3' })).toBe(true)
  })

  it('saves the discovery choice and what the group shared', () => {
    const loaded = normalizeProgress(route, {
      version: 3,
      responses: {
        [discoverKey('kiosk')]: { discover: 'media', aloud: true, text: { share: 'גזוז' } },
        [discoverKey('mosaic')]: { discover: 'video' },
      },
    })
    expect(loaded.responses['kiosk:discover']).toEqual({ discover: 'media', aloud: true, text: { share: 'גזוז' } })
    expect(loaded.responses['mosaic:discover']).toEqual({})
    expect(discoverLine(loaded.responses, 'kiosk', false)).toBe('צפינו או האזנו באפליקציה הרשמית. מה גילינו: גזוז')
    expect(discoverLine({ 'kiosk:discover': { discover: 'media', aloud: true } }, 'kiosk', true)).toBe(
      'צפיתי או האזנתי באפליקציה הרשמית, ועניתי בעל פה',
    )
    expect(discoverLine({ 'kiosk:discover': { discover: 'text' } }, 'kiosk', false)).toBe('הסיפור הכתוב')
    expect(discoverLine({}, 'kiosk', false)).toBeNull()
  })

  it('does not turn shared discovery answers into an extra city card in team mode', () => {
    const p = withResponses(createProgress(route), {
      'kiosk:discover': { discover: 'media' },
      's1-budget@t1': { selected: ['bench'] },
    })
    const g = repairTeams(groupOf(8, { mode: 'teams', ...autoTeams(people(8)) }))
    expect(boards(g, p).map((b) => b.title)).toEqual(['העיר של צוות א', 'העיר של צוות ב'])
  })
})

describe('trail map', () => {
  it('is bundled with the app and numbers our stations as on the official map', () => {
    expect(route.map).toMatchObject({ width: 1179, height: 834 })
    expect(route.map?.src).toMatch(/trail-map/)
    expect(route.map?.alt.length).toBeGreaterThan(20)
    expect(route.stations.map((s) => s.officialNumber)).toEqual([1, 2, 3, 4, 8, 9, 10])
  })
})

