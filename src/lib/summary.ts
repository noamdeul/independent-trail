import type { Route } from '../content'
import { cityPlan, summarizeStep } from './plan'
import { bonusKey, familyLine, type Names, type Progress, type StationStatus } from './progress'

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

const indent = (text: string) => text.split('\n').map((l) => `   ${l}`)

/** The downloadable "העיר שלנו" card plus every answer, as plain text. */
export function buildSummary(route: Route, progress: Progress, names: Names, now = new Date()): string {
  const done = route.stations.filter((s) => progress.stations[s.id]?.status === 'done').length
  const favorite = route.stations.find((s) => s.id === progress.favoriteStationId)
  const family = familyLine(names)
  const lines: string[] = [`העיר שלנו · ${route.title}`, `${route.subtitle}, ${formatHebrewDate(now)}`]
  if (family) lines.push(`הצוות: ${family}`)
  lines.push(`הושלמו ${done} מתוך ${route.stations.length} תחנות`)
  if (favorite) lines.push(`התחנה האהובה: ${favorite.name}`)
  lines.push('', route.frame.disclaimer, '', '== תוכנית העיר המשפחתית ==', '')

  const plan = cityPlan(route, progress)
  if (plan.length === 0) lines.push('עוד לא נשמרו החלטות.', '')
  for (const section of plan) {
    lines.push(`${section.title} (${section.station.theme})`)
    for (const line of section.lines) lines.push(...indent(line))
    lines.push('')
  }

  lines.push('== כל התשובות ==', '')
  route.stations.forEach((station, i) => {
    const status = progress.stations[station.id]?.status ?? 'pending'
    lines.push(`${i + 1}. ${station.name} (${statusText(status)})`)
    for (const step of station.mission.steps) {
      const answers = step.kind === 'charter' ? [] : summarizeStep(route, progress, step)
      if (answers.length) {
        lines.push(`   ${step.title}:`)
        for (const a of answers) lines.push(...indent(`  ${a}`))
      }
    }
    const bonus = progress.responses[bonusKey(station.id)]
    const bonusText = bonus?.text?.answer?.trim()
    if (bonusText || bonus?.aloud) lines.push(`   בונוס: ${bonusText || 'ענינו בעל פה'}`)
    lines.push('')
  })
  lines.push('תודה על ההרפתקה!')
  return lines.join('\n')
}

export function summaryFileName(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `our-city-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.txt`
}
