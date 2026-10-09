import type { Route } from '../content'
import type { Names, Progress, StationStatus } from './progress'

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

export function buildSummary(route: Route, progress: Progress, names: Names, now = new Date()): string {
  const done = route.stations.filter((s) => progress.stations[s.id]?.status === 'done').length
  const favorite = route.stations.find((s) => s.id === progress.favoriteStationId)
  const lines: string[] = [
    `${route.title}: ${route.subtitle}`,
    formatHebrewDate(now),
    `משתתפים: ${names.parent}, ${names.kids[0]} ו${names.kids[1]}`,
    `הושלמו ${done} מתוך ${route.stations.length} תחנות`,
  ]
  if (favorite) lines.push(`התחנה האהובה: ${favorite.name}`)
  lines.push('')
  route.stations.forEach((station, i) => {
    const p = progress.stations[station.id]
    lines.push(`${i + 1}. ${station.name} (${statusText(p?.status ?? 'pending')})`)
    lines.push(`   משימה: ${station.task}`)
    const note = p?.note.trim()
    if (note) lines.push(`   מה כתבנו: ${note.replace(/\s*\n\s*/g, ' / ')}`)
    lines.push('')
  })
  lines.push('תודה על ההרפתקה!')
  return lines.join('\n')
}

export function summaryFileName(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `shdera-summary-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.txt`
}
