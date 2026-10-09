import { useId } from 'react'
import type { Route, Station, StationMedia } from '../content'
import { discoverKey } from '../lib/progress'
import type { Trail } from '../lib/useTrail'
import { useVoice } from '../lib/voice'
import { Disclosure } from './Disclosure'
import { IconBook, IconCheck, IconExternal, IconEye } from './Icons'
import { AloudToggle } from './steps'

/** True only for media we may play or link to: a verified URL, never a guess. */
export function hasPlayableMedia(media: StationMedia | undefined): media is StationMedia & { url: string } {
  return !!media && media.kind !== 'manual' && !!media.url
}

function Credit({ media }: { media: StationMedia }) {
  if (!media.credit && !media.license) return null
  return (
    <p className="muted small">
      {media.credit}
      {media.credit && media.license ? ' · ' : ''}
      {media.license}
    </p>
  )
}

/** The clip itself, for media that was verified and cleared for use. */
function MediaBlock({ media, title }: { media: StationMedia & { url: string }; title: string }) {
  return (
    <div className="media-block">
      {media.kind === 'video' && (
        <video controls preload="none" playsInline src={media.url} aria-label={`וידאו: ${title}`} className="media-player" />
      )}
      {media.kind === 'audio' && <audio controls preload="none" src={media.url} aria-label={`קריינות: ${title}`} className="media-player" />}
      {media.kind === 'external' && (
        <a className="btn btn-secondary" href={media.url} target="_blank" rel="noopener noreferrer">
          <IconExternal size={20} />
          <span>פתיחת הקטע</span>
          <span className="sr-only">(נפתח בחלון חדש)</span>
        </a>
      )}
      <Credit media={media} />
      {media.transcript && (
        <Disclosure label="תמלול" openLabel="הסתרת התמלול">
          <p>{media.transcript}</p>
        </Disclosure>
      )}
    </div>
  )
}

/**
 * "מגלים את הסיפור": before the mission, the group either watches / listens to
 * the station in the official app (marked by hand, nothing is verified) or
 * continues with the written story.
 */
export function DiscoverCard({ route, trail, station }: { route: Route; trail: Trail; station: Station }) {
  const { t, solo } = useVoice()
  const shareId = useId()
  const media = station.media
  const key = discoverKey(station.id)
  // Shared by the whole group, also in team mode: everyone at the station watches together.
  const r = trail.progress.responses[key] ?? {}
  const app = route.officialApp
  if (!media) return null

  if (r.discover === 'media') {
    return (
      <section className="card discover" aria-labelledby="discover-title">
        <h2 id="discover-title" className="card-title">
          <IconEye size={20} /> {t('מה גיליתם?', 'מה גילית?')}
        </h2>
        <p>{t('שתפו פרט אחד לפני שמתחילים במשימה.', 'כדאי לנסח פרט אחד לפני שמתחילים במשימה.')}</p>
        <p className="muted small">שאלת ההכנה הייתה: {media.prepQuestion}</p>
        <div className="field">
          <label htmlFor={shareId}>{t('הפרט שגילינו (לא חובה)', 'הפרט שגיליתי (לא חובה)')}</label>
          <input
            id={shareId}
            type="text"
            maxLength={300}
            autoComplete="off"
            value={r.text?.share ?? ''}
            onChange={(e) => trail.respondShared(key, (prev) => ({ ...prev, text: { ...prev.text, share: e.target.value } }))}
          />
        </div>
        <div className="step-foot">
          <AloudToggle
            label={t('שיתפנו', 'עניתי בעל פה')}
            pressed={!!r.aloud}
            onToggle={() => trail.respondShared(key, { aloud: !r.aloud })}
          />
          <button type="button" className="link-btn" onClick={() => trail.respondShared(key, { discover: undefined })}>
            חזרה לכרטיס ״מגלים את הסיפור״
          </button>
        </div>
      </section>
    )
  }

  if (r.discover === 'text') {
    return (
      <p className="discover-switch small">
        {t('בחרתם בסיפור הכתוב.', 'נבחר הסיפור הכתוב.')}{' '}
        <button type="button" className="link-btn" onClick={() => trail.respondShared(key, { discover: undefined })}>
          מעדיפים וידאו או קריינות?
        </button>
      </p>
    )
  }

  const playable = hasPlayableMedia(media)
  return (
    <section className="card discover" aria-labelledby="discover-title">
      <h2 id="discover-title" className="card-title">
        <IconEye size={20} /> מגלים את הסיפור
      </h2>
      <p className="discover-question">
        <strong>שאלת הכנה:</strong> {media.prepQuestion}
      </p>

      {playable ? (
        <MediaBlock media={media} title={station.name} />
      ) : (
        <>
          <p>
            <strong>התחנה באפליקציה:</strong> {media.appStationName}
            <span className="muted small block">השם באפליקציה הרשמית עשוי להיות מעט שונה.</span>
          </p>
          <p>
            {t(
              `עברו לאפליקציית ${app?.name ?? 'שביל העצמאות'}, בחרו בתחנה הזו וצפו או האזינו לקטע. לאחר מכן חזרו לכאן.`,
              `עוברים לאפליקציית ${app?.name ?? 'שביל העצמאות'}, בוחרים בתחנה הזו וצופים או מאזינים לקטע. אחר כך חוזרים לכאן.`,
            )}
          </p>
          <p className="muted small">ההתקדמות כאן נשמרת, ואפשר לחזור בדיוק לאותו מקום.</p>
          {app && (
            <p className="small store-link">
              <a href={app.storeUrl} target="_blank" rel="noopener noreferrer">
                {app.storeLabel}
                <IconExternal size={16} />
                <span className="sr-only">(נפתח בחלון חדש)</span>
              </a>
              <span className="muted block">זה קישור לחנות האפליקציות, לא לתחנה. הווידאו והקריינות באפליקציה הרשמית עשויים לדרוש אינטרנט.</span>
            </p>
          )}
        </>
      )}

      <div className="actions">
        <button type="button" className="btn btn-primary" onClick={() => trail.respondShared(key, { discover: 'media' })}>
          <IconCheck size={22} />
          <span>{t('צפינו / האזנו, ממשיכים', 'צפיתי / האזנתי, ממשיכים')}</span>
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => trail.respondShared(key, { discover: 'text' })}>
          <IconBook size={20} />
          <span>ממשיכים עם הסיפור הכתוב</span>
        </button>
      </div>
      {!solo && <p className="muted small">אין דרך לבדוק אם צפיתם, אז הסימון הוא שלכם.</p>}
    </section>
  )
}
