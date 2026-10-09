import { useEffect, useId } from 'react'
import type { Route } from '../content'
import { DiscoverCard } from '../components/DiscoverCard'
import { Disclosure } from '../components/Disclosure'
import { LevelPicker } from '../components/GroupEditor'
import { IconBook, IconBulb, IconCheck, IconExternal, IconInfo, IconSkip, IconWalk, IconWarning, StationGlyph } from '../components/Icons'
import { RolesCard } from '../components/RolesCard'
import { StatusChip } from '../components/StatusChip'
import { AloudToggle, StepCard } from '../components/steps'
import { walkingDirectionsUrl } from '../lib/maps'
import { bonusKey, countByStatus, discoverKey, isStepAnswered, visibleSteps } from '../lib/progress'
import { hrefFor, navigate } from '../lib/router'
import { stationNotices } from '../lib/siteStatus'
import { statusText } from '../lib/summary'
import type { Trail } from '../lib/useTrail'
import { useVoice } from '../lib/voice'

export function StationScreen({ route, trail, stationId }: { route: Route; trail: Trail; stationId: string }) {
  const index = route.stations.findIndex((s) => s.id === stationId)
  const station = route.stations[index]
  const { progress, group, responses, visitStation } = trail
  const { solo, t } = useVoice()
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
  const total = route.stations.length
  const notices = stationNotices(station)
  const doneCount = countByStatus(progress, 'done')
  const mission = station.mission
  const steps = visibleSteps(station, group.level)
  // Never hide a step that already has an answer, e.g. after switching level.
  const lastAnswered = steps.reduce((last, st, i) => (isStepAnswered(responses[st.id]) ? i : last), -1)
  const stepsOpen = Math.min(Math.max(1, state.stepsOpen, lastAnswered + 1), steps.length)
  const challenge = group.level === 'challenge'
  // "מגלים את הסיפור": until the group picks the official media or the written
  // story, the mission waits. Stations already in progress are never blocked.
  const discover = station.media ? progress.responses[discoverKey(station.id)]?.discover : 'text'
  const alreadyStarted =
    state.status !== 'pending' || state.stepsOpen > 1 || steps.some((st) => isStepAnswered(responses[st.id]))
  const missionReady = !!discover || alreadyStarted
  // After watching or listening, the written story stays available but folded,
  // so nobody has to hear and then read the same thing.
  const storyMode: 'none' | 'collapsed' | 'full' =
    discover === 'media' ? 'collapsed' : discover === 'text' || alreadyStarted ? 'full' : 'none'
  const moreParagraphs = station.more.map((p) => (
    <p key={p.text} className={`para para-${p.kind}`}>
      {p.kind !== 'fact' && <span className="para-badge">{p.kind === 'interpretation' ? 'פרשנות' : 'שימו לב'}</span>}
      {p.text}
    </p>
  ))
  const bonus = responses[bonusKey(station.id)] ?? {}
  const activeTeam = trail.teams ? group.teams.find((tm) => tm.id === trail.scope) : undefined

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

      <a className="btn btn-nav" href={walkingDirectionsUrl(station.mapsQuery)} target="_blank" rel="noopener noreferrer">
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

      <RolesCard route={route} trail={trail} station={station} index={index} />

      {station.media && <DiscoverCard route={route} trail={trail} station={station} />}

      {storyMode === 'collapsed' && (
        <section className="card story story-collapsed" aria-label="הסיפור הכתוב">
          <Disclosure label="הסיפור הכתוב (לא חובה)" openLabel="הסתרת הסיפור הכתוב" icon={<IconBook size={20} />}>
            <p className="story-text">{station.story}</p>
            {moreParagraphs}
          </Disclosure>
        </section>
      )}
      {storyMode === 'full' && (
        <section className="card story" aria-labelledby="story-title">
          <h2 id="story-title" className="card-title">
            <IconBook size={20} /> הסיפור בקצרה
          </h2>
          <p className="story-text">{station.story}</p>
          <Disclosure
            key={group.level}
            label="רוצים לדעת יותר?"
            openLabel="הסתרת ההרחבה"
            icon={<IconInfo size={20} />}
            tone="reveal"
            defaultOpen={challenge}
          >
            {moreParagraphs}
          </Disclosure>
        </section>
      )}

      {missionReady ? (
      <section className="card mission" aria-labelledby="mission-title">
        <h2 id="mission-title" className="card-title">
          <IconBulb size={20} /> {t('המשימה שלנו', 'המשימה שלי')}: {mission.title}
        </h2>
        <div className="mission-level">
          <span className="small">רמה:</span>
          <LevelPicker route={route} trail={trail} compact />
        </div>
        {trail.teams && (
          <div className="team-switch">
            <p className="small" id="team-switch-label">
              הצוות שעונה עכשיו במכשיר:
            </p>
            <div className="segmented" role="group" aria-labelledby="team-switch-label">
              {group.teams.map((tm) => (
                <button
                  key={tm.id}
                  type="button"
                  aria-pressed={tm.id === trail.scope}
                  className={tm.id === trail.scope ? 'seg-on' : ''}
                  onClick={() => trail.setActiveTeam(tm.id)}
                >
                  {tm.name}
                </button>
              ))}
            </div>
          </div>
        )}
        {mission.scenario && (
          <p className="scenario">
            <span className="para-badge">תרחיש בדיוני</span> {mission.scenario}
          </p>
        )}
        <p className="muted small">
          {steps.length} שלבים.{' '}
          {t(
            'אפשר להקליד, לבחור כרטיסים או פשוט לדבר ולסמן ״ענינו בעל פה״. במשימות דיון כל אחד יכול להציע, ושומרים החלטה משותפת אחת.',
            'אפשר להקליד, לבחור כרטיסים או פשוט לענות בעל פה ולסמן ״עניתי בעל פה״.',
          )}
          {activeTeam && ` התשובות כאן נשמרות ל${activeTeam.name}.`}
        </p>

        {steps.slice(0, stepsOpen).map((step, i) => (
          <StepCard
            key={`${step.id}@${trail.scope ?? 'all'}`}
            route={route}
            trail={trail}
            step={step}
            index={i}
            stationId={station.id}
            planTitle={mission.planTitle}
          />
        ))}

        {stepsOpen < steps.length ? (
          <button type="button" className="btn btn-secondary" onClick={() => trail.openNextStep(station.id, stepsOpen)}>
            לשלב הבא: {steps[stepsOpen].title}
          </button>
        ) : (
          challenge && (
            <section className="bonus" aria-labelledby="bonus-title">
              <h3 id="bonus-title" className="step-title">
                <span className="step-letter" aria-hidden="true">
                  ★
                </span>
                <span>דילמת בונוס (לא חובה)</span>
              </h3>
              <p className="step-prompt">{(solo && mission.soloBonus) || mission.bonus}</p>
              <div className="field">
                <label htmlFor={bonusId}>{t('התשובה שלנו', 'התשובה שלי')}</label>
                <input
                  id={bonusId}
                  type="text"
                  maxLength={300}
                  autoComplete="off"
                  value={bonus.text?.answer ?? ''}
                  onChange={(e) => trail.setText(bonusKey(station.id), 'answer', e.target.value)}
                />
              </div>
              <AloudToggle pressed={!!bonus.aloud} onToggle={() => trail.respond(bonusKey(station.id), { aloud: !bonus.aloud })} />
            </section>
          )
        )}
      </section>
      ) : (
        <p className="mission-waiting muted">המשימה תופיע אחרי שבוחרים איך מגלים את הסיפור.</p>
      )}

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
              <span>{t('סיימנו את התחנה', 'סיימתי את התחנה')}</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              aria-label={t('דילוג, נחזור אחר כך', 'דילוג, אחזור אחר כך')}
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
