import { afterEach, describe, expect, it, vi } from 'vitest'
import { independenceShort as route } from '../content/independence-short'
import { walkingDirectionsUrl } from './maps'
import {
  createProgress,
  loadNames,
  loadProgress,
  nextStationId,
  normalizeProgress,
  resumeStationId,
  rolesFor,
  saveProgress,
  type Progress,
} from './progress'
import { hrefFor, parseHash } from './router'
import { createStorage } from './storage'
import { buildSummary } from './summary'

const names = { parent: 'נועם', kids: ['עומרי', 'אלה'] as [string, string] }

function withStatus(p: Progress, id: string, status: 'done' | 'skipped' | 'pending'): Progress {
  return { ...p, stations: { ...p.stations, [id]: { ...p.stations[id], status } } }
}

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('route content', () => {
  it('has 7 stations in the requested order with unique ids', () => {
    expect(route.stations.map((s) => s.name)).toEqual([
      'הקיוסק הראשון',
      'מזרקת הפסיפס של נחום גוטמן',
      'בית עקיבא אריה ויס',
      'הגימנסיה הרצליה ומגדל שלום',
      'האנדרטה למייסדי העיר',
      'פסל מאיר דיזנגוף',
      'היכל העצמאות',
    ])
    expect(new Set(route.stations.map((s) => s.id)).size).toBe(7)
  })

  it('keeps the Independence Hall status and check date in separate fields', () => {
    const hall = route.stations.find((s) => s.id === 'independence-hall')!
    expect(hall.siteStatus).toMatchObject({ code: 'closed-renovation', checkedOn: '2026-10-09' })
    expect(hall.outsideOnly).toBe(true)
  })

  it('has short stories (2–4 sentences)', () => {
    for (const s of route.stations) {
      const sentences = s.story.split(/[.!?](?:\s|$)/).filter((x) => x.trim())
      expect(sentences.length, s.id).toBeGreaterThanOrEqual(2)
      expect(sentences.length, s.id).toBeLessThanOrEqual(4)
    }
  })
})

describe('maps links', () => {
  it('builds a walking link with Hebrew UTF-8 encoding and no coordinates', () => {
    const url = walkingDirectionsUrl('שדרות רוטשילד 10, תל אביב-יפו')
    expect(url.startsWith('https://www.google.com/maps/dir/?api=1&destination=')).toBe(true)
    expect(url).toContain('travelmode=walking')
    expect(url).not.toMatch(/[֐-׿ ]/)
    const parsed = new URL(url)
    expect(parsed.searchParams.get('destination')).toBe('שדרות רוטשילד 10, תל אביב-יפו')
  })

  it('encodes every station query safely', () => {
    for (const s of route.stations) {
      const parsed = new URL(walkingDirectionsUrl(s.mapsQuery))
      expect(parsed.searchParams.get('destination')).toBe(s.mapsQuery)
      expect(parsed.searchParams.get('travelmode')).toBe('walking')
    }
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

  it('alternates roles and allows a manual swap', () => {
    const p = createProgress(route)
    expect(rolesFor(route, p, names, 'kiosk')).toEqual({ navigator: 'עומרי', reader: 'אלה' })
    expect(rolesFor(route, p, names, 'mosaic')).toEqual({ navigator: 'אלה', reader: 'עומרי' })
    const swapped = { ...p, stations: { ...p.stations, kiosk: { ...p.stations.kiosk, rolesSwapped: true } } }
    expect(rolesFor(route, swapped, names, 'kiosk')).toEqual({ navigator: 'אלה', reader: 'עומרי' })
  })

  it('survives corrupt or foreign stored data', () => {
    expect(normalizeProgress(route, 'garbage')).toEqual(createProgress(route))
    const odd = normalizeProgress(route, {
      version: 1,
      started: true,
      currentStationId: 'nope',
      favoriteStationId: 'mosaic',
      stations: { kiosk: { status: 'weird', note: 5 }, mosaic: { status: 'done', note: 'יפה' }, ghost: {} },
    })
    expect(odd.currentStationId).toBeNull()
    expect(odd.stations.kiosk).toEqual({ status: 'pending', note: '', rolesSwapped: false })
    expect(odd.stations.mosaic.status).toBe('done')
    expect(odd.stations).not.toHaveProperty('ghost')
    expect(odd.favoriteStationId).toBe('mosaic')
  })

  it('round-trips through localStorage', () => {
    const storage = createStorage()
    const p = withStatus({ ...createProgress(route), started: true }, 'gymnasium', 'done')
    saveProgress(storage, p)
    expect(loadProgress(createStorage(), route).stations.gymnasium.status).toBe('done')
  })

  it('falls back to memory when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const storage = createStorage()
    expect(storage.persistent).toBe(false)
    expect(storage.set('a', '1')).toBe(false)
    expect(storage.get('a')).toBe('1')
    expect(loadNames(storage, route)).toEqual(names)
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
  it('includes names, counts, notes and favorite', () => {
    let p = withStatus(createProgress(route), 'kiosk', 'done')
    p = { ...p, favoriteStationId: 'kiosk', stations: { ...p.stations, kiosk: { ...p.stations.kiosk, note: 'קיוסק הגזוז\nשל אלה' } } }
    const text = buildSummary(route, p, names, new Date(2026, 9, 9))
    expect(text).toContain('נועם, עומרי ואלה')
    expect(text).toContain('הושלמו 1 מתוך 7')
    expect(text).toContain('התחנה האהובה: הקיוסק הראשון')
    expect(text).toContain('מה כתבנו: קיוסק הגזוז / של אלה')
    expect(text).toContain('(טרם ביקרנו)')
  })
})
