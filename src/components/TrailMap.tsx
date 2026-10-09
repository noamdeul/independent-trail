import type { Route } from '../content'
import { IconExternal } from './Icons'

/** The illustrated trail map. Bundled with the app, so it is also there offline. */
export function TrailMap({ route }: { route: Route }) {
  const map = route.map
  if (!map) return null
  return (
    <figure className="trail-map card">
      <a href={map.src} target="_blank" rel="noopener noreferrer" className="trail-map-link">
        <img src={map.src} width={map.width} height={map.height} alt={map.alt} decoding="async" />
        <span className="sr-only">(פתיחת המפה בגודל מלא בחלון חדש)</span>
      </a>
      <figcaption>
        <p>{map.caption}</p>
        {map.credit && <p className="muted small">{map.credit}</p>}
        <a className="small trail-map-open" href={map.src} target="_blank" rel="noopener noreferrer">
          פתיחת המפה בגודל מלא
          <IconExternal size={16} />
        </a>
      </figcaption>
    </figure>
  )
}
