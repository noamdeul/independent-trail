import type { Route } from '../content'
import { readJson, type SafeStorage } from './storage'

export type StationStatus = 'pending' | 'done' | 'skipped'

export interface StationProgress {
  status: StationStatus
  note: string
  /** Manual swap of the navigator / reader roles at this station. */
  rolesSwapped: boolean
}

export interface Names {
  parent: string
  kids: [string, string]
}

export interface Progress {
  version: 1
  routeId: string
  started: boolean
  currentStationId: string | null
  stations: Record<string, StationProgress>
  favoriteStationId: string | null
  updatedAt: string | null
}

const SCHEMA = 'v1'
export const progressKey = (routeId: string) => `shdera:${SCHEMA}:progress:${routeId}`
export const namesKey = (routeId: string) => `shdera:${SCHEMA}:names:${routeId}`

export function emptyStation(): StationProgress {
  return { status: 'pending', note: '', rolesSwapped: false }
}

export function createProgress(route: Route): Progress {
  return {
    version: 1,
    routeId: route.id,
    started: false,
    currentStationId: null,
    stations: Object.fromEntries(route.stations.map((s) => [s.id, emptyStation()])),
    favoriteStationId: null,
    updatedAt: null,
  }
}

const STATUSES: StationStatus[] = ['pending', 'done', 'skipped']
const isString = (v: unknown): v is string => typeof v === 'string'

/** Merges stored data with the current route, dropping anything that no longer fits. */
export function normalizeProgress(route: Route, raw: unknown): Progress {
  const base = createProgress(route)
  if (!raw || typeof raw !== 'object') return base
  const data = raw as Partial<Progress>
  if (data.version !== 1) return base
  const ids = new Set(route.stations.map((s) => s.id))

  for (const id of ids) {
    const stored = data.stations?.[id] as Partial<StationProgress> | undefined
    if (!stored || typeof stored !== 'object') continue
    base.stations[id] = {
      status: STATUSES.includes(stored.status as StationStatus) ? (stored.status as StationStatus) : 'pending',
      note: isString(stored.note) ? stored.note.slice(0, 2000) : '',
      rolesSwapped: stored.rolesSwapped === true,
    }
  }
  base.started = data.started === true
  base.currentStationId = isString(data.currentStationId) && ids.has(data.currentStationId) ? data.currentStationId : null
  base.favoriteStationId = isString(data.favoriteStationId) && ids.has(data.favoriteStationId) ? data.favoriteStationId : null
  base.updatedAt = isString(data.updatedAt) ? data.updatedAt : null
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
    Object.values(progress.stations).some((s) => s.status !== 'pending' || s.note.trim() !== '')
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

export interface Roles {
  navigator: string
  reader: string
}

/** Kids alternate roles station by station; a manual swap flips that station. */
export function rolesFor(route: Route, progress: Progress, names: Names, stationId: string): Roles {
  const index = Math.max(0, route.stations.findIndex((s) => s.id === stationId))
  const swapped = progress.stations[stationId]?.rolesSwapped === true
  const first = (index % 2 === 0) !== swapped ? 0 : 1
  return { navigator: names.kids[first], reader: names.kids[1 - first] }
}
