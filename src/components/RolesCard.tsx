import type { Route, Station } from '../content'
import { assignRoles, personName, rolesByPerson, teamMembers, type GroupSettings } from '../lib/group'
import { overrideKey } from '../lib/progress'
import { hrefFor } from '../lib/router'
import type { Trail } from '../lib/useTrail'
import { Disclosure } from './Disclosure'
import { IconSwap, IconUsers } from './Icons'

function peopleInScope(group: GroupSettings, scope: string | null) {
  return scope ? teamMembers(group, scope) : group.participants
}

export function RolesCard({ route, trail, station, index }: { route: Route; trail: Trail; station: Station; index: number }) {
  const { group, progress, scope } = trail
  const people = peopleInScope(group, scope)
  const editLink = (
    <a className="small" href={hrefFor({ name: 'group' })}>
      <IconUsers size={18} /> עריכת המשתתפים
    </a>
  )

  if (group.participants.length === 1) {
    return (
      <section className="card roles" aria-label="איך משחקים בתחנה">
        <p>
          משחק/ת לבד: עוברים על כל השלבים בקצב שלך. אפשר לענות בעל פה, לבחור כרטיסים או לכתוב.
        </p>
        {editLink}
      </section>
    )
  }

  const shift = progress.stations[station.id]?.roleShift ?? 0
  const overrides = progress.roleOverrides[overrideKey(station.id, scope)] ?? {}
  const slots = assignRoles(route.roles, people, index, shift, overrides)
  const byPerson = rolesByPerson(slots, people)
  const large = people.length > route.roles.length
  const team = scope ? group.teams.find((t) => t.id === scope) : undefined

  return (
    <section className="card roles" aria-label="תפקידים בתחנה">
      {team && <p className="roles-team">התפקידים ב{team.name}</p>}
      {large ? (
        <>
          <ul className="role-list">
            {slots.map((slot) => (
              <li key={slot.role.id}>
                <span className="role-label">{slot.role.label}</span> <strong>{personName(group, slot.personId)}</strong>
              </li>
            ))}
          </ul>
          <p className="muted small">שאר הקבוצה מצטרפים לחיפוש ולדיון כשמתאים להם. לא חייבים להשתתף בכל משימה.</p>
        </>
      ) : (
        <ul className="role-list">
          {byPerson.map(({ person, roles }) => (
            <li key={person.id}>
              <strong>{personName(group, person.id)}</strong>{' '}
              <span className="role-label">{roles.length ? roles.map((r) => r.label).join(', ') : 'בלי תפקיד הפעם'}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="muted small">ניווט הוא התפקיד המוביל, והוא עובר בין המשתתפים לאורך המסלול.</p>
      <div className="roles-actions">
        <button type="button" className="btn btn-small btn-ghost" onClick={() => trail.shiftRoles(station.id)}>
          <IconSwap size={20} />
          <span>החלפת תפקידים</span>
        </button>
        {editLink}
      </div>
      <Disclosure label="שינוי חלוקה ידני" openLabel="סגירת השינוי הידני">
        <div className="fields">
          {slots.map((slot) => (
            <label key={slot.role.id} className="field">
              <span>
                {slot.role.label} <span className="muted small">({slot.role.description})</span>
              </span>
              <select
                value={slot.auto ? '' : slot.personId}
                onChange={(e) => trail.setRole(station.id, scope, slot.role.id, e.target.value)}
              >
                <option value="">אוטומטי</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {personName(group, p.id)}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </Disclosure>
    </section>
  )
}
