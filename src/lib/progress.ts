import type { Route, Station } from '../content'
import { readJson, type SafeStorage } from './storage'

export type StationStatus = 'pending' | 'done' | 'skipped'
export type ModeId = 'full' | 'light'

export interface StationProgress {
  status: StationStatus
  /** How many mission steps are revealed (steps appear one at a time). */
  stepsOpen: number
  /** Manual role rotation at this station (0–2). */
  roleShift: number
}

/** Everything a family did in one mission step. All parts are optional. */
export interface StepResponse {
  /** "ענינו בעל פה" – answered out loud, nothing typed. */
  aloud?: boolean
  /** Free text by key (field id, "item0", "seen1", "think1", "full:pro", "followUp"…). */
  text?: Record<string, string>
  /** Observation rows marked "לא מצאנו". */
  notFound?: string[]
  selected?: string[]
  order?: string[]
  /** Card id → category / item id → target. */
  assign?: Record<string, string>
  lottery?: Record<string, string>
  hints?: number
  solved?: boolean
  announced?: boolean
  followHints?: number
  followSolved?: boolean
}

export interface Names {
  parent: string
  kids: [string, string]
}

export interface Progress {
  version: 2
  routeId: string
  started: boolean
  mode: ModeId
  currentStationId: string | null
  stations: Record<string, StationProgress>
  /** Keyed by step id, or `${stationId}:bonus` for bonus answers. */
  responses: Record<string, StepResponse>
  favoriteStationId: string | null
  updatedAt: string | null
}

const SCHEMA = 'v2'
export const progressKey = (routeId: string) => `shdera:${SCHEMA}:progress:${routeId}`
// Names did not change shape, so they keep the v1 key.
export const namesKey = (routeId: string) => `shdera:v1:names:${routeId}`
export const bonusKey = (stationId: string) => `${stationId}:bonus`

export function emptyStation(): StationProgress {
  return { status: 'pending', stepsOpen: 1, roleShift: 0 }
}

export function createProgress(route: Route): Progress {
  return {
    version: 2,
    routeId: route.id,
    started: false,
    mode: 'full',
    currentStationId: null,
    stations: Object.fromEntries(route.stations.map((s) => [s.id, emptyStation()])),
    responses: {},
    favoriteStationId: null,
    updatedAt: null,
  }
}

const STATUSES: StationStatus[] = ['pending', 'done', 'skipped']
const isString = (v: unknown): v is string => typeof v === 'string'
const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const clampInt = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : fallback

function stringRecord(v: unknown, maxLen = 2000): Record<string, string> | undefined {
  if (!isObject(v)) return undefined
  const out: Record<string, string> = {}
  for (const [k, val] of Object.entries(v)) if (isString(val)) out[k.slice(0, 80)] = val.slice(0, maxLen)
  return out
}

function stringList(v: unknown): string[] | undefined {
  return Array.isArray(v) ? v.filter(isString).slice(0, 50) : undefined
}

function normalizeResponse(v: unknown): StepResponse | null {
  if (!isObject(v)) return null
  const r: StepResponse = {}
  if (v.aloud === true) r.aloud = true
  if (v.solved === true) r.solved = true
  if (v.announced === true) r.announced = true
  if (v.followSolved === true) r.followSolved = true
  const text = stringRecord(v.text)
  if (text) r.text = text
  const notFound = stringList(v.notFound)
  if (notFound) r.notFound = notFound
  const selected = stringList(v.selected)
  if (selected) r.selected = selected
  const order = stringList(v.order)
  if (order) r.order = order
  const assign = stringRecord(v.assign, 80)
  if (assign) r.assign = assign
  const lottery = stringRecord(v.lottery, 80)
  if (lottery) r.lottery = lottery
  if (v.hints !== undefined) r.hints = clampInt(v.hints, 0, 2, 0)
  if (v.followHints !== undefined) r.followHints = clampInt(v.followHints, 0, 2, 0)
  return r
}

/** Merges stored data with the current route, dropping anything that no longer fits. */
export function normalizeProgress(route: Route, raw: unknown): Progress {
  const base = createProgress(route)
  if (!isObject(raw) || raw.version !== 2) return base
  const ids = new Set(route.stations.map((s) => s.id))
  const stepIds = new Set(route.stations.flatMap((s) => [...s.mission.steps.map((st) => st.id), bonusKey(s.id)]))

  const stations = isObject(raw.stations) ? raw.stations : {}
  for (const station of route.stations) {
    const stored = stations[station.id]
    if (!isObject(stored)) continue
    base.stations[station.id] = {
      status: STATUSES.includes(stored.status as StationStatus) ? (stored.status as StationStatus) : 'pending',
      stepsOpen: clampInt(stored.stepsOpen, 1, station.mission.steps.length, 1),
      roleShift: clampInt(stored.roleShift, 0, 2, 0),
    }
  }
  const responses = isObject(raw.responses) ? raw.responses : {}
  for (const [id, value] of Object.entries(responses)) {
    if (!stepIds.has(id)) continue
    const r = normalizeResponse(value)
    if (r) base.responses[id] = r
  }
  base.started = raw.started === true
  base.mode = raw.mode === 'light' ? 'light' : 'full'
  base.currentStationId = isString(raw.currentStationId) && ids.has(raw.currentStationId) ? raw.currentStationId : null
  base.favoriteStationId = isString(raw.favoriteStationId) && ids.has(raw.favoriteStationId) ? raw.favoriteStationId : null
  base.updatedAt = isString(raw.updatedAt) ? raw.updatedAt : null
  return base
}

export function loadProgress(storage: SafeStorage, route: Route): Progress {
  return normalizeProgress(route, readJson(storage, progressKey(route.id)))
}

export function saveProgress(storage: SafeStorage, progress: Progress): boolean {
  return storage.set(progressKey(progress.routeId), JSON.stringify(progress))
}

export function emptyNames(): Names {
  return { parent: '', kids: ['', ''] }
}

export function loadNames(storage: SafeStorage, route: Route): Names {
  const fallback = emptyNames()
  const raw = readJson<Partial<Names>>(storage, namesKey(route.id))
  if (!raw || typeof raw !== 'object') return fallback
  const kids = Array.isArray(raw.kids) ? raw.kids : []
  return {
    parent: isString(raw.parent) ? raw.parent.slice(0, 40) : fallback.parent,
    kids: [
      isString(kids[0]) ? kids[0].slice(0, 40) : fallback.kids[0],
      isString(kids[1]) ? kids[1].slice(0, 40) : fallback.kids[1],
    ],
  }
}

export function saveNames(storage: SafeStorage, route: Route, names: Names): boolean {
  return storage.set(namesKey(route.id), JSON.stringify(names))
}

/** Display name with a generic fallback, so empty name fields never leave a blank. */
export function displayNames(names: Names, route: Route): Names {
  const d = route.nameFallbacks
  const pick = (value: string, fallback: string) => value.trim() || fallback
  return {
    parent: pick(names.parent, d.parent),
    kids: [pick(names.kids[0], d.kids[0]), pick(names.kids[1], d.kids[1])],
  }
}

/** "א", "א וב", "א, ב וג" from the names actually entered; null when none were. */
export function familyLine(names: Names): string | null {
  const list = [names.parent, ...names.kids].map((n) => n.trim()).filter(Boolean)
  if (list.length === 0) return null
  if (list.length === 1) return list[0]
  return `${list.slice(0, -1).join(', ')} ו${list[list.length - 1]}`
}

export function hasProgress(progress: Progress): boolean {
  return (
    progress.started ||
    Object.values(progress.stations).some((s) => s.status !== 'pending') ||
    Object.keys(progress.responses).length > 0
  )
}

export function countByStatus(progress: Progress, status: StationStatus): number {
  return Object.values(progress.stations).filter((s) => s.status === status).length
}

/**
 * Next station that still needs a visit: first pending station after `fromId`,
 * wrapping around, then skipped ones. Returns null when everything is done.
 */
export function nextStationId(route: Route, progress: Progress, fromId: string | null): string | null {
  const ids = route.stations.map((s) => s.id)
  const start = fromId ? ids.indexOf(fromId) + 1 : 0
  const ordered = [...ids.slice(start), ...ids.slice(0, start)].filter((id) => id !== fromId)
  const statusOf = (id: string) => progress.stations[id]?.status ?? 'pending'
  return ordered.find((id) => statusOf(id) === 'pending') ?? ordered.find((id) => statusOf(id) === 'skipped') ?? null
}

/** Where "continue" should lead. */
export function resumeStationId(route: Route, progress: Progress): string | null {
  const current = progress.currentStationId
  if (current && progress.stations[current]?.status !== 'done') return current
  const pending = route.stations.find((s) => progress.stations[s.id]?.status === 'pending')
  if (pending) return pending.id
  const skipped = route.stations.find((s) => progress.stations[s.id]?.status === 'skipped')
  return skipped ? skipped.id : null
}

export interface RoleAssignment {
  roleId: string
  label: string
  description: string
  name: string
}

/**
 * Three roles rotate between the two kids and the parent, one step per
 * station; a manual shift rotates them again at that station.
 */
export function rolesFor(route: Route, progress: Progress, names: Names, stationId: string): RoleAssignment[] {
  const index = Math.max(0, route.stations.findIndex((s) => s.id === stationId))
  const shift = progress.stations[stationId]?.roleShift ?? 0
  const people = [names.kids[0], names.kids[1], names.parent]
  return route.roles.map((role, r) => ({
    roleId: role.id,
    label: role.label,
    description: role.description,
    name: people[(r + index + shift) % people.length],
  }))
}

/** True when a step has any answer: typed, picked, ordered, or answered out loud. */
export function isStepAnswered(response: StepResponse | undefined): boolean {
  if (!response) return false
  if (response.aloud) return true
  if (response.selected?.length || response.order?.length || response.notFound?.length) return true
  if (response.assign && Object.keys(response.assign).length) return true
  if (response.lottery && Object.keys(response.lottery).length) return true
  return Object.values(response.text ?? {}).some((t) => t.trim() !== '')
}

export function stationOf(route: Route, stepId: string): Station | undefined {
  return route.stations.find((s) => s.mission.steps.some((st) => st.id === stepId))
}
