import type { Route } from '../content'
import { TEAM_LETTERS, teamMembers, teamsActive, type GroupSettings, type Participant } from './group'
import { cityPlan, summarizeStep } from './plan'
import { bonusKey, namesLine, scopedResponses, type Progress, type Responses, type StationStatus } from './progress'

const STATUS_TEXT: Record<StationStatus, string> = {
  pending: 'טרם ביקרנו',
  done: 'הושלמה',
  skipped: 'דולגה',
}

export function statusText(status: StationStatus): string {
  return STATUS_TEXT[status]
}

export function formatHebrewDate(date: Date): string {
  try {
    return new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
  } catch {
    return date.toISOString().slice(0, 10)
  }
}

/** ISO "YYYY-MM-DD" → Hebrew date text, without timezone drift. */
export function formatIsoDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return formatHebrewDate(new Date(y, m - 1, d))
}

const indent = (text: string, by = '   ') => text.split('\n').map((l) => `${by}${l}`)

/** "העיר שלנו" / "העיר שלי" */
export function cityTitle(group: GroupSettings): string {
  return group.participants.length === 1 ? 'העיר שלי' : 'העיר שלנו'
}

/** Only names someone actually typed; the "משתתף/ת 1" placeholders are left out. */
export function typedNames(people: Participant[]): string | null {
  return namesLine(people.map((p) => p.name))
}

export function participantsLine(group: GroupSettings): string | null {
  return typedNames(group.participants)
}

function membersText(people: Participant[]): string | null {
  if (people.length === 0) return null
  return typedNames(people) ?? (people.length === 1 ? 'משתתף/ת אחד/ת' : `${people.length} משתתפים`)
}

/** Team ids that have saved answers, in team order. */
export function teamIdsWithAnswers(progress: Progress): string[] {
  const ids = new Set<string>()
  for (const key of Object.keys(progress.responses)) {
    const at = key.indexOf('@')
    if (at >= 0) ids.add(key.slice(at + 1))
  }
  return [...ids].sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
}

export function teamLabel(group: GroupSettings, teamId: string): string {
  const team = group.teams.find((t) => t.id === teamId)
  if (team) return team.name
  const n = Number(/^t(\d+)$/.exec(teamId)?.[1])
  return n && TEAM_LETTERS[n - 1] ? `צוות ${TEAM_LETTERS[n - 1]}` : 'צוות'
}

/** One city plan: the whole group's, or one team's. */
export interface Board {
  teamId: string | null
  title: string
  /** Short name: "צוות א" / "כל הקבוצה". */
  label: string
  members: string | null
  /** Shown when this board's answers are not the ones being collected right now. */
  note: string | null
  responses: Responses
}

/**
 * Every set of answers worth showing at the end. Nothing saved is ever hidden:
 * group answers from before a split into teams, and answers of a team that was
 * removed (fewer teams, or teams switched off), still get their own card.
 */
export function boards(group: GroupSettings, progress: Progress): Board[] {
  const has = (r: Responses) => Object.keys(r).length > 0
  const active = teamsActive(group)
  const activeIds = active ? group.teams.map((t) => t.id) : []
  const result: Board[] = []
  const groupResponses = scopedResponses(progress, null)
  if (!active || has(groupResponses))
    result.push({
      teamId: null,
      title: active ? 'העיר של כל הקבוצה' : cityTitle(group),
      label: 'כל הקבוצה',
      members: !active && group.participants.length > 1 ? membersText(group.participants) : null,
      note: active ? 'תשובות מלפני החלוקה לצוותים.' : null,
      responses: groupResponses,
    })
  for (const id of activeIds)
    result.push({
      teamId: id,
      title: `העיר של ${teamLabel(group, id)}`,
      label: teamLabel(group, id),
      members: membersText(teamMembers(group, id)),
      note: null,
      responses: scopedResponses(progress, id),
    })
  for (const id of teamIdsWithAnswers(progress)) {
    if (activeIds.includes(id)) continue
    result.push({
      teamId: id,
      title: `העיר של ${teamLabel(group, id)}`,
      label: teamLabel(group, id),
      members: null,
      note: 'הצוות הזה כבר לא פעיל, והתשובות שלו נשמרו.',
      responses: scopedResponses(progress, id),
    })
  }
  return result
}

function planBlock(route: Route, responses: Responses, solo: boolean): string[] {
  const lines: string[] = []
  const plan = cityPlan(route, responses, { solo })
  if (plan.length === 0) lines.push('עוד לא נשמרו החלטות.', '')
  for (const section of plan) {
    lines.push(`${section.title} (${section.station.theme})`)
    for (const line of section.lines) lines.push(...indent(line))
    lines.push('')
  }
  return lines
}

function answersBlock(route: Route, progress: Progress, responses: Responses, solo: boolean): string[] {
  const lines: string[] = []
  route.stations.forEach((station, i) => {
    const status = progress.stations[station.id]?.status ?? 'pending'
    lines.push(`${i + 1}. ${station.name} (${statusText(status)})`)
    for (const step of station.mission.steps) {
      const answers = step.kind === 'charter' ? [] : summarizeStep(route, responses, step, solo)
      if (answers.length) {
        lines.push(`   ${step.title}:`)
        for (const a of answers) lines.push(...indent(a, '     '))
      }
    }
    const bonus = responses[bonusKey(station.id)]
    const bonusText = bonus?.text?.answer?.trim()
    if (bonusText || bonus?.aloud) lines.push(`   בונוס: ${bonusText || (solo ? 'עניתי בעל פה' : 'ענינו בעל פה')}`)
    lines.push('')
  })
  return lines
}

/** The downloadable city card(s) plus every answer, as plain text. */
export function buildSummary(route: Route, progress: Progress, group: GroupSettings, now = new Date()): string {
  const done = route.stations.filter((s) => progress.stations[s.id]?.status === 'done').length
  const favorite = route.stations.find((s) => s.id === progress.favoriteStationId)
  const solo = group.participants.length === 1
  const people = participantsLine(group)
  const lines: string[] = [`${cityTitle(group)} · ${route.title}`, `${route.subtitle}, ${formatHebrewDate(now)}`]
  if (people) lines.push(`${solo ? 'משתתף/ת' : 'משתתפים'}: ${people}`)
  else if (!solo) lines.push(`${group.participants.length} משתתפים`)
  lines.push(`הושלמו ${done} מתוך ${route.stations.length} תחנות`)
  if (favorite) lines.push(`התחנה האהובה: ${favorite.name}`)
  lines.push('', route.frame.disclaimer, '')

  const all = boards(group, progress)
  const several = all.length > 1
  for (const board of all) {
    const boardSolo = solo && board.teamId === null
    lines.push(several ? `== ${board.title} ==` : '== תוכנית העיר ==')
    if (board.members) lines.push(board.teamId ? `חברי הצוות: ${board.members}` : `הצוות: ${board.members}`)
    if (board.note) lines.push(board.note)
    lines.push('', ...planBlock(route, board.responses, boardSolo))
  }
  if (several) {
    lines.push('== השוואה בין ההצעות (בלי מנצחים) ==', '')
    for (const station of route.stations) {
      const rows = all
        .map((board) => {
          const section = cityPlan(route, board.responses, { includeCharter: false }).find((s) => s.station.id === station.id)
          return section ? `${board.title}: ${section.lines.join(' · ')}` : null
        })
        .filter((r): r is string => r !== null)
      if (rows.length) {
        lines.push(station.mission.planTitle)
        for (const r of rows) lines.push(...indent(r))
        lines.push('')
      }
    }
  }
  for (const board of all) {
    lines.push(several ? `== כל התשובות: ${board.label} ==` : '== כל התשובות ==', '')
    lines.push(...answersBlock(route, progress, board.responses, solo && board.teamId === null))
  }
  lines.push('תודה על ההרפתקה!')
  return lines.join('\n')
}

export function summaryFileName(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `our-city-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.txt`
}
