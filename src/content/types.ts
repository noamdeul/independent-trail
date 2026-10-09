// Content model for walking routes. UI components only read these types,
// so a new route is a new data file plus one line in ./index.ts.

export type StationIcon = 'kiosk' | 'fountain' | 'house' | 'tower' | 'monument' | 'horse' | 'hall'

/** How the stop is planned. "exterior" = we stay outside the building. */
export type VisitType = 'exterior' | 'interior'

export type SiteStatusCode = 'closed_for_renovation' | 'open'

/** Status of a physical site. Status and check date are separate so each can be updated alone. */
export interface SiteStatus {
  status: SiteStatusCode
  /** Short name used in the notice, e.g. "היכל העצמאות". */
  placeName: string
  /** ISO date (YYYY-MM-DD) of the last check. */
  lastChecked: string
  sourceUrl?: string
}

export interface Station {
  id: string
  name: string
  /** Address shown to the family. */
  address: string
  /** Google Maps search string: station name + address. Never coordinates. */
  mapsQuery: string
  icon: StationIcon
  /** Verified walking directions only. Leave undefined when there are none. */
  directions?: string
  /** Background facts about the place, shown on request. */
  info: string
  /** 2–4 short sentences, about 30 seconds read aloud. */
  story: string
  task: string
  /** Only where a hint actually helps. */
  hint?: string
  /** Creative tasks have no single right answer and never show one. */
  creative: boolean
  /** Short practical note, e.g. "the fountain may be off". */
  note?: string
  visitType?: VisitType
  siteStatus?: SiteStatus
}

export interface SourceLink {
  label: string
  url: string
}

export interface PlaceRef {
  name: string
  address: string
}

export interface Route {
  id: string
  title: string
  subtitle: string
  intro: string
  durationText: string
  /** Where the activity starts (a public place, not a personal meeting point). */
  startPoint: string
  reminders: string[]
  stations: Station[]
  about: {
    paragraphs: string[]
    cautions: string[]
    /** Official stations not included in this short route, for context only. */
    otherStations: PlaceRef[]
    otherStationsNote: string
    sources: SourceLink[]
    unverified: string[]
    contentCheckedOn: string
  }
  /** Generic labels shown when a name field is left empty. */
  nameFallbacks: {
    parent: string
    kids: [string, string]
  }
}
