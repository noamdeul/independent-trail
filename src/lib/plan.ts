// Turns mission answers into readable lines: for the "all answers" list,
// for the family city card ("העיר שלנו") and for the city charter.
// Pure functions, local templates only. Nothing here grades an answer.

import type { BudgetStep, CharterStep, Option, Route, Station, Step } from '../content'
import type { Responses, StepResponse } from './progress'

export const BLANK = '______'

/** "א", "א וב", "א, ב וג" */
export function joinHebrew(list: string[]): string {
  const items = list.map((s) => s.trim()).filter(Boolean)
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} ו${items[items.length - 1]}`
}

const labelOf = (options: Option[], id: string) => options.find((o) => o.id === id)?.label ?? id
const textOf = (r: StepResponse | undefined, key: string) => r?.text?.[key]?.trim() ?? ''

export function findStep(route: Route, id: string): Step | undefined {
  for (const station of route.stations) {
    const step = station.mission.steps.find((s) => s.id === id)
    if (step) return step
  }
  return undefined
}

export function budgetCost(step: BudgetStep, selected: string[]): number {
  return selected.reduce((sum, id) => sum + (step.options.find((o) => o.id === id)?.cost ?? 0), 0)
}

/** The current budget pick, falling back to the earlier step it starts from. */
export function budgetSelection(step: BudgetStep, responses: Responses): string[] {
  const own = responses[step.id]?.selected
  if (own) return own
  if (step.startFrom) return responses[step.startFrom]?.selected ?? []
  return []
}

function fieldLines(step: Step, r: StepResponse | undefined, onlyPlan: boolean): string[] {
  return (step.fields ?? [])
    .filter((f) => !onlyPlan || f.plan)
    .map((f) => [f.label, textOf(r, f.id)] as const)
    .filter(([, t]) => t)
    .map(([label, t]) => `${label}: ${t}`)
}

/** Every answer of one step, as plain lines. */
export function summarizeStep(route: Route, responses: Responses, step: Step, solo = false): string[] {
  const r = responses[step.id]
  const lines: string[] = []
  switch (step.kind) {
    case 'observe':
      step.items.forEach((item, i) => {
        if (r?.notFound?.includes(`item${i}`)) lines.push(`${item}: לא מצאנו`)
        else if (textOf(r, `item${i}`)) lines.push(`${item}: ${textOf(r, `item${i}`)}`)
      })
      break
    case 'seeThink':
      for (let i = 0; i < step.rows; i++) {
        const seen = textOf(r, `seen${i}`)
        const think = textOf(r, `think${i}`)
        if (seen || think) lines.push(`פרט ${i + 1}: ראינו ${seen || BLANK}. אנחנו חושבים ${think || BLANK}.`)
      }
      break
    case 'budget': {
      const selected = r?.selected ?? []
      if (selected.length)
        lines.push(
          `בחרנו: ${joinHebrew(selected.map((id) => labelOf(step.options, id)))} (${budgetCost(step, selected)} מתוך ${step.budget})`,
        )
      break
    }
    case 'choice':
      for (const o of step.options)
        for (const f of step.perOption ?? []) {
          const t = textOf(r, `${o.id}:${f.id}`)
          if (t) lines.push(`${o.label}, ${f.label}: ${t}`)
        }
      for (const id of r?.selected ?? []) {
        const links = (step.perPicked ?? []).map((f) => textOf(r, `${id}:${f.id}`)).filter(Boolean)
        lines.push(`בחרנו: ${labelOf(step.options, id)}${links.length ? ` (${links.join('; ')})` : ''}`)
      }
      break
    case 'categorize':
      for (const card of step.cards) {
        const cat = r?.assign?.[card.id]
        if (cat) lines.push(`${card.label}: ${labelOf(step.categories, cat)}`)
      }
      break
    case 'order':
      if (r?.order?.length) lines.push(`הסדר שלנו: ${r.order.map((id, i) => `${i + 1}. ${labelOf(step.cards, id)}`).join(', ')}`)
      if (textOf(r, 'followUp')) lines.push(`${step.followUp?.question ?? ''} ${textOf(r, 'followUp')}`.trim())
      break
    case 'match':
      for (const item of step.items) {
        const t = r?.assign?.[item.id]
        if (t) lines.push(`${item.label}: ${labelOf(step.targets, t)}`)
      }
      break
    case 'lottery': {
      const match = findStep(route, step.from)
      if (match?.kind === 'match' && r?.lottery)
        lines.push(
          `תוצאת ההגרלה: ${match.items
            .filter((i) => r.lottery?.[i.id])
            .map((i) => `${i.label}: ${labelOf(match.targets, r.lottery![i.id])}`)
            .join(', ')}`,
        )
      break
    }
    case 'charter':
      lines.push(charterText(charterValues(route, responses, step), solo))
      return lines
    case 'open':
      break
  }
  lines.push(...fieldLines(step, r, false))
  if (r?.aloud) lines.push(solo ? 'עניתי בעל פה' : 'ענינו בעל פה')
  return lines
}

/** Only what this step contributes to the family city plan. */
export function planLines(route: Route, responses: Responses, step: Step, solo = false): string[] {
  if (!step.plan) return []
  const r = responses[step.id]
  const lines: string[] = []
  switch (step.kind) {
    case 'budget': {
      const selected = budgetSelection(step, responses)
      if (selected.length) lines.push(joinHebrew(selected.map((id) => labelOf(step.options, id))))
      break
    }
    case 'choice':
      for (const id of r?.selected ?? []) {
        const links = (step.perPicked ?? []).map((f) => textOf(r, `${id}:${f.id}`)).filter(Boolean)
        lines.push(`${labelOf(step.options, id)}${links.length ? `: ${links.join('; ')}` : ''}`)
      }
      break
    case 'charter': {
      const v = charterValues(route, responses, step)
      const empty = [v.team, v.city, ...v.principles, v.build, v.preserve, v.divide].every((t) => !t.trim())
      return empty ? [] : [charterText(v, solo)]
    }
    default:
      break
  }
  for (const f of step.fields ?? []) {
    const t = textOf(r, f.id)
    if (f.plan && t) lines.push(t)
  }
  return lines
}

export interface PlanSection {
  station: Station
  title: string
  lines: string[]
}

export function cityPlan(
  route: Route,
  responses: Responses,
  options: { includeCharter?: boolean; solo?: boolean } = {},
): PlanSection[] {
  return route.stations
    .map((station) => ({
      station,
      title: station.mission.planTitle,
      lines: station.mission.steps
        .filter((s) => options.includeCharter !== false || s.kind !== 'charter')
        .flatMap((s) => planLines(route, responses, s, options.solo)),
    }))
    .filter((section) => section.lines.length > 0)
}

export interface CharterValues {
  team: string
  city: string
  principles: [string, string, string]
  build: string
  preserve: string
  divide: string
}

export type CharterKey = 'team' | 'city' | 'build' | 'preserve' | 'divide'

/** Suggestions pulled from earlier answers. */
export function charterSuggestions(route: Route, responses: Responses, step: CharterStep): Omit<CharterValues, 'team' | 'city'> {
  const principlesStep = findStep(route, step.from.principles)
  const picked = responses[step.from.principles]?.selected ?? []
  const principles = picked.map((id) => (principlesStep && 'options' in principlesStep ? labelOf(principlesStep.options, id) : id))

  let build = ''
  for (const id of step.from.build) {
    const s = findStep(route, id)
    if (s?.kind !== 'budget') continue
    const sel = budgetSelection(s, responses)
    if (sel.length) {
      build = joinHebrew(sel.map((o) => labelOf(s.options, o)))
      break
    }
  }

  const preserveStep = findStep(route, step.from.preserve)
  const preserveId = responses[step.from.preserve]?.selected?.[0]
  const preserveOpt = preserveStep && 'options' in preserveStep ? preserveStep.options.find((o) => o.id === preserveId) : undefined
  const preserve = preserveOpt?.phrase ?? preserveOpt?.label ?? ''

  const divideStep = findStep(route, step.from.divide)
  const divideResponse = responses[step.from.divide]
  const divideOpt =
    divideStep && 'options' in divideStep ? divideStep.options.find((o) => o.id === divideResponse?.selected?.[0]) : undefined
  const ruleField = divideStep?.fields?.find((f) => f.plan)
  const divide = divideOpt?.phrase ?? (ruleField ? textOf(divideResponse, ruleField.id) : '') ?? ''

  return {
    principles: [principles[0] ?? '', principles[1] ?? '', principles[2] ?? ''],
    build,
    preserve,
    divide,
  }
}

export function charterValues(route: Route, responses: Responses, step: CharterStep): CharterValues {
  const r = responses[step.id]
  const s = charterSuggestions(route, responses, step)
  const pick = (key: CharterKey, fallback: string) => textOf(r, key) || fallback
  return {
    team: pick('team', ''),
    city: pick('city', ''),
    principles: s.principles,
    build: pick('build', s.build),
    preserve: pick('preserve', s.preserve),
    divide: pick('divide', s.divide),
  }
}

export function charterText(v: CharterValues, solo = false): string {
  const b = (t: string) => t.trim() || BLANK
  const [p1, p2, p3] = v.principles.map(b)
  if (solo)
    return [
      `אני, ${b(v.team)}, מקים/ה את העיר ${b(v.city)}.`,
      `בעיר שלי חשוב לי ${p1}, ${p2} ו${p3}.`,
      `לכן אבנה ${b(v.build)}, אשמור על ${b(v.preserve)} ואחליט על חלוקה באמצעות ${b(v.divide)}.`,
    ].join('\n')
  return [
    `אנחנו, צוות ${b(v.team)}, מקימים את העיר ${b(v.city)}.`,
    `בעיר שלנו חשוב לנו ${p1}, ${p2} ו${p3}.`,
    `לכן נבנה ${b(v.build)}, נשמור על ${b(v.preserve)} ונחליט על חלוקה באמצעות ${b(v.divide)}.`,
  ].join('\n')
}

export function findCharterStep(route: Route): CharterStep | undefined {
  for (const station of route.stations)
    for (const step of station.mission.steps) if (step.kind === 'charter') return step
  return undefined
}
