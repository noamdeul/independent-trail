import { useEffect, useId } from 'react'
import type { Route } from '../content'
import { Disclosure } from '../components/Disclosure'
import {
  IconBook,
  IconBulb,
  IconCheck,
  IconCompass,
  IconExternal,
  IconInfo,
  IconSkip,
  IconSwap,
  IconWalk,
  IconWarning,
  StationGlyph,
} from '../components/Icons'
import { StatusChip } from '../components/StatusChip'
import { walkingDirectionsUrl } from '../lib/maps'
import { countByStatus, rolesFor } from '../lib/progress'
import { hrefFor, navigate } from '../lib/router'
import { stationNotices } from '../lib/siteStatus'
import { statusText } from '../lib/summary'
import type { Trail } from '../lib/useTrail'

export function StationScreen({ route, trail, stationId }: { route: Route; trail: Trail; stationId: string }) {
  const index = route.stations.findIndex((s) => s.id === stationId)
  const station = route.stations[index]
  const { progress, shownNames, visitStation } = trail
  const noteId = useId()

  useEffect(() => {
    if (station) visitStation(station.id)
  }, [station, visitStation])

  if (!station) {
    return (
      <div className="screen stack">
        <h1 id="screen-title" tabIndex={-1}>
          התחנה לא נמצאה
        </h1>
        <a className="btn btn-primary" href={hrefFor({ name: 'stations' })}>
          לרשימת התחנות
        </a>
      </div>
    )
  }

  const state = progress.stations[station.id]
  const roles = rolesFor(route, progress, shownNames, station.id)
  const total = route.stations.length
  const notices = stationNotices(station)
  const doneCount = countByStatus(progress, 'done')

  const goNext = (nextId: string | null) => {
    navigate(nextId ? { name: 'station', id: nextId } : { name: 'finish' })
  }

  return (
    <div className="screen station">
      <div className="station-top">
        <p className="eyebrow">
          תחנה {index + 1} מתוך {total}
        </p>
        <StatusChip status={state.status} />
      </div>

      <ol className="dots" aria-label={`התקדמות: הושלמו ${doneCount} מתוך ${total} תחנות`}>
        {route.stations.map((s, i) => {
          const st = progress.stations[s.id].status
          return (
            <li key={s.id} className={`dot dot-${st}${s.id === station.id ? ' dot-current' : ''}`}>
              <a
                href={hrefFor({ name: 'station', id: s.id })}
                aria-label={`תחנה ${i + 1}: ${s.name}, ${statusText(st)}`}
                aria-current={s.id === station.id ? 'step' : undefined}
              >
                <span aria-hidden="true">{i + 1}</span>
              </a>
            </li>
          )
        })}
      </ol>

      <div className="station-head">
        <span className="station-badge" aria-hidden="true">
          <StationGlyph icon={station.icon} size={30} />
        </span>
        <div>
          <h1 id="screen-title" tabIndex={-1}>
            {station.name}
          </h1>
          <p className="address">{station.address}</p>
        </div>
      </div>

      <a
        className="btn btn-nav"
        href={walkingDirectionsUrl(station.mapsQuery)}
        target="_blank"
        rel="noopener noreferrer"
      >
        <IconWalk size={24} />
        <span>ניווט בהליכה</span>
        <IconExternal size={18} className="btn-trailing" />
        <span className="sr-only">(נפתח ב־Google Maps)</span>
      </a>
      {station.directions && <p className="directions">{station.directions}</p>}

      {notices.length > 0 && (
        <div className="notice" role="note">
          <IconWarning size={22} />
          <div>
            {notices.map((line) => (
              <p key={line.text}>{line.strong ? <strong>{line.text}</strong> : line.text}</p>
            ))}
          </div>
        </div>
      )}

      <section className="card roles" aria-label="תפקידים בתחנה">
        <ul>
          <li>
            <IconCompass size={22} />
            <span>
              <span className="role-label">מנווט/ת</span> <strong>{roles.navigator}</strong>
            </span>
          </li>
          <li>
            <IconBook size={22} />
            <span>
              <span className="role-label">מקריא/ה</span> <strong>{roles.reader}</strong>
            </span>
          </li>
        </ul>
        <button type="button" className="btn btn-small btn-ghost" onClick={() => trail.swapRoles(station.id)}>
          <IconSwap size={20} />
          <span>החלפת תפקידים</span>
        </button>
      </section>

      <section className="card story" aria-labelledby="story-title">
        <h2 id="story-title" className="card-title">
          <IconBook size={20} /> הסיפור
        </h2>
        <p className="story-text">{station.story}</p>
      </section>

      <section className="card task" aria-labelledby="task-title">
        <h2 id="task-title" className="card-title">
          <IconBulb size={20} /> משימה משותפת
        </h2>
        <p className="task-text">{station.task}</p>

        {station.hint && (
          <Disclosure label="צריכים רמז?" openLabel="הסתרת הרמז" icon={<IconBulb size={20} />}>
            <p>{station.hint}</p>
          </Disclosure>
        )}
        <Disclosure label="מידע על המקום" openLabel="הסתרת המידע" icon={<IconInfo size={20} />} tone="reveal">
          <p>{station.info}</p>
          {station.creative && <p className="muted">במשימה הזו אין תשובה אחת נכונה. כל רעיון מתקבל.</p>}
        </Disclosure>

        <label className="field note" htmlFor={noteId}>
          <span>מה חשבנו? (לא חובה)</span>
        </label>
        <textarea
          id={noteId}
          rows={3}
          maxLength={2000}
          value={state.note}
          placeholder="אפשר לכתוב תשובה, רעיון או משהו מצחיק שקרה"
          onChange={(e) => trail.setNote(station.id, e.target.value)}
        />
        <p className="muted small">נשמר אוטומטית במכשיר הזה.</p>
      </section>

      <div className="actionbar">
        {state.status === 'done' ? (
          <>
            <button type="button" className="btn btn-primary" onClick={() => goNext(trail.complete(station.id))}>
              <IconCheck size={22} />
              <span>{countByStatus(progress, 'pending') + countByStatus(progress, 'skipped') ? 'לתחנה הבאה' : 'למסך הסיום'}</span>
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => trail.reopen(station.id)}>
              ביטול סימון
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn btn-primary" onClick={() => goNext(trail.complete(station.id))}>
              <IconCheck size={22} />
              <span>סיימנו את התחנה</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              aria-label="דילוג, נחזור אחר כך"
              onClick={() => goNext(trail.skip(station.id))}
            >
              <IconSkip size={20} />
              <span>דילוג</span>
            </button>
          </>
        )}
      </div>
    </div>
  )
}
