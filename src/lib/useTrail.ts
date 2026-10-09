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
  type Names,
  type Progress,
  type StationProgress,
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
    (id: string, patch: Partial<StationProgress>) =>
      update((p) => ({ ...p, stations: { ...p.stations, [id]: { ...p.stations[id], ...patch } } })),
    [update],
  )

  const setNames = useCallback(
    (next: Names) => {
      setNamesState(next)
      saveNames(storage, route, next)
      setPersistent(storage.persistent)
    },
    [storage, route],
  )

  const visitStation = useCallback(
    (id: string) => {
      setProgress((p) => (p.currentStationId === id && p.started ? p : { ...p, started: true, currentStationId: id }))
    },
    [],
  )

  /** Marks a station and returns the id of the next station to visit, or null. */
  const complete = useCallback(
    (id: string): string | null => {
      const after: Progress = { ...progress, stations: { ...progress.stations, [id]: { ...progress.stations[id], status: 'done' } } }
      updateStation(id, { status: 'done' })
      return nextStationId(route, after, id)
    },
    [progress, route, updateStation],
  )

  const skip = useCallback(
    (id: string): string | null => {
      const status = progress.stations[id]?.status === 'done' ? 'done' : 'skipped'
      const after: Progress = { ...progress, stations: { ...progress.stations, [id]: { ...progress.stations[id], status } } }
      updateStation(id, { status })
      return nextStationId(route, after, id)
    },
    [progress, route, updateStation],
  )

  const reset = useCallback(() => {
    storage.remove(progressKey(route.id))
    setProgress(createProgress(route))
  }, [storage, route])

  return {
    progress,
    names,
    shownNames: displayNames(names, route),
    persistent,
    setNames,
    visitStation,
    setNote: (id: string, note: string) => updateStation(id, { note }),
    swapRoles: (id: string) => updateStation(id, { rolesSwapped: !progress.stations[id]?.rolesSwapped }),
    reopen: (id: string) => updateStation(id, { status: 'pending' }),
    complete,
    skip,
    setFavorite: (id: string) => update((p) => ({ ...p, favoriteStationId: id })),
    reset,
  }
}

export type Trail = ReturnType<typeof useTrail>
