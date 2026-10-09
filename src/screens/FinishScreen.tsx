import { useRef, useState } from 'react'
import type { Route } from '../content'
import { IconDownload, IconHeart, IconIceCream, IconRefresh } from '../components/Icons'
import { Disclosure } from '../components/Disclosure'
import { charterText, charterValues, cityPlan, findCharterStep, summarizeStep } from '../lib/plan'
import { bonusKey, countByStatus, familyLine, nextStationId } from '../lib/progress'
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
  const { progress, names } = trail
  const family = familyLine(names)
  const [confirming, setConfirming] = useState(false)
  const [message, setMessage] = useState('')
  const resetButton = useRef<HTMLButtonElement>(null)
  const total = route.stations.length
  const done = countByStatus(progress, 'done')
  const open = total - done
  const plan = cityPlan(route, progress, { includeCharter: false })
  const charterStep = findCharterStep(route)
  const charter = charterStep ? charterValues(route, progress, charterStep) : null
  const answers = route.stations
    .map((station) => ({
      station,
      steps: station.mission.steps
        .filter((st) => st.kind !== 'charter')
        .map((st) => ({ step: st, lines: summarizeStep(route, progress, st) }))
        .filter((x) => x.lines.length > 0),
      bonus: progress.responses[bonusKey(station.id)],
    }))
    .filter((x) => x.steps.length > 0 || x.bonus?.text?.answer?.trim() || x.bonus?.aloud)
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

      <section className="card city-card" aria-labelledby="city-title">
        <p className="eyebrow">כרטיס</p>
        <h2 id="city-title" className="city-title">
          העיר שלנו{charter?.city.trim() ? `: ${charter.city.trim()}` : ''}
        </h2>
        {(charter?.team.trim() || family) && (
          <p className="muted">צוות {charter?.team.trim() || family}</p>
        )}
        {plan.length === 0 ? (
          <p className="muted">עוד לא נשמרו החלטות. בכל תחנה יש שלב שנשמר בתוכנית העיר.</p>
        ) : (
          <dl className="plan-list">
            {plan.map((section) => (
              <div key={section.station.id}>
                <dt>
                  {section.title} <span className="muted small">· {section.station.theme}</span>
                </dt>
                {section.lines.map((line) => (
                  <dd key={line}>{line}</dd>
                ))}
              </div>
            ))}
          </dl>
        )}
        {charter && (
          <blockquote className="charter-doc" aria-label="מגילת העיר">
            {charterText(charter)
              .split('\n')
              .map((line) => (
                <p key={line}>{line}</p>
              ))}
          </blockquote>
        )}
        <p className="muted small">{route.frame.disclaimer}</p>
      </section>

      <section className="card celebrate" aria-labelledby="celebrate-title">
        <h2 id="celebrate-title" className="card-title">
          <IconIceCream size={22} /> {family ? `כל הכבוד, ${family}!` : 'כל הכבוד לכל המשפחה!'}
        </h2>
        <p>
          הלכתם יחד בשדרה שבה התחילה העיר, גיליתם איך היא נבנתה ותכננתם עיר משלכם. זה זמן מצוין לעצור לגלידה ולספר
          איזו החלטה הייתה הכי קשה.
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
          כל התשובות שלנו
        </h2>
        {answers.length === 0 ? (
          <p className="muted">עוד אין תשובות שמורות. גם לענות בעל פה זה מצוין.</p>
        ) : (
          <Disclosure label={`הצגת התשובות (${answers.length} תחנות)`} openLabel="הסתרת התשובות">
            <dl className="answers">
              {answers.map(({ station, steps, bonus }) => (
                <div key={station.id}>
                  <dt>{station.name}</dt>
                  {steps.map(({ step, lines }) => (
                    <dd key={step.id}>
                      <strong>{step.title}:</strong> {lines.join(' · ')}
                    </dd>
                  ))}
                  {(bonus?.text?.answer?.trim() || bonus?.aloud) && (
                    <dd>
                      <strong>בונוס:</strong> {bonus.text?.answer?.trim() || 'ענינו בעל פה'}
                    </dd>
                  )}
                </div>
              ))}
            </dl>
          </Disclosure>
        )}
      </section>

      <button
        type="button"
        className="btn btn-primary"
        onClick={() => {
          downloadText(buildSummary(route, progress, names), summaryFileName())
          setMessage('הסיכום הורד כקובץ טקסט.')
        }}
      >
        <IconDownload size={22} />
        <span>הורדת ״העיר שלנו״ (קובץ טקסט)</span>
      </button>

      <section className="card danger-zone" aria-labelledby="reset-title">
        <h2 id="reset-title" className="card-title">
          איפוס הפעילות
        </h2>
        {!confirming ? (
          <>
            <p className="muted small">מוחק את ההתקדמות, התשובות, תוכנית העיר והתחנה האהובה. השמות נשמרים.</p>
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
