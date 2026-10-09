import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Route } from '../content'
import {
  createProgress,
  displayNames,
  loadNames,
  loadProgress,
  nextStationId,
  progressKey,
  saveNames,
  saveProgress,
  type ModeId,
  type Names,
  type Progress,
  type StationProgress,
  type StepResponse,
} from './progress'
import { createStorage } from './storage'

export function useTrail(route: Route) {
  const storage = useMemo(() => createStorage(), [])
  const [progress, setProgress] = useState<Progress>(() => loadProgress(storage, route))
  const [names, setNamesState] = useState<Names>(() => loadNames(storage, route))
  const [persistent, setPersistent] = useState(storage.persistent)
  const firstRender = useRef(true)

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    saveProgress(storage, progress)
    setPersistent(storage.persistent)
  }, [storage, progress])

  const update = useCallback((fn: (p: Progress) => Progress) => {
    setProgress((prev) => ({ ...fn(prev), updatedAt: new Date().toISOString() }))
  }, [])

  const updateStation = useCallback(
    (id: string, fn: (s: StationProgress) => Partial<StationProgress>) =>
      update((p) => ({ ...p, stations: { ...p.stations, [id]: { ...p.stations[id], ...fn(p.stations[id]) } } })),
    [update],
  )

  /** Merge a patch into one step's response. Functional so rapid edits never race. */
  const respond = useCallback(
    (stepId: string, patch: StepResponse | ((r: StepResponse) => StepResponse)) =>
      update((p) => {
        const prev = p.responses[stepId] ?? {}
        const next = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch }
        return { ...p, responses: { ...p.responses, [stepId]: next } }
      }),
    [update],
  )

  const setText = useCallback(
    (stepId: string, key: string, value: string) =>
      respond(stepId, (r) => ({ ...r, text: { ...r.text, [key]: value } })),
    [respond],
  )

  const setNames = useCallback(
    (next: Names) => {
      setNamesState(next)
      saveNames(storage, route, next)
      setPersistent(storage.persistent)
    },
    [storage, route],
  )

  const visitStation = useCallback((id: string) => {
    setProgress((p) => (p.currentStationId === id && p.started ? p : { ...p, started: true, currentStationId: id }))
  }, [])

  const markAndNext = useCallback(
    (id: string, status: 'done' | 'skipped'): string | null => {
      const final = status === 'skipped' && progress.stations[id]?.status === 'done' ? 'done' : status
      const after: Progress = { ...progress, stations: { ...progress.stations, [id]: { ...progress.stations[id], status: final } } }
      updateStation(id, () => ({ status: final }))
      return nextStationId(route, after, id)
    },
    [progress, route, updateStation],
  )

  const reset = useCallback(() => {
    storage.remove(progressKey(route.id))
    setProgress((p) => ({ ...createProgress(route), mode: p.mode }))
  }, [storage, route])

  return {
    progress,
    names,
    shownNames: displayNames(names, route),
    persistent,
    setNames,
    visitStation,
    respond,
    setText,
    setMode: (mode: ModeId) => update((p) => ({ ...p, mode })),
    openNextStep: (id: string, total: number) =>
      updateStation(id, (s) => ({ stepsOpen: Math.min(total, (s?.stepsOpen ?? 1) + 1) })),
    shiftRoles: (id: string) => updateStation(id, (s) => ({ roleShift: ((s?.roleShift ?? 0) + 1) % 3 })),
    reopen: (id: string) => updateStation(id, () => ({ status: 'pending' })),
    complete: (id: string) => markAndNext(id, 'done'),
    skip: (id: string) => markAndNext(id, 'skipped'),
    setFavorite: (id: string) => update((p) => ({ ...p, favoriteStationId: id })),
    reset,
  }
}

export type Trail = ReturnType<typeof useTrail>
