import type { Route } from '../content'
import { GroupEditor, LevelPicker } from '../components/GroupEditor'
import { Hero } from '../components/Hero'
import { IconClock, IconHat, IconPhone, IconPin, IconTree, IconWalk, IconWater } from '../components/Icons'
import { hasProgress, resumeStationId } from '../lib/progress'
import { hrefFor, navigate } from '../lib/router'
import type { Trail } from '../lib/useTrail'
import { useVoice } from '../lib/voice'

const reminderIcons = [IconWater, IconHat, IconPhone]

export function WelcomeScreen({ route, trail }: { route: Route; trail: Trail }) {
  const { progress, group } = trail
  const { solo, t } = useVoice()
  const canResume = hasProgress(progress)
  const resumeId = resumeStationId(route, progress)
  const first = route.stations[0]
  const level = route.levels.find((l) => l.id === group.level) ?? route.levels[0]

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
        </div>

        <section className="card frame" aria-labelledby="frame-title">
          <h2 id="frame-title" className="card-title">
            {route.frame.title}
          </h2>
          <p>{solo ? route.frame.soloText : route.frame.text}</p>
          <p className="muted small">{route.frame.disclaimer}</p>
        </section>

        <ul className="facts" aria-label="על הפעילות">
          <li>
            <IconPin size={20} />
            <span>{route.stations.length} תחנות</span>
          </li>
          <li>
            <IconClock size={20} />
            <span>{level.duration} (הערכה)</span>
          </li>
          <li>
            <IconWalk size={20} />
            <span>הליכה בחוץ</span>
          </li>
        </ul>

        <section className="card" aria-labelledby="people-title">
          <h2 id="people-title" className="card-title">
            מי משתתף?
          </h2>
          <GroupEditor trail={trail} />
          <p className="muted small">בלי ניקוד ובלי תחרות. אפשר לשנות את ההרכב גם באמצע, בלי לאבד תשובות.</p>
        </section>

        <LevelPicker route={route} trail={trail} />

        <section className="card" aria-labelledby="start-point">
          <h2 id="start-point" className="card-title">
            <IconTree size={20} /> נקודת יציאה
          </h2>
          <p>{route.startPoint}</p>
          <p className="muted small">התחנה הראשונה: {first.name}.</p>
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
                {t('ממשיכים מאיפה שעצרנו', 'ממשיכים מאיפה שעצרתי')}
              </button>
              <button type="button" className="btn btn-secondary" onClick={start}>
                מתחילים מהתחנה הראשונה
              </button>
              <p className="muted small center">התשובות נשמרות. איפוס מלא נמצא במסך הסיום.</p>
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
