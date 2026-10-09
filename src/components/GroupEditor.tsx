import { useId } from 'react'
import type { Route } from '../content'
import { normalizeAge, suggestLevel, teamMembers, teamsActive, TEAMS_FROM } from '../lib/group'
import type { Trail } from '../lib/useTrail'
import { IconPlus, IconTrash } from './Icons'

function sizeNote(n: number): string {
  if (n === 1) return 'משחק/ת לבד: כל השלבים בקצב שלך, בלי חלוקת תפקידים.'
  if (n === 2) return 'כל אחד מקבל כמה תפקידים, ומתחלפים בכל תחנה.'
  if (n < TEAMS_FROM) return 'מחלקים את חמשת התפקידים ומתחלפים בכל תחנה.'
  return 'קבוצה גדולה: אפשר לפעול כקבוצה אחת או להתחלק לצוותים.'
}

export function GroupEditor({ trail }: { trail: Trail }) {
  const { group } = trail
  const n = group.participants.length
  const baseId = useId()
  return (
    <div className="group-editor">
      <ul className="people">
        {group.participants.map((p, i) => {
          const nameId = `${baseId}-name-${p.id}`
          const ageId = `${baseId}-age-${p.id}`
          const shown = p.name.trim() || `משתתף/ת ${i + 1}`
          return (
            <li key={p.id} className="person">
              <div className="field person-name">
                <label htmlFor={nameId}>{`משתתף/ת ${i + 1}`}</label>
                <input
                  id={nameId}
                  type="text"
                  value={p.name}
                  maxLength={40}
                  autoComplete="off"
                  placeholder="שם"
                  onChange={(e) => trail.updateParticipant(p.id, { name: e.target.value })}
                />
              </div>
              <div className="field person-age">
                <label htmlFor={ageId}>
                  גיל<span className="sr-only"> (לא חובה)</span>
                </label>
                <input
                  id={ageId}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={3}
                  autoComplete="off"
                  value={p.age ?? ''}
                  onChange={(e) => trail.updateParticipant(p.id, { age: normalizeAge(e.target.value.replace(/\D/g, '')) })}
                />
              </div>
              <button
                type="button"
                className="icon-btn"
                aria-label={`הסרת ${shown}`}
                disabled={n <= 1}
                onClick={() => trail.removeParticipant(p.id)}
              >
                <IconTrash size={20} />
              </button>
            </li>
          )
        })}
      </ul>
      <button type="button" className="btn btn-small btn-soft" onClick={trail.addParticipant}>
        <IconPlus size={20} />
        <span>הוספת משתתף/ת</span>
      </button>
      <p className="muted small">הגיל לא חובה. הוא משמש רק להצעת רמה.</p>
      <p className="muted small" aria-live="polite">
        {n === 1 ? 'משתתף/ת אחד/ת. ' : `${n} משתתפים. `}
        {sizeNote(n)}
      </p>
      {n >= TEAMS_FROM && <TeamsEditor trail={trail} />}
    </div>
  )
}

function TeamsEditor({ trail }: { trail: Trail }) {
  const { group } = trail
  const active = teamsActive(group)
  const maxTeams = Math.min(Math.floor(group.participants.length / 2), 8)
  return (
    <fieldset className="subcard">
      <legend className="subhead">איך משחקים?</legend>
      <div className="radio-list">
        <label className="radio">
          <input type="radio" name="group-mode" checked={!active} onChange={() => trail.setMode('together')} />
          <span>קבוצה אחת</span>
        </label>
        <label className="radio">
          <input type="radio" name="group-mode" checked={active} onChange={() => trail.setMode('teams')} />
          <span>צוותים של 2–4</span>
        </label>
      </div>
      {active && (
        <div className="teams">
          <p className="muted small">
            כל הצוותים משתמשים במכשיר הזה ומתחלפים בו. כל צוות שומר החלטות משלו, ובסוף משווים בין ההצעות. אין סנכרון בין
            מכשירים.
          </p>
          <div className="stepper">
            <span>מספר צוותים: {group.teams.length}</span>
            <button
              type="button"
              className="icon-btn"
              aria-label="פחות צוותים"
              disabled={group.teams.length <= 2}
              onClick={() => trail.setTeamCount(group.teams.length - 1)}
            >
              −
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label="יותר צוותים"
              disabled={group.teams.length >= maxTeams}
              onClick={() => trail.setTeamCount(group.teams.length + 1)}
            >
              +
            </button>
          </div>
          <ul className="team-list">
            {group.teams.map((team) => {
              const size = teamMembers(group, team.id).length
              return (
                <li key={team.id}>
                  <strong>{team.name}</strong>: {size} {size === 1 ? 'משתתף/ת' : 'משתתפים'}
                  {(size < 2 || size > 4) && <span className="warn"> (מומלץ 2–4)</span>}
                </li>
              )
            })}
          </ul>
          <ul className="people-teams">
            {group.participants.map((p, i) => (
              <li key={p.id}>
                <label>
                  <span>{p.name.trim() || `משתתף/ת ${i + 1}`}</span>
                  <select value={group.teamOf[p.id] ?? ''} onChange={(e) => trail.setTeamOf(p.id, e.target.value)}>
                    {group.teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn-small btn-soft" onClick={trail.reshuffleTeams}>
            חלוקה אוטומטית מחדש
          </button>
        </div>
      )}
    </fieldset>
  )
}

export function LevelPicker({ route, trail, compact = false }: { route: Route; trail: Trail; compact?: boolean }) {
  const { group } = trail
  const suggestion = suggestLevel(group.participants)
  const suggested = route.levels.find((l) => l.id === suggestion)
  if (compact) {
    return (
      <div className="segmented level-switch" role="group" aria-label="רמת הפעילות">
        {route.levels.map((l) => (
          <button
            key={l.id}
            type="button"
            aria-pressed={group.level === l.id}
            className={group.level === l.id ? 'seg-on' : ''}
            onClick={() => trail.setLevel(l.id)}
          >
            {l.label}
          </button>
        ))}
      </div>
    )
  }
  return (
    <fieldset className="card levels">
      <legend className="card-title">רמת הפעילות</legend>
      <div className="radio-list">
        {route.levels.map((l) => (
          <label key={l.id} className="radio radio-rich">
            <input type="radio" name="level" value={l.id} checked={group.level === l.id} onChange={() => trail.setLevel(l.id)} />
            <span>
              <strong>
                {l.label}, {l.duration}
              </strong>
              <span className="muted small block">{l.description}</span>
            </span>
          </label>
        ))}
      </div>
      {suggested && (
        <p className="small suggestion-line">
          הצעה לפי הגילים: <strong>{suggested.label}</strong>.{' '}
          {group.level !== suggested.id && (
            <button type="button" className="link-btn" onClick={() => trail.setLevel(suggested.id)}>
              לבחור ברמה הזו
            </button>
          )}
        </p>
      )}
      <p className="muted small">אפשר להחליף רמה גם במהלך המסלול.</p>
    </fieldset>
  )
}
