import type { Route } from '../content'
import { StationGlyph } from '../components/Icons'
import { StatusChip } from '../components/StatusChip'
import { countByStatus } from '../lib/progress'
import { hrefFor } from '../lib/router'
import type { Trail } from '../lib/useTrail'

export function StationsScreen({ route, trail }: { route: Route; trail: Trail }) {
  const { progress } = trail
  const total = route.stations.length
  const done = countByStatus(progress, 'done')
  const skipped = countByStatus(progress, 'skipped')

  return (
    <div className="screen stack">
      <div>
        <h1 id="screen-title" tabIndex={-1}>
          כל התחנות
        </h1>
        <p className="lead">
          הושלמו {done} מתוך {total}
          {skipped > 0 && `, דילגנו על ${skipped}`}. אפשר לפתוח כל תחנה בכל זמן.
        </p>
      </div>

      <ol className="station-list">
        {route.stations.map((station, i) => {
          const status = progress.stations[station.id].status
          const current = progress.currentStationId === station.id
          return (
            <li key={station.id}>
              <a
                className={`station-row status-${status}`}
                href={hrefFor({ name: 'station', id: station.id })}
                aria-current={current ? 'location' : undefined}
              >
                <span className="row-num" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="row-icon" aria-hidden="true">
                  <StationGlyph icon={station.icon} size={26} />
                </span>
                <span className="row-body">
                  <span className="row-name">
                    <span className="sr-only">תחנה {i + 1}: </span>
                    {station.name}
                  </span>
                  <span className="row-address">{station.address}</span>
                  <span className="row-meta">
                    <StatusChip status={status} />
                    {current && <span className="chip chip-current">כאן עצרנו</span>}
                  </span>
                </span>
              </a>
            </li>
          )
        })}
      </ol>

      <a className="btn btn-secondary" href={hrefFor({ name: 'finish' })}>
        למסך הסיום
      </a>
    </div>
  )
}
