import type { Route } from '../content'
import { personName, teamMembers, teamsActive, type GroupSettings, type Team } from './group'
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

/** "העיר שלנו" / "העיר שלי" / "העיר של צוות א" */
export function cityTitle(group: GroupSettings, team?: Team): string {
  if (team) return `העיר של ${team.name}`
  return group.participants.length === 1 ? 'העיר שלי' : 'העיר שלנו'
}

export function participantsLine(group: GroupSettings): string | null {
  return namesLine(group.participants.map((p) => personName(group, p.id)))
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
  lines.push(`הושלמו ${done} מתוך ${route.stations.length} תחנות`)
  if (favorite) lines.push(`התחנה האהובה: ${favorite.name}`)
  lines.push('', route.frame.disclaimer, '')

  if (teamsActive(group)) {
    for (const team of group.teams) {
      const responses = scopedResponses(progress, team.id)
      const members = namesLine(teamMembers(group, team.id).map((p) => personName(group, p.id)))
      lines.push(`== ${cityTitle(group, team)} ==`)
      if (members) lines.push(`חברי הצוות: ${members}`)
      lines.push('', ...planBlock(route, responses, false))
    }
    lines.push('== השוואה בין ההצעות (בלי מנצחים) ==', '')
    for (const station of route.stations) {
      const rows = group.teams
        .map((team) => {
          const section = cityPlan(route, scopedResponses(progress, team.id), { includeCharter: false }).find(
            (s) => s.station.id === station.id,
          )
          return section ? `${team.name}: ${section.lines.join(' · ')}` : null
        })
        .filter((r): r is string => r !== null)
      if (rows.length) {
        lines.push(station.mission.planTitle)
        for (const r of rows) lines.push(...indent(r))
        lines.push('')
      }
    }
    for (const team of group.teams) {
      lines.push(`== כל התשובות: ${team.name} ==`, '')
      lines.push(...answersBlock(route, progress, scopedResponses(progress, team.id), false))
    }
  } else {
    const responses = scopedResponses(progress, null)
    lines.push(`== תוכנית העיר ==`, '', ...planBlock(route, responses, solo))
    lines.push('== כל התשובות ==', '', ...answersBlock(route, progress, responses, solo))
  }
  lines.push('תודה על ההרפתקה!')
  return lines.join('\n')
}

export function summaryFileName(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `our-city-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.txt`
}
