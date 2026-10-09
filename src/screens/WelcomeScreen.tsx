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

  return (
    <div className="screen welcome">
      <Hero />
      <div className="stack">
        <div>
          <p className="eyebrow">{route.subtitle}</p>
          <h1 id="screen-title" tabIndex={-1}>
            {route.title}
          </h1>
          <p className="lead">{route.intro}</p>
        </div>

        <ul className="facts" aria-label="על הפעילות">
          <li>
            <IconPin size={20} />
            <span>{route.stations.length} תחנות</span>
          </li>
          <li>
            <IconClock size={20} />
            <span>{route.durationText}</span>
          </li>
          <li>
            <IconWalk size={20} />
            <span>הליכה בחוץ</span>
          </li>
        </ul>

        <section className="card" aria-labelledby="start-point">
          <h2 id="start-point" className="card-title">
            <IconTree size={20} /> נקודת יציאה
          </h2>
          <p>
            אחרי ארוחת צהריים ב{route.meetingPoint.name}, {route.meetingPoint.address}.
          </p>
          <p>{route.meetingPoint.walkToStart}</p>
          <p className="muted small">התחנה הראשונה: {first.name}.</p>
        </section>

        <section className="card" aria-labelledby="names-title">
          <h2 id="names-title" className="card-title">
            מי יוצא להרפתקה?
          </h2>
          <div className="fields">
            <label className="field">
              <span>מבוגר/ת</span>
              <input
                type="text"
                value={names.parent}
                maxLength={40}
                autoComplete="off"
                enterKeyHint="next"
                onChange={(e) => setNames({ ...names, parent: e.target.value })}
              />
            </label>
            <label className="field">
              <span>ילד/ה ראשון/ה</span>
              <input
                type="text"
                value={names.kids[0]}
                maxLength={40}
                autoComplete="off"
                enterKeyHint="next"
                onChange={(e) => setKid(0, e.target.value)}
              />
            </label>
            <label className="field">
              <span>ילד/ה שני/ה</span>
              <input
                type="text"
                value={names.kids[1]}
                maxLength={40}
                autoComplete="off"
                enterKeyHint="done"
                onChange={(e) => setKid(1, e.target.value)}
              />
            </label>
          </div>
          <p className="muted small">הילדים מתחלפים בתפקידים: מנווט/ת ומקריא/ה.</p>
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
              <p className="muted small center">התשובות שכתבתם נשמרות. איפוס מלא נמצא במסך הסיום.</p>
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
