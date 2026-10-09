// Content model for walking routes. UI components only read these types,
// so a new route is a new data file plus one line in ./index.ts.

export type StationIcon = 'kiosk' | 'fountain' | 'house' | 'tower' | 'monument' | 'horse' | 'hall'

/** Status of a physical site, kept separate from the check date so both can be updated. */
export interface SiteStatus {
  /** e.g. "closed-renovation". Free text key, UI shows `label`. */
  code: string
  label: string
  /** ISO date (YYYY-MM-DD) on which the status was last checked. */
  checkedOn: string
  sourceUrl?: string
}

export interface Station {
  id: string
  name: string
  /** Address shown to the family, as written in the source. */
  address: string
  /** Search string for Google Maps. Address-based, never invented coordinates. */
  mapsQuery: string
  icon: StationIcon
  /** Verified walking directions only. Leave undefined when not verified. */
  directions?: string
  /** 2–4 short sentences, about 30 seconds read aloud. */
  story: string
  task: string
  /** Only where a hint actually helps. */
  hint?: string
  /** Shown separately, so the solution is never visible up front. */
  reveal: {
    title: string
    text: string
  }
  /** Creative tasks have no single right answer. */
  creative: boolean
  /** Short practical note, e.g. "the fountain may be off". */
  note?: string
  /** True when the stop is planned from the outside only. */
  outsideOnly?: boolean
  siteStatus?: SiteStatus
}

export interface SourceLink {
  label: string
  url: string
}

export interface Route {
  id: string
  title: string
  subtitle: string
  intro: string
  durationText: string
  meetingPoint: {
    name: string
    address: string
    mapsQuery: string
  }
  reminders: string[]
  stations: Station[]
  about: {
    paragraphs: string[]
    cautions: string[]
    sources: SourceLink[]
    unverified: string[]
    contentCheckedOn: string
  }
  defaultNames: {
    parent: string
    kids: [string, string]
  }
}
