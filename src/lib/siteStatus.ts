import type { SiteStatus, SiteStatusCode, Station } from '../content'

const STATUS_LABEL: Record<SiteStatusCode, string> = {
  closed_for_renovation: 'סגור לשיפוצים',
  open: 'פתוח',
}

/** "2026-10-09" → "9.10.2026" */
export function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return y && m && d ? `${d}.${m}.${y}` : iso
}

export function siteStatusMessage(status: SiteStatus): string {
  return `${status.placeName} ${STATUS_LABEL[status.status]} לפי הבדיקה מ־${formatShortDate(status.lastChecked)}.`
}

export const EXTERIOR_MESSAGE = 'בתחנה זו עוצרים מחוץ לבניין.'

/** All notice lines for a station, in display order. */
export function stationNotices(station: Station): { text: string; strong: boolean }[] {
  const lines: { text: string; strong: boolean }[] = []
  if (station.siteStatus) lines.push({ text: siteStatusMessage(station.siteStatus), strong: true })
  if (station.visitType === 'exterior') lines.push({ text: EXTERIOR_MESSAGE, strong: !!station.siteStatus })
  if (station.note) lines.push({ text: station.note, strong: false })
  return lines
}
