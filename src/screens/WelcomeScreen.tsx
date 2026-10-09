import type { Route } from '../content'
import { Hero } from '../components/Hero'
import { IconClock, IconHat, IconPhone, IconPin, IconTree, IconWalk, IconWater } from '../components/Icons'
import { hasProgress, resumeStationId } from '../lib/progress'
import { hrefFor, navigate } from '../lib/router'
import type { Trail } from '../lib/useTrail'

const reminderIcons = [IconWater, IconHat, IconPhone]

export function WelcomeScreen({ route, trail }: { route: Route; trail: Trail }) {
  const { names, setNames, progress } = trail
  const canResume = hasProgress(progress)
  const resumeId = resumeStationId(route, progress)
  const first = route.stations[0]
  const mode = route.modes.find((m) => m.id === progress.mode) ?? route.modes[0]

  const setKid = (index: 0 | 1, value: string) => {
    const kids: [string, string] = [...names.kids]
    kids[index] = value
    setNames({ ...names, kids })
  }

  const start = () => {
    trail.visitStation(first.id)
    navigate({ name: 'station', id: first.id })
  }

  const resume = () => {
    if (resumeId) navigate({ name: 'station', id: resumeId })
    else navigate({ name: 'finish' })
  }

  const nameField = (label: string, value: string, onChange: (v: string) => void, last = false) => (
    <label className="field">
      <span>{label}</span>
      <input
        type="text"
        value={value}
        maxLength={40}
        autoComplete="off"
        placeholder="שם (לא חובה)"
        enterKeyHint={last ? 'done' : 'next'}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )

  return (
    <div className="screen welcome">
      <Hero />
      <div className="stack">
        <div>
          <p className="eyebrow">{route.subtitle}</p>
          <h1 id="screen-title" tabIndex={-1}>
            {route.title}
          </h1>
        </div>

        <section className="card frame" aria-labelledby="frame-title">
          <h2 id="frame-title" className="card-title">
            {route.frame.title}
          </h2>
          <p>{route.frame.text}</p>
          <p className="muted small">{route.frame.disclaimer}</p>
        </section>

        <ul className="facts" aria-label="על הפעילות">
          <li>
            <IconPin size={20} />
            <span>{route.stations.length} תחנות</span>
          </li>
          <li>
            <IconClock size={20} />
            <span>{mode.duration} (הערכה)</span>
          </li>
          <li>
            <IconWalk size={20} />
            <span>הליכה בחוץ</span>
          </li>
        </ul>

        <fieldset className="card modes">
          <legend className="card-title">איזה מסלול מתאים לכם היום?</legend>
          <div className="radio-list">
            {route.modes.map((m) => (
              <label key={m.id} className="radio radio-rich">
                <input
                  type="radio"
                  name="mode"
                  value={m.id}
                  checked={progress.mode === m.id}
                  onChange={() => trail.setMode(m.id)}
                />
                <span>
                  <strong>
                    {m.label}, {m.duration}
                  </strong>
                  <span className="muted small block">{m.description}</span>
                </span>
              </label>
            ))}
          </div>
          <p className="muted small">אפשר לשנות גם באמצע, מהמסך הזה.</p>
        </fieldset>

        <section className="card" aria-labelledby="start-point">
          <h2 id="start-point" className="card-title">
            <IconTree size={20} /> נקודת יציאה
          </h2>
          <p>{route.startPoint}</p>
          <p className="muted small">התחנה הראשונה: {first.name}.</p>
        </section>

        <section className="card" aria-labelledby="names-title">
          <h2 id="names-title" className="card-title">
            מי בצוות?
          </h2>
          <div className="fields">
            {nameField('מבוגר/ת', names.parent, (v) => setNames({ ...names, parent: v }))}
            {nameField('ילד/ה ראשון/ה', names.kids[0], (v) => setKid(0, v))}
            {nameField('ילד/ה שני/ה', names.kids[1], (v) => setKid(1, v), true)}
          </div>
          <p className="muted small">
            משחקים כצוות אחד, בלי ניקוד. בכל תחנה מתחלפים התפקידים:{' '}
            {route.roles.map((r) => r.label).join(', ')}. גם המבוגר/ת משתתף/ת.
          </p>
        </section>

        <section className="card reminders" aria-labelledby="reminders-title">
          <h2 id="reminders-title" className="card-title">
            לפני שיוצאים
          </h2>
          <ul>
            {route.reminders.map((text, i) => {
              const Icon = reminderIcons[i % reminderIcons.length]
              return (
                <li key={text}>
                  <Icon size={22} />
                  <span>{text}</span>
                </li>
              )
            })}
          </ul>
        </section>

        <div className="actions">
          {canResume ? (
            <>
              <button type="button" className="btn btn-primary" onClick={resume}>
                ממשיכים מאיפה שעצרנו
              </button>
              <button type="button" className="btn btn-secondary" onClick={start}>
                מתחילים מהתחנה הראשונה
              </button>
              <p className="muted small center">התשובות שלכם נשמרות. איפוס מלא נמצא במסך הסיום.</p>
            </>
          ) : (
            <button type="button" className="btn btn-primary" onClick={start}>
              מתחילים
            </button>
          )}
          <a className="btn btn-ghost" href={hrefFor({ name: 'about' })}>
            על המסלול ומקורות
          </a>
        </div>
      </div>
    </div>
  )
}
