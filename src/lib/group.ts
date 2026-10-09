// Who is playing: a variable list of participants with stable ids, an
// optional split into teams, the chosen difficulty level, and the role
// rotation. Kept apart from progress, so resetting the activity keeps the
// group, and editing the group never touches saved answers.

import type { LevelId, Role, Route } from '../content'
import { readJson, type SafeStorage } from './storage'

export interface Participant {
  /** Stable id, independent of name and list position. */
  id: string
  name: string
  age?: number
}

export interface Team {
  id: string
  name: string
}

export type GroupMode = 'together' | 'teams'

export interface GroupSettings {
  version: 1
  participants: Participant[]
  mode: GroupMode
  teams: Team[]
  /** participant id → team id */
  teamOf: Record<string, string>
  level: LevelId
  /** The team currently answering on this shared device. */
  activeTeamId: string | null
}

/** Teams are offered from this group size. */
export const TEAMS_FROM = 6
export const TEAM_LETTERS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח']
const LEVELS: LevelId[] = ['light', 'regular', 'challenge']
const MAX_PARTICIPANTS = 30

export const groupKey = (routeId: string) => `shdera:v3:group:${routeId}`

let counter = 0
export function newId(prefix: string): string {
  counter += 1
  return `${prefix}-${Date.now().toString(36)}${counter.toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`
}

export function defaultGroup(route: Route): GroupSettings {
  return {
    version: 1,
    participants: route.defaultParticipants.map((p, i) => ({ id: `p${i + 1}`, name: p.name, age: p.age })),
    mode: 'together',
    teams: [],
    teamOf: {},
    level: 'regular',
    activeTeamId: null,
  }
}

const isString = (v: unknown): v is string => typeof v === 'string'
const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

export function normalizeAge(v: unknown): number | undefined {
  const n = typeof v === 'string' ? Number(v) : v
  return typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 120 ? n : undefined
}

export function normalizeGroup(route: Route, raw: unknown): GroupSettings {
  const base = defaultGroup(route)
  if (!isObject(raw) || raw.version !== 1 || !Array.isArray(raw.participants)) return base
  const seen = new Set<string>()
  const participants: Participant[] = []
  for (const p of raw.participants.slice(0, MAX_PARTICIPANTS)) {
    if (!isObject(p) || !isString(p.id) || !p.id || seen.has(p.id)) continue
    seen.add(p.id)
    participants.push({ id: p.id.slice(0, 40), name: isString(p.name) ? p.name.slice(0, 40) : '', age: normalizeAge(p.age) })
  }
  if (participants.length === 0) return base
  const teams: Team[] = Array.isArray(raw.teams)
    ? raw.teams
        .filter((t): t is { id: string; name: unknown } => isObject(t) && isString(t.id))
        .slice(0, TEAM_LETTERS.length)
        .map((t, i) => ({ id: t.id.slice(0, 40), name: isString(t.name) && t.name.trim() ? t.name.slice(0, 30) : `צוות ${TEAM_LETTERS[i]}` }))
    : []
  const teamIds = new Set(teams.map((t) => t.id))
  const teamOf: Record<string, string> = {}
  if (isObject(raw.teamOf))
    for (const [pid, tid] of Object.entries(raw.teamOf)) if (seen.has(pid) && isString(tid) && teamIds.has(tid)) teamOf[pid] = tid
  return {
    version: 1,
    participants,
    mode: raw.mode === 'teams' ? 'teams' : 'together',
    teams,
    teamOf,
    level: LEVELS.includes(raw.level as LevelId) ? (raw.level as LevelId) : 'regular',
    activeTeamId: isString(raw.activeTeamId) && teamIds.has(raw.activeTeamId) ? raw.activeTeamId : null,
  }
}

export function loadGroup(storage: SafeStorage, route: Route): GroupSettings {
  return normalizeGroup(route, readJson(storage, groupKey(route.id)))
}

export function saveGroup(storage: SafeStorage, route: Route, group: GroupSettings): boolean {
  return storage.set(groupKey(route.id), JSON.stringify(group))
}

/** Name to show, with a neutral fallback for an empty field. */
export function personName(group: GroupSettings, id: string): string {
  const index = group.participants.findIndex((p) => p.id === id)
  if (index < 0) return ''
  return group.participants[index].name.trim() || `משתתף/ת ${index + 1}`
}

export function teamsActive(group: GroupSettings): boolean {
  return group.mode === 'teams' && group.participants.length >= TEAMS_FROM && group.teams.length >= 2
}

/** Splits people into `count` teams (default: as many teams of up to 4 as needed, at least 2). */
export function autoTeams(participants: Participant[], count?: number): Pick<GroupSettings, 'teams' | 'teamOf'> {
  const n = participants.length
  const k = Math.max(2, Math.min(count ?? Math.ceil(n / 4), Math.floor(n / 2), TEAM_LETTERS.length))
  const teams: Team[] = Array.from({ length: k }, (_, i) => ({ id: `t${i + 1}`, name: `צוות ${TEAM_LETTERS[i]}` }))
  const teamOf: Record<string, string> = {}
  participants.forEach((p, i) => (teamOf[p.id] = teams[i % k].id))
  return { teams, teamOf }
}

export function teamMembers(group: GroupSettings, teamId: string): Participant[] {
  return group.participants.filter((p) => group.teamOf[p.id] === teamId)
}

/** Makes teams usable after any edit: everyone has a team that exists. */
export function repairTeams(group: GroupSettings): GroupSettings {
  if (group.mode !== 'teams' || group.participants.length < TEAMS_FROM) return group
  let { teams, teamOf } = group
  if (teams.length < 2) ({ teams, teamOf } = autoTeams(group.participants))
  const ids = new Set(teams.map((t) => t.id))
  const next: Record<string, string> = {}
  const size = (tid: string) => Object.values(next).filter((t) => t === tid).length
  for (const p of group.participants) if (ids.has(teamOf[p.id])) next[p.id] = teamOf[p.id]
  for (const p of group.participants) {
    if (next[p.id]) continue
    next[p.id] = [...teams].sort((a, b) => size(a.id) - size(b.id))[0].id
  }
  const activeTeamId = group.activeTeamId && ids.has(group.activeTeamId) ? group.activeTeamId : teams[0].id
  return { ...group, teams, teamOf: next, activeTeamId }
}

/** A level suggestion from the ages that were entered. Never applied automatically. */
export function suggestLevel(participants: Participant[]): LevelId | null {
  const ages = participants.map((p) => p.age).filter((a): a is number => a !== undefined)
  if (ages.length === 0) return null
  const youngest = Math.min(...ages)
  if (youngest < 8) return 'light'
  if (youngest >= 12) return 'challenge'
  return 'regular'
}

export interface RoleSlot {
  role: Role
  personId: string
  /** False when the group changed this role by hand. */
  auto: boolean
}

/**
 * Suggested roles for one station.
 *  - 2–5 people: role r goes to person (r + station + shift) mod n, so with 2
 *    people each has several roles and they swap at the next station.
 *  - 6+ people: the five roles move on by five people each station, so the
 *    lead (navigation) passes to someone new each time.
 * Manual overrides win while that person is still in the group.
 */
export function assignRoles(
  roles: Role[],
  people: Participant[],
  stationIndex: number,
  shift = 0,
  overrides: Record<string, string> = {},
): RoleSlot[] {
  const n = people.length
  if (n === 0) return []
  const ids = new Set(people.map((p) => p.id))
  const offset = n <= roles.length ? stationIndex + shift : stationIndex * roles.length + shift
  return roles.map((role, r) => {
    const manual = overrides[role.id]
    if (manual && ids.has(manual)) return { role, personId: manual, auto: false }
    return { role, personId: people[(r + offset) % n].id, auto: true }
  })
}

/** Roles grouped per person, in list order. People without a role are included. */
export function rolesByPerson(slots: RoleSlot[], people: Participant[]): { person: Participant; roles: Role[] }[] {
  return people.map((person) => ({ person, roles: slots.filter((s) => s.personId === person.id).map((s) => s.role) }))
}
