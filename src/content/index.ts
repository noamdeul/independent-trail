import { independenceShort } from './independence-short'
import type { Route } from './types'

export type { Route, Station, SiteStatus, SiteStatusCode, StationIcon, VisitType } from './types'

/** All available routes. Add a new route file and list it here. */
export const routes: Route[] = [independenceShort]

export const defaultRouteId = independenceShort.id

export function getRoute(id: string): Route {
  return routes.find((route) => route.id === id) ?? independenceShort
}
