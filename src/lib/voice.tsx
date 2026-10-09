import { createContext, useContext } from 'react'
import type { Field, Step } from '../content'

// Wording that fits the group actually playing: "הקבוצה" / "הצוות" for a
// group, a personal form for someone playing alone.

export interface Voice {
  solo: boolean
  teams: boolean
  size: number
  /** Pick the group or the solo wording. */
  t: (group: string, solo: string) => string
}

export function makeVoice(size: number, teams: boolean): Voice {
  const solo = size === 1
  return { solo, teams, size, t: (group, single) => (solo ? single : group) }
}

const VoiceContext = createContext<Voice>(makeVoice(3, false))
export const VoiceProvider = VoiceContext.Provider
export const useVoice = () => useContext(VoiceContext)

export const stepPrompt = (step: Step, solo: boolean) => (solo && step.soloPrompt) || step.prompt
export const fieldLabel = (field: Field, solo: boolean) => (solo && field.soloLabel) || field.label
