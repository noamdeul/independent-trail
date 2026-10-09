import { useEffect, useId } from 'react'
import type { Route } from '../content'
import { Disclosure } from '../components/Disclosure'
import {
  IconBook,
  IconBulb,
  IconCheck,
  IconCompass,
  IconExternal,
  IconEye,
  IconInfo,
  IconSkip,
  IconSwap,
  IconWalk,
  IconWarning,
  StationGlyph,
} from '../components/Icons'
import { StatusChip } from '../components/StatusChip'
import { AloudToggle, StepCard } from '../components/steps'
import { walkingDirectionsUrl } from '../lib/maps'
import { bonusKey, countByStatus, rolesFor } from '../lib/progress'
import { hrefFor, navigate } from '../lib/router'
import { stationNotices } from '../lib/siteStatus'
import { statusText } from '../lib/summary'
import type { Trail } from '../lib/useTrail'

const ROLE_ICONS: Record<string, typeof IconCompass> = {
  navigator: IconCompass,
  researcher: IconEye,
  presenter: IconBook,
}

export function StationScreen({ route, trail, stationId }: { route: Route; trail: Trail; stationId: string }) {
  const index = route.stations.findIndex((s) => s.id === stationId)
  const station = route.stations[index]
  const { progress, shownNames, visitStation } = trail
  const bonusId = useId()

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
  const mission = station.mission
  const stepsOpen = Math.min(state.stepsOpen, mission.steps.length)
  const full = progress.mode === 'full'
  const bonus = progress.responses[bonusKey(station.id)] ?? {}

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
          <p className="theme-chip">נושא: {station.theme}</p>
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
          {roles.map((role) => {
            const Icon = ROLE_ICONS[role.roleId] ?? IconCompass
            return (
              <li key={role.roleId}>
                <Icon size={22} />
                <span>
                  <span className="role-label">{role.label}</span> <strong>{role.name}</strong>
                  <span className="role-desc">{role.description}</span>
                </span>
              </li>
            )
          })}
        </ul>
        <button type="button" className="btn btn-small btn-ghost" onClick={() => trail.shiftRoles(station.id)}>
          <IconSwap size={20} />
          <span>החלפת תפקידים</span>
        </button>
      </section>

      <section className="card story" aria-labelledby="story-title">
        <h2 id="story-title" className="card-title">
          <IconBook size={20} /> הסיפור בקצרה
        </h2>
        <p className="story-text">{station.story}</p>
        {full && (
          <Disclosure label="רוצים לדעת יותר?" openLabel="הסתרת ההרחבה" icon={<IconInfo size={20} />} tone="reveal">
            {station.more.map((p) => (
              <p key={p.text} className={`para para-${p.kind}`}>
                {p.kind !== 'fact' && <span className="para-badge">{p.kind === 'interpretation' ? 'פרשנות' : 'שימו לב'}</span>}
                {p.text}
              </p>
            ))}
          </Disclosure>
        )}
      </section>

      <section className="card mission" aria-labelledby="mission-title">
        <h2 id="mission-title" className="card-title">
          <IconBulb size={20} /> המשימה שלנו: {mission.title}
        </h2>
        {mission.scenario && (
          <p className="scenario">
            <span className="para-badge">תרחיש בדיוני</span> {mission.scenario}
          </p>
        )}
        <p className="muted small">
          {mission.steps.length} שלבים. אפשר להקליד, לבחור כרטיסים או פשוט לדבר ולסמן ״ענינו בעל פה״.
        </p>

        {mission.steps.slice(0, stepsOpen).map((step, i) => (
          <StepCard
            key={step.id}
            route={route}
            trail={trail}
            step={step}
            index={i}
            stationId={station.id}
            planTitle={mission.planTitle}
          />
        ))}

        {stepsOpen < mission.steps.length ? (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => trail.openNextStep(station.id, mission.steps.length)}
          >
            לשלב הבא: {mission.steps[stepsOpen].title}
          </button>
        ) : (
          full && (
            <section className="bonus" aria-labelledby="bonus-title">
              <h3 id="bonus-title" className="step-title">
                <span className="step-letter" aria-hidden="true">
                  ★
                </span>
                <span>בונוס (לא חובה)</span>
              </h3>
              <p className="step-prompt">{mission.bonus}</p>
              <div className="field">
                <label htmlFor={bonusId}>התשובה שלנו</label>
                <input
                  id={bonusId}
                  type="text"
                  maxLength={300}
                  autoComplete="off"
                  value={bonus.text?.answer ?? ''}
                  onChange={(e) => trail.setText(bonusKey(station.id), 'answer', e.target.value)}
                />
              </div>
              <AloudToggle
                pressed={!!bonus.aloud}
                onToggle={() => trail.respond(bonusKey(station.id), { aloud: !bonus.aloud })}
              />
            </section>
          )
        )}
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
