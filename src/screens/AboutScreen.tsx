import type { Route } from '../content'
import { IconExternal, IconWarning } from '../components/Icons'
import { hrefFor } from '../lib/router'
import { EXTERIOR_MESSAGE, siteStatusMessage } from '../lib/siteStatus'
import { formatIsoDate } from '../lib/summary'
import type { OfflineState } from '../lib/useOfflineReady'

const offlineText: Record<OfflineState, string> = {
  ready: 'המשחק שמור במכשיר: הטקסטים והמשימות יעבדו גם בלי אינטרנט. הווידאו והקריינות באפליקציה הרשמית לא כלולים בזה.',
  pending: 'שומרים את האפליקציה לשימוש בלי אינטרנט…',
  unsupported: 'הדפדפן הזה לא תומך בשמירה לשימוש בלי אינטרנט. כדאי להשאיר את הדף פתוח.',
  failed: 'לא הצלחנו לשמור את האפליקציה לשימוש בלי אינטרנט. כדאי להשאיר את הדף פתוח ולנסות לטעון שוב כשיש חיבור.',
}

export function AboutScreen({ route, offline }: { route: Route; offline: OfflineState }) {
  const statusStations = route.stations.filter((s) => s.siteStatus)
  return (
    <div className="screen stack about">
      <h1 id="screen-title" tabIndex={-1}>
        על המסלול ומקורות
      </h1>

      <section className="card">
        {route.about.paragraphs.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </section>

      {statusStations.length > 0 && (
        <section className="notice" aria-label="מצב אתרים">
          <IconWarning size={22} />
          <div>
            {statusStations.map((s) => (
              <p key={s.id}>
                <strong>{siteStatusMessage(s.siteStatus!)}</strong>
                {s.visitType === 'exterior' && ` ${EXTERIOR_MESSAGE}`}
              </p>
            ))}
          </div>
        </section>
      )}

      <section className="card" aria-labelledby="cautions-title">
        <h2 id="cautions-title" className="card-title">
          כדאי לדעת
        </h2>
        <ul className="bullets">
          {route.about.cautions.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </section>

      <section className="card" aria-labelledby="other-title">
        <h2 id="other-title" className="card-title">
          שלוש התחנות שלא נכללו
        </h2>
        <p className="muted small">{route.about.otherStationsNote}</p>
        <ul className="bullets">
          {route.about.otherStations.map((p) => (
            <li key={p.name}>
              {p.name}: {p.address}
            </li>
          ))}
        </ul>
      </section>

      <section className="card" aria-labelledby="sources-title">
        <h2 id="sources-title" className="card-title">
          מקורות לקריאה נוספת
        </h2>
        <p className="muted small">המקורות מוצגים לקריאה נוספת בלבד. האפליקציה לא מושכת מהם מידע.</p>
        <ul className="links">
          {route.about.sources.map((s) => (
            <li key={s.label}>
              {s.url ? (
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  <span>{s.label}</span>
                  <IconExternal size={18} />
                  <span className="sr-only">(נפתח בחלון חדש)</span>
                </a>
              ) : (
                <span className="source-plain">{s.label}</span>
              )}
            </li>
          ))}
        </ul>
        <h3 className="subhead">מה לא אומת או עשוי להשתנות</h3>
        <ul className="bullets">
          {route.about.unverified.map((u) => (
            <li key={u}>{u}</li>
          ))}
        </ul>
        <p className="muted small">תאריך בדיקת המידע: {formatIsoDate(route.about.contentCheckedOn)}.</p>
      </section>

      <section className="card" aria-labelledby="offline-title">
        <h2 id="offline-title" className="card-title">
          שימוש בלי אינטרנט
        </h2>
        <p>{offlineText[offline]}</p>
      </section>

      <a className="btn btn-secondary" href={hrefFor({ name: 'welcome' })}>
        חזרה למסך הפתיחה
      </a>
    </div>
  )
}
