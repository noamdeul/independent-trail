// Content model for walking routes. UI components only read these types,
// so a new route is a new data file plus one line in ./index.ts.
//
// The model keeps three kinds of content apart:
//  - historical facts (Station.story, Paragraph kind "fact"),
//  - interpretation and reading questions (Paragraph kind "interpretation"),
//  - fictional game scenarios (Mission.scenario and every Step).

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

export interface Paragraph {
  kind: 'fact' | 'interpretation' | 'note'
  text: string
}

export interface Field {
  id: string
  label: string
  /** Multi-line answer (a short story etc.). */
  long?: boolean
  /** Goes into the city plan. */
  plan?: boolean
  /** Label used when one person plays alone. */
  soloLabel?: string
}

export interface Option {
  id: string
  label: string
  detail?: string
  /** Fictional game cost. */
  cost?: number
  /** Wording used when this choice is quoted in the city charter. */
  phrase?: string
}

interface StepBase {
  /** Globally unique, e.g. "s3-match". Used as the storage key. */
  id: string
  title: string
  prompt: string
  /** Prompt for a single player, when the group prompt assumes conversation. */
  soloPrompt?: string
  /** Hidden at the "light" level. */
  advanced?: boolean
  bullets?: string[]
  /** Two graded hints, only for closed tasks. */
  hints?: [string, string]
  /** For closed tasks: shown only after an explicit tap. */
  solution?: string
  /** For open tasks: one possible way of thinking, never "the" answer. */
  example?: string
  /** Shown when the site is hidden, closed or not accessible. */
  fallback?: string
  /** This step's choices go into the family city plan. */
  plan?: boolean
  /** A schematic, clearly-labelled illustration drawn in the UI. */
  illustration?: 'plots'
  /** Free-text fields under the step. */
  fields?: Field[]
}

export interface ObserveStep extends StepBase {
  kind: 'observe'
  /** One row per thing to look for. */
  items: string[]
}

export interface SeeThinkStep extends StepBase {
  kind: 'seeThink'
  rows: number
}

export interface BudgetStep extends StepBase {
  kind: 'budget'
  budget: number
  /** "מטבעות" / "נקודות" */
  unit: string
  options: Option[]
  /** Pre-fill from an earlier budget step (used when the budget shrinks). */
  startFrom?: string
  /** Hidden until the family taps to reveal it. */
  announcement?: string
}

export interface ChoiceStep extends StepBase {
  kind: 'choice'
  options: Option[]
  /** How many cards can be picked. 1 = single choice. */
  max: number
  /** Fields asked for every option (e.g. pro and con for each plan). */
  perOption?: Field[]
  /** Fields asked for each picked option. */
  perPicked?: Field[]
  /** Show the plan items saved so far, as a reminder. */
  showPlan?: boolean
}

export interface CategorizeStep extends StepBase {
  kind: 'categorize'
  categories: Option[]
  cards: (Option & { answer: string })[]
}

export interface OrderStep extends StepBase {
  kind: 'order'
  /** In the correct order. */
  cards: Option[]
  /** Starting order shown to the family (ids). */
  start: string[]
  followUp?: {
    question: string
    hints: [string, string]
    answer: string
  }
}

export interface MatchStep extends StepBase {
  kind: 'match'
  items: Option[]
  targets: Option[]
}

export interface LotteryStep extends StepBase {
  kind: 'lottery'
  /** The match step whose items and targets are drawn. */
  from: string
}

export interface OpenStep extends StepBase {
  kind: 'open'
}

export interface CharterStep extends StepBase {
  kind: 'charter'
  /** Earlier steps whose answers pre-fill the charter blanks. */
  from: {
    principles: string
    /** First step with a selection wins. */
    build: string[]
    preserve: string
    divide: string
  }
}

export type Step =
  | ObserveStep
  | SeeThinkStep
  | BudgetStep
  | ChoiceStep
  | CategorizeStep
  | OrderStep
  | MatchStep
  | LotteryStep
  | OpenStep
  | CharterStep

export interface Mission {
  title: string
  /** Name of this station's part in the family city plan. */
  planTitle: string
  /** Shown above the steps when the scenario is fictional. */
  scenario?: string
  steps: Step[]
  /** Optional bonus dilemma, shown at the "challenge" level. */
  bonus: string
  soloBonus?: string
}

/**
 * How a station's story can be watched or heard.
 *  - manual:   the group switches to the official app themselves (no link we
 *              can promise opens the right station).
 *  - external: a verified link to the clip, opened in a new tab.
 *  - video / audio: a verified file or embed we are allowed to play in the game.
 * Never invent URLs, and never copy or extract files from the official app.
 */
export type MediaKind = 'manual' | 'external' | 'video' | 'audio'

export interface StationMedia {
  kind: MediaKind
  /** Name to look for in the official app. */
  appStationName: string
  /** Short question to keep in mind while watching or listening. */
  prepQuestion: string
  /** Verified URL. Required for external, video and audio; unused for manual. */
  url?: string
  /** Who made it and the permission to use it. Shown next to any player or link. */
  credit?: string
  license?: string
  /** Text version of the clip, if one is provided. */
  transcript?: string
}

export interface Station {
  id: string
  name: string
  /** One of the city themes, e.g. "מקום מפגש". */
  theme: string
  address: string
  /** Google Maps search string: station name + address. Never coordinates. */
  mapsQuery: string
  icon: StationIcon
  /** Verified walking directions only. */
  directions?: string
  /** "הסיפור בקצרה": historical facts, 30–45 seconds read aloud. */
  story: string
  /** "רוצים לדעת יותר?" */
  more: Paragraph[]
  mission: Mission
  /** Optional official video / narration for this station. */
  media?: StationMedia
  note?: string
  visitType?: VisitType
  siteStatus?: SiteStatus
}

export interface SourceLink {
  label: string
  url?: string
}

export interface PlaceRef {
  name: string
  address: string
}

export interface Role {
  id: string
  label: string
  description: string
}

export type LevelId = 'light' | 'regular' | 'challenge'

export interface Level {
  id: LevelId
  label: string
  duration: string
  description: string
}

export interface ParticipantSeed {
  name: string
  age?: number
}

export interface Route {
  id: string
  title: string
  subtitle: string
  frame: {
    title: string
    text: string
    soloText: string
    disclaimer: string
  }
  levels: Level[]
  /** Where the activity starts (a public place). */
  startPoint: string
  /** The official trail app, used for the video and narration of each station. */
  officialApp?: {
    name: string
    /** Store page only. It installs the app; it does not open a station. */
    storeUrl: string
    storeLabel: string
  }
  reminders: string[]
  roles: Role[]
  stations: Station[]
  about: {
    paragraphs: string[]
    cautions: string[]
    otherStations: PlaceRef[]
    otherStationsNote: string
    sources: SourceLink[]
    unverified: string[]
    contentCheckedOn: string
  }
  /** Editable starting list of participants. */
  defaultParticipants: ParticipantSeed[]
}
