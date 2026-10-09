import { useRef, useState } from 'react'
import type { Route } from '../content'
import { Disclosure } from '../components/Disclosure'
import { IconDownload, IconHeart, IconIceCream, IconRefresh } from '../components/Icons'
import { personName, teamMembers } from '../lib/group'
import { charterText, charterValues, cityPlan, findCharterStep, summarizeStep } from '../lib/plan'
import { bonusKey, countByStatus, namesLine, nextStationId, scopedResponses, type Responses } from '../lib/progress'
import { hrefFor, navigate } from '../lib/router'
import { buildSummary, cityTitle, participantsLine, summaryFileName } from '../lib/summary'
import type { Trail } from '../lib/useTrail'
import { useVoice } from '../lib/voice'

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

function CityCard({
  route,
  title,
  members,
  responses,
  solo,
  disclaimer,
}: {
  route: Route
  title: string
  members?: string | null
  responses: Responses
  solo: boolean
  disclaimer?: string
}) {
  const plan = cityPlan(route, responses, { includeCharter: false, solo })
  const charterStep = findCharterStep(route)
  const charter = charterStep ? charterValues(route, responses, charterStep) : null
  const city = charter?.city.trim()
  return (
    <section className="card city-card" aria-label={title}>
      <p className="eyebrow">כרטיס</p>
      <h2 className="city-title">
        {title}
        {city ? `: ${city}` : ''}
      </h2>
      {members && <p className="muted">{members}</p>}
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
          {charterText(charter, solo)
            .split('\n')
            .map((line) => (
              <p key={line}>{line}</p>
            ))}
        </blockquote>
      )}
      {disclaimer && <p className="muted small">{disclaimer}</p>}
    </section>
  )
}

function AnswersList({ route, responses, solo }: { route: Route; responses: Responses; solo: boolean }) {
  const answers = route.stations
    .map((station) => ({
      station,
      steps: station.mission.steps
        .filter((st) => st.kind !== 'charter')
        .map((st) => ({ step: st, lines: summarizeStep(route, responses, st, solo) }))
        .filter((x) => x.lines.length > 0),
      bonus: responses[bonusKey(station.id)],
    }))
    .filter((x) => x.steps.length > 0 || x.bonus?.text?.answer?.trim() || x.bonus?.aloud)
  if (answers.length === 0) return <p className="muted">עוד אין תשובות שמורות. גם לענות בעל פה זה מצוין.</p>
  return (
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
                <strong>בונוס:</strong> {bonus.text?.answer?.trim() || (solo ? 'עניתי בעל פה' : 'ענינו בעל פה')}
              </dd>
            )}
          </div>
        ))}
      </dl>
    </Disclosure>
  )
}

export function FinishScreen({ route, trail }: { route: Route; trail: Trail }) {
  const { progress, group, teams } = trail
  const { solo, t } = useVoice()
  const [confirming, setConfirming] = useState(false)
  const [message, setMessage] = useState('')
  const resetButton = useRef<HTMLButtonElement>(null)
  const total = route.stations.length
  const done = countByStatus(progress, 'done')
  const open = total - done
  const nextId = nextStationId(route, progress, null)
  const people = participantsLine(group)

  const confirmReset = () => {
    trail.reset()
    setConfirming(false)
    navigate({ name: 'welcome' })
  }

  const teamData = teams
    ? group.teams.map((team) => ({
        team,
        responses: scopedResponses(progress, team.id),
        members: namesLine(teamMembers(group, team.id).map((p) => personName(group, p.id))),
      }))
    : []

  return (
    <div className="screen stack finish">
      <div>
        <p className="eyebrow">{route.title}</p>
        <h1 id="screen-title" tabIndex={-1}>
          {done === total ? t('כל הכבוד, סיימתם!', 'כל הכבוד, סיימת!') : 'סיכום ההרפתקה'}
        </h1>
        <p className="big-count">
          <strong>{done}</strong> מתוך {total} תחנות הושלמו
        </p>
        {people && (
          <p className="participants-line">
            {solo ? 'משתתף/ת' : 'המשתתפים'}: {people}
          </p>
        )}
        {open > 0 && nextId && (
          <p className="muted">
            עוד לא הכול הושלם, וזה בסדר. <a href={hrefFor({ name: 'station', id: nextId })}>לתחנה הבאה שנשארה</a>
          </p>
        )}
      </div>

      {teams ? (
        <>
          {teamData.map(({ team, responses, members }) => (
            <CityCard
              key={team.id}
              route={route}
              title={cityTitle(group, team)}
              members={members ? `חברי הצוות: ${members}` : null}
              responses={responses}
              solo={false}
            />
          ))}
          <section className="card" aria-labelledby="compare-title">
            <h2 id="compare-title" className="card-title">
              השוואה בין ההצעות
            </h2>
            <p className="muted small">אין מנצחים. מה דומה בין הצוותים, ומה שונה?</p>
            <dl className="plan-list compare-list">
              {route.stations.map((station) => {
                const rows = teamData
                  .map(({ team, responses }) => ({
                    team,
                    lines: cityPlan(route, responses, { includeCharter: false }).find((s) => s.station.id === station.id)?.lines ?? [],
                  }))
                  .filter((r) => r.lines.length > 0)
                if (rows.length === 0) return null
                return (
                  <div key={station.id}>
                    <dt>{station.mission.planTitle}</dt>
                    {rows.map(({ team, lines }) => (
                      <dd key={team.id}>
                        <strong>{team.name}:</strong> {lines.join(' · ')}
                      </dd>
                    ))}
                  </div>
                )
              })}
            </dl>
          </section>
          <p className="muted small">{route.frame.disclaimer}</p>
        </>
      ) : (
        <CityCard
          route={route}
          title={cityTitle(group)}
          members={people && !solo ? `הצוות: ${people}` : null}
          responses={scopedResponses(progress, null)}
          solo={solo}
          disclaimer={route.frame.disclaimer}
        />
      )}

      <section className="card celebrate" aria-labelledby="celebrate-title">
        <h2 id="celebrate-title" className="card-title">
          <IconIceCream size={22} /> {solo ? `כל הכבוד${people ? `, ${people}` : ''}!` : 'כל הכבוד לכל הקבוצה!'}
        </h2>
        <p>
          {t(
            'הלכתם יחד בשדרה שבה התחילה העיר, גיליתם איך היא נבנתה ותכננתם עיר משלכם. זה זמן מצוין לעצור לגלידה ולספר איזו החלטה הייתה הכי קשה.',
            'עברת בשדרה שבה התחילה העיר, גילית איך היא נבנתה ותכננת עיר משלך. זה זמן מצוין לעצור לגלידה ולחשוב איזו החלטה הייתה הכי קשה.',
          )}
        </p>
      </section>

      <fieldset className="card favorite">
        <legend className="card-title">
          <IconHeart size={20} /> {t('איזו תחנה הכי אהבתם?', 'איזו תחנה הכי אהבת?')}
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
          {t('כל התשובות שלנו', 'כל התשובות שלי')}
        </h2>
        {teams ? (
          teamData.map(({ team, responses }) => (
            <div key={team.id} className="team-answers">
              <h3 className="subhead">{team.name}</h3>
              <AnswersList route={route} responses={responses} solo={false} />
            </div>
          ))
        ) : (
          <AnswersList route={route} responses={scopedResponses(progress, null)} solo={solo} />
        )}
      </section>

      <button
        type="button"
        className="btn btn-primary"
        onClick={() => {
          downloadText(buildSummary(route, progress, group), summaryFileName())
          setMessage('הסיכום הורד כקובץ טקסט.')
        }}
      >
        <IconDownload size={22} />
        <span>{`הורדת ״${cityTitle(group)}״ (קובץ טקסט)`}</span>
      </button>

      <section className="card danger-zone" aria-labelledby="reset-title">
        <h2 id="reset-title" className="card-title">
          איפוס הפעילות
        </h2>
        {!confirming ? (
          <>
            <p className="muted small">מוחק את ההתקדמות, התשובות, תוכנית העיר והתחנה האהובה. המשתתפים והרמה נשמרים.</p>
            <button ref={resetButton} type="button" className="btn btn-secondary" onClick={() => setConfirming(true)}>
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
