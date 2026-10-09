import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { LevelId, Route } from '../content'
import {
  autoTeams,
  loadGroup,
  newId,
  repairTeams,
  saveGroup,
  teamsActive,
  type GroupMode,
  type GroupSettings,
  type Participant,
} from './group'
import {
  createProgress,
  loadProgress,
  nextStationId,
  overrideKey,
  progressKey,
  saveProgress,
  scopeKey,
  scopedResponses,
  type Progress,
  type StationProgress,
  type StepResponse,
} from './progress'
import { createStorage } from './storage'

export function useTrail(route: Route) {
  const storage = useMemo(() => createStorage(), [])
  const [progress, setProgress] = useState<Progress>(() => loadProgress(storage, route))
  const [group, setGroupState] = useState<GroupSettings>(() => repairTeams(loadGroup(storage, route)))
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

  // Switching to another app (e.g. the official trail app for its video) can
  // freeze or unload this page at any moment. Write the latest state right
  // away when the page is hidden, so coming back restores the same point.
  const latest = useRef({ progress, group })
  latest.current = { progress, group }
  useEffect(() => {
    const flush = () => {
      saveProgress(storage, latest.current.progress)
      saveGroup(storage, route, latest.current.group)
    }
    const onVisibility = () => document.visibilityState === 'hidden' && flush()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', flush)
    }
  }, [storage, route])

  const teams = teamsActive(group)
  /** Answers go to the whole group, or to the team holding the device. */
  const scope = teams ? group.activeTeamId : null
  const responses = useMemo(() => scopedResponses(progress, scope), [progress, scope])

  const groupLoaded = useRef(true)
  useEffect(() => {
    if (groupLoaded.current) {
      groupLoaded.current = false
      return
    }
    saveGroup(storage, route, group)
    setPersistent(storage.persistent)
  }, [storage, route, group])

  const setGroup = useCallback(
    (fn: (g: GroupSettings) => GroupSettings) => setGroupState((prev) => repairTeams(fn(prev))),
    [],
  )

  const update = useCallback((fn: (p: Progress) => Progress) => {
    setProgress((prev) => ({ ...fn(prev), updatedAt: new Date().toISOString() }))
  }, [])

  const updateStation = useCallback(
    (id: string, fn: (s: StationProgress) => Partial<StationProgress>) =>
      update((p) => ({ ...p, stations: { ...p.stations, [id]: { ...p.stations[id], ...fn(p.stations[id]) } } })),
    [update],
  )

  /** Merge a patch into one step's response, in the current scope. */
  const respond = useCallback(
    (stepId: string, patch: StepResponse | ((r: StepResponse) => StepResponse)) =>
      update((p) => {
        const key = scopeKey(stepId, scope)
        const prev = p.responses[key] ?? {}
        const next = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch }
        return { ...p, responses: { ...p.responses, [key]: next } }
      }),
    [update, scope],
  )

  /** Like `respond`, but always for the whole group, even in team mode (e.g. watching a station's story together). */
  const respondShared = useCallback(
    (key: string, patch: StepResponse | ((r: StepResponse) => StepResponse)) =>
      update((p) => {
        const prev = p.responses[key] ?? {}
        const next = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch }
        return { ...p, responses: { ...p.responses, [key]: next } }
      }),
    [update],
  )

  const setText = useCallback(
    (stepId: string, key: string, value: string) => respond(stepId, (r) => ({ ...r, text: { ...r.text, [key]: value } })),
    [respond],
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
    setProgress(createProgress(route))
  }, [storage, route])

  return {
    progress,
    group,
    teams,
    scope,
    responses,
    persistent,
    respond,
    respondShared,
    setText,
    visitStation,
    /** Opens one more step after the `shown` steps currently on screen. */
    openNextStep: (id: string, shown: number) => updateStation(id, (s) => ({ stepsOpen: Math.max(s?.stepsOpen ?? 1, shown + 1) })),
    shiftRoles: (id: string) => updateStation(id, (s) => ({ roleShift: (s?.roleShift ?? 0) + 1 })),
    setRole: (stationId: string, teamId: string | null, roleId: string, personId: string) =>
      update((p) => {
        const key = overrideKey(stationId, teamId)
        const current = { ...p.roleOverrides[key] }
        if (personId) current[roleId] = personId
        else delete current[roleId]
        return { ...p, roleOverrides: { ...p.roleOverrides, [key]: current } }
      }),
    reopen: (id: string) => updateStation(id, () => ({ status: 'pending' })),
    complete: (id: string) => markAndNext(id, 'done'),
    skip: (id: string) => markAndNext(id, 'skipped'),
    setFavorite: (id: string) => update((p) => ({ ...p, favoriteStationId: id })),
    reset,

    // ---- group editing: never touches saved answers
    addParticipant: () =>
      setGroup((g) => ({ ...g, participants: [...g.participants, { id: newId('p'), name: '' }] })),
    removeParticipant: (id: string) =>
      setGroup((g) => {
        if (g.participants.length <= 1) return g
        const teamOf = { ...g.teamOf }
        delete teamOf[id]
        return { ...g, participants: g.participants.filter((p) => p.id !== id), teamOf }
      }),
    updateParticipant: (id: string, patch: Partial<Omit<Participant, 'id'>>) =>
      setGroup((g) => ({ ...g, participants: g.participants.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
    setLevel: (level: LevelId) => setGroup((g) => ({ ...g, level })),
    setMode: (mode: GroupMode) => setGroup((g) => ({ ...g, mode })),
    setTeamCount: (count: number) => setGroup((g) => ({ ...g, ...autoTeams(g.participants, count) })),
    reshuffleTeams: () => setGroup((g) => ({ ...g, ...autoTeams(g.participants, g.teams.length || undefined) })),
    setTeamOf: (participantId: string, teamId: string) =>
      setGroup((g) => ({ ...g, teamOf: { ...g.teamOf, [participantId]: teamId } })),
    setActiveTeam: (teamId: string) => setGroup((g) => ({ ...g, activeTeamId: teamId })),
  }
}

export type Trail = ReturnType<typeof useTrail>
