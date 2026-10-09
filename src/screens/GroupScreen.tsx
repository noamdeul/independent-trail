import type { Route } from '../content'
import { GroupEditor, LevelPicker } from '../components/GroupEditor'
import { hrefFor } from '../lib/router'
import type { Trail } from '../lib/useTrail'

export function GroupScreen({ route, trail }: { route: Route; trail: Trail }) {
  const current = trail.progress.currentStationId
  return (
    <div className="screen stack">
      <div>
        <h1 id="screen-title" tabIndex={-1}>
          המשתתפים
        </h1>
        <p className="lead">
          אפשר להוסיף, להסיר ולשנות שמות גם באמצע. התשובות וההחלטות שכבר נשמרו נשארות, והתפקידים מתעדכנים להמשך.
        </p>
      </div>
      <section className="card" aria-label="רשימת המשתתפים">
        <GroupEditor trail={trail} />
      </section>
      <LevelPicker route={route} trail={trail} />
      {current ? (
        <a className="btn btn-primary" href={hrefFor({ name: 'station', id: current })}>
          חזרה לתחנה
        </a>
      ) : (
        <a className="btn btn-primary" href={hrefFor({ name: 'welcome' })}>
          חזרה למסך הפתיחה
        </a>
      )}
    </div>
  )
}
