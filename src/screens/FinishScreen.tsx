import { useRef, useState } from 'react'
import type { Route } from '../content'
import { IconDownload, IconHeart, IconIceCream, IconRefresh } from '../components/Icons'
import { countByStatus, nextStationId } from '../lib/progress'
import { hrefFor, navigate } from '../lib/router'
import { buildSummary, summaryFileName } from '../lib/summary'
import type { Trail } from '../lib/useTrail'

function downloadText(text: string, fileName: string) {
  // BOM so Hebrew opens correctly in editors that guess the encoding.
  const blob = new Blob(['﻿', text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function FinishScreen({ route, trail }: { route: Route; trail: Trail }) {
  const { progress, shownNames } = trail
  const [confirming, setConfirming] = useState(false)
  const [message, setMessage] = useState('')
  const resetButton = useRef<HTMLButtonElement>(null)
  const total = route.stations.length
  const done = countByStatus(progress, 'done')
  const open = total - done
  const withNotes = route.stations.filter((s) => progress.stations[s.id].note.trim())
  const nextId = nextStationId(route, progress, null)

  const confirmReset = () => {
    trail.reset()
    setConfirming(false)
    navigate({ name: 'welcome' })
  }

  return (
    <div className="screen stack finish">
      <div>
        <p className="eyebrow">{route.title}</p>
        <h1 id="screen-title" tabIndex={-1}>
          {done === total ? 'כל הכבוד, סיימתם!' : 'סיכום ההרפתקה'}
        </h1>
        <p className="big-count">
          <strong>{done}</strong> מתוך {total} תחנות הושלמו
        </p>
        {open > 0 && nextId && (
          <p className="muted">
            עוד לא סיימתם הכול, וזה בסדר.{' '}
            <a href={hrefFor({ name: 'station', id: nextId })}>לתחנה הבאה שנשארה</a>
          </p>
        )}
      </div>

      <section className="card celebrate" aria-labelledby="celebrate-title">
        <h2 id="celebrate-title" className="card-title">
          <IconIceCream size={22} /> {shownNames.parent}, {shownNames.kids[0]} ו{shownNames.kids[1]}
        </h2>
        <p>
          הלכתם יחד בשדרה שבה התחילה העיר, שמעתם סיפורים ופתרתם משימות כצוות. זה זמן מצוין לעצור לגלידה ולספר מה הכי
          זכרתם.
        </p>
      </section>

      <fieldset className="card favorite">
        <legend className="card-title">
          <IconHeart size={20} /> איזו תחנה הכי אהבתם?
        </legend>
        <div className="radio-list">
          {route.stations.map((station) => (
            <label key={station.id} className="radio">
              <input
                type="radio"
                name="favorite"
                value={station.id}
                checked={progress.favoriteStationId === station.id}
                onChange={() => trail.setFavorite(station.id)}
              />
              <span>{station.name}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <section className="card" aria-labelledby="answers-title">
        <h2 id="answers-title" className="card-title">
          מה כתבנו בדרך
        </h2>
        {withNotes.length === 0 ? (
          <p className="muted">לא נכתבו תשובות הפעם. גם זה בסדר גמור.</p>
        ) : (
          <dl className="answers">
            {withNotes.map((station) => (
              <div key={station.id}>
                <dt>{station.name}</dt>
                <dd>{progress.stations[station.id].note}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <button
        type="button"
        className="btn btn-primary"
        onClick={() => {
          downloadText(buildSummary(route, progress, shownNames), summaryFileName())
          setMessage('הסיכום הורד כקובץ טקסט.')
        }}
      >
        <IconDownload size={22} />
        <span>הורדת סיכום (קובץ טקסט)</span>
      </button>

      <section className="card danger-zone" aria-labelledby="reset-title">
        <h2 id="reset-title" className="card-title">
          איפוס הפעילות
        </h2>
        {!confirming ? (
          <>
            <p className="muted small">מוחק את ההתקדמות, התשובות והתחנה האהובה. השמות נשמרים.</p>
            <button
              ref={resetButton}
              type="button"
              className="btn btn-secondary"
              onClick={() => setConfirming(true)}
            >
              <IconRefresh size={20} />
              <span>איפוס</span>
            </button>
          </>
        ) : (
          <div role="alertdialog" aria-labelledby="confirm-title" aria-describedby="confirm-desc" className="confirm">
            <p id="confirm-title">
              <strong>למחוק את כל ההתקדמות?</strong>
            </p>
            <p id="confirm-desc" className="small">
              אי אפשר לבטל את זה. כדאי להוריד קודם את הסיכום.
            </p>
            <div className="confirm-actions">
              <button type="button" className="btn btn-danger" onClick={confirmReset} autoFocus>
                כן, למחוק
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setConfirming(false)
                  requestAnimationFrame(() => resetButton.current?.focus())
                }}
              >
                ביטול
              </button>
            </div>
          </div>
        )}
      </section>

      <p className="sr-only" role="status" aria-live="polite">
        {message}
      </p>
    </div>
  )
}
