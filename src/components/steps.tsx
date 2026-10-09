import { useId, useState, type ReactNode } from 'react'
import type {
  BudgetStep,
  CategorizeStep,
  CharterStep,
  ChoiceStep,
  Field,
  LotteryStep,
  MatchStep,
  ObserveStep,
  OrderStep,
  Route,
  SeeThinkStep,
  Step,
} from '../content'
import { budgetCost, budgetSelection, charterSuggestions, charterText, charterValues, cityPlan, findStep } from '../lib/plan'
import type { Responses, StepResponse } from '../lib/progress'
import { fieldLabel, stepPrompt, useVoice } from '../lib/voice'
import type { Trail } from '../lib/useTrail'
import { Disclosure } from './Disclosure'
import { IconBulb, IconCheck, IconEye, IconPencil } from './Icons'

const LETTERS = ['א', 'ב', 'ג', 'ד']

interface StepProps<S extends Step = Step> {
  route: Route
  trail: Trail
  step: S
  r: StepResponse
}

// ---------------------------------------------------------------- shared bits

function TextField({
  label,
  value,
  onChange,
  long,
  placeholder,
  numeric,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  long?: boolean
  placeholder?: string
  numeric?: boolean
}) {
  const id = useId()
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {long ? (
        <textarea id={id} rows={3} maxLength={2000} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input
          id={id}
          type="text"
          maxLength={300}
          value={value}
          placeholder={placeholder}
          inputMode={numeric ? 'numeric' : undefined}
          autoComplete="off"
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  )
}

/**
 * Fields that feed the city plan are always visible. Other questions are shown
 * as a list to talk about, with inputs only when the family wants to write.
 */
function Fields({ trail, step, r, fields }: { trail: Trail; step: Step; r: StepResponse; fields: Field[] }) {
  const talk = fields.filter((f) => !f.plan)
  const keep = fields.filter((f) => f.plan)
  const hasText = talk.some((f) => (r.text?.[f.id] ?? '').trim())
  const [writing, setWriting] = useState(hasText)
  const { solo } = useVoice()
  const input = (f: Field) => (
    <TextField
      key={f.id}
      label={fieldLabel(f, solo)}
      long={f.long}
      value={r.text?.[f.id] ?? ''}
      onChange={(v) => trail.setText(step.id, f.id, v)}
    />
  )
  return (
    <div className="fields">
      {talk.length > 0 &&
        (writing ? (
          talk.map(input)
        ) : (
          <div className="talk">
            <ul className="bullets">
              {talk.map((f) => (
                <li key={f.id}>{fieldLabel(f, solo)}</li>
              ))}
            </ul>
            <button type="button" className="btn btn-small btn-soft" onClick={() => setWriting(true)}>
              <IconPencil size={18} />
              <span>רוצים לרשום?</span>
            </button>
          </div>
        ))}
      {keep.map(input)}
    </div>
  )
}

export function AloudToggle({ pressed, onToggle, label }: { pressed: boolean; onToggle: () => void; label?: string }) {
  const { t } = useVoice()
  label ??= t('ענינו בעל פה', 'עניתי בעל פה')
  return (
    <button type="button" className={`toggle${pressed ? ' toggle-on' : ''}`} aria-pressed={pressed} onClick={onToggle}>
      <span className="toggle-box" aria-hidden="true">
        {pressed && <IconCheck size={16} />}
      </span>
      {label}
    </button>
  )
}

function Hints({ hints, shown, onShow }: { hints: [string, string]; shown: number; onShow: () => void }) {
  return (
    <div className="hints">
      {hints.slice(0, shown).map((h, i) => (
        <p key={h} className="hint">
          <IconBulb size={18} />
          <span>
            <strong>רמז {i + 1}:</strong> {h}
          </span>
        </p>
      ))}
      {shown < hints.length && (
        <button type="button" className="btn btn-small btn-soft" onClick={onShow}>
          <IconBulb size={18} />
          <span>{shown === 0 ? 'רמז ראשון' : 'רמז שני'}</span>
        </button>
      )}
    </div>
  )
}

function Solution({ text, shown, onShow, label = 'הצגת פתרון והסבר' }: { text: string; shown: boolean; onShow: () => void; label?: string }) {
  return shown ? (
    <div className="solution" role="status">
      <IconEye size={20} />
      <p>{text}</p>
    </div>
  ) : (
    <button type="button" className="btn btn-small btn-reveal" onClick={onShow}>
      <IconEye size={18} />
      <span>{label}</span>
    </button>
  )
}

/** Toggle buttons used for cards. */
function CardButton({
  pressed,
  disabled,
  onClick,
  children,
  className = '',
}: {
  pressed: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      className={`card-btn${pressed ? ' card-btn-on' : ''} ${className}`}
      aria-pressed={pressed}
      aria-disabled={disabled || undefined}
      onClick={() => !disabled && onClick()}
    >
      <span className="card-check" aria-hidden="true">
        {pressed && <IconCheck size={16} />}
      </span>
      <span className="card-body">{children}</span>
    </button>
  )
}

// ---------------------------------------------------------------- step kinds

function Observe({ trail, step, r }: StepProps<ObserveStep>) {
  const { t } = useVoice()
  const notFoundLabel = t('לא מצאנו', 'לא מצאתי')
  return (
    <ul className="observe">
      {step.items.map((item, i) => {
        const key = `item${i}`
        const notFound = r.notFound?.includes(key) ?? false
        return (
          <li key={item}>
            <TextField
              label={item}
              value={r.text?.[key] ?? ''}
              placeholder={notFound ? notFoundLabel : t('מה ראיתם?', 'מה רואים?')}
              onChange={(v) => trail.setText(step.id, key, v)}
            />
            <AloudToggle
              label={notFoundLabel}
              pressed={notFound}
              onToggle={() =>
                trail.respond(step.id, (prev) => {
                  const list = prev.notFound ?? []
                  return { ...prev, notFound: notFound ? list.filter((k) => k !== key) : [...list, key] }
                })
              }
            />
          </li>
        )
      })}
    </ul>
  )
}

function SeeThink({ trail, step, r }: StepProps<SeeThinkStep>) {
  return (
    <ol className="seethink">
      {Array.from({ length: step.rows }, (_, i) => (
        <li key={i}>
          <p className="seethink-title">פרט {i + 1}</p>
          <TextField
            label="ראינו (מה רואים ממש)"
            value={r.text?.[`seen${i}`] ?? ''}
            onChange={(v) => trail.setText(step.id, `seen${i}`, v)}
          />
          <TextField
            label="אנחנו חושבים (מה הוא מספר)"
            value={r.text?.[`think${i}`] ?? ''}
            onChange={(v) => trail.setText(step.id, `think${i}`, v)}
          />
        </li>
      ))}
    </ol>
  )
}

function Budget({ trail, step, r, responses }: StepProps<BudgetStep> & { responses: Responses }) {
  if (step.announcement && !r.announced) {
    return (
      <button type="button" className="btn btn-reveal" onClick={() => trail.respond(step.id, { announced: true })}>
        <IconEye size={20} />
        <span>חשפו הודעה</span>
      </button>
    )
  }
  const selected = budgetSelection(step, responses)
  const used = budgetCost(step, selected)
  const left = step.budget - used
  const toggle = (id: string) => {
    const next = selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]
    trail.respond(step.id, { selected: next })
  }
  return (
    <div className="budget">
      {step.announcement && (
        <p className="announcement" role="alert">
          <strong>הודעה:</strong> {step.announcement}
        </p>
      )}
      <div className="meter" aria-live="polite">
        <div className="meter-text">
          <span>
            השתמשתם ב־<strong>{used}</strong> מתוך {step.budget} {step.unit}
          </span>
          <span className={left < 0 ? 'over' : ''}>{left < 0 ? `חריגה של ${-left}` : `נשארו ${left}`}</span>
        </div>
        <div className="meter-bar" aria-hidden="true">
          <span style={{ width: `${Math.min(100, (used / step.budget) * 100)}%` }} className={left < 0 ? 'over' : ''} />
        </div>
      </div>
      {left < 0 && <p className="warn">התוכנית חורגת מהתקציב. הסירו משהו כדי לעמוד בו.</p>}
      <div className="card-grid">
        {step.options.map((o) => {
          const on = selected.includes(o.id)
          const blocked = !on && (o.cost ?? 0) > left
          return (
            <CardButton key={o.id} pressed={on} disabled={blocked} onClick={() => toggle(o.id)}>
              <span className="card-label">{o.label}</span>
              <span className="card-cost">
                {o.cost} {step.unit}
                {blocked && <span className="sr-only">, אין מספיק תקציב</span>}
              </span>
            </CardButton>
          )
        })}
      </div>
      <p className="muted small">המחירים במשחק בדיוניים. כרטיס אפור עולה יותר ממה שנשאר.</p>
    </div>
  )
}

function Choice({ route, trail, step, r, responses, stationId }: StepProps<ChoiceStep> & { responses: Responses; stationId: string }) {
  const selected = r.selected ?? []
  const full = step.max > 1 && selected.length >= step.max
  const toggle = (id: string) => {
    const on = selected.includes(id)
    const next = step.max === 1 ? (on ? [] : [id]) : on ? selected.filter((s) => s !== id) : [...selected, id]
    trail.respond(step.id, { selected: next })
  }
  const plan = step.showPlan ? cityPlan(route, responses, { includeCharter: false }).filter((s) => s.station.id !== stationId) : []
  const perOptionFilled = step.options.some((o) => step.perOption?.some((f) => (r.text?.[`${o.id}:${f.id}`] ?? '').trim()))
  const [writing, setWriting] = useState(perOptionFilled)
  return (
    <div className="choice">
      {step.showPlan && (
        <div className="plan-reminder">
          <p className="plan-reminder-title">מה נשמר עד עכשיו</p>
          {plan.length === 0 ? (
            <p className="muted small">עוד לא נשמרו החלטות. אפשר לבחור עקרונות גם כך, או לחזור לתחנות.</p>
          ) : (
            <ul>
              {plan.map((s) => (
                <li key={s.station.id}>
                  <strong>{s.title}:</strong> {s.lines.join(' · ')}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {step.max > 1 && (
        <p className="muted small" aria-live="polite">
          נבחרו {selected.length} מתוך {step.max}
        </p>
      )}
      <div className={step.perOption ? 'card-stack' : 'card-grid'}>
        {step.options.map((o) => {
          const on = selected.includes(o.id)
          return (
            <div key={o.id} className="choice-item">
              <CardButton pressed={on} disabled={!on && full} onClick={() => toggle(o.id)}>
                <span className="card-label">{o.label}</span>
                {o.cost !== undefined && <span className="card-cost">{o.cost} נקודות</span>}
                {o.detail && <span className="card-detail">{o.detail}</span>}
              </CardButton>
              {step.perOption && writing && (
                <div className="fields fields-inline">
                  {step.perOption.map((f) => (
                    <TextField
                      key={f.id}
                      label={`${f.label}`}
                      value={r.text?.[`${o.id}:${f.id}`] ?? ''}
                      onChange={(v) => trail.setText(step.id, `${o.id}:${f.id}`, v)}
                    />
                  ))}
                </div>
              )}
              {on &&
                step.perPicked?.map((f) => (
                  <TextField
                    key={f.id}
                    label={f.label}
                    value={r.text?.[`${o.id}:${f.id}`] ?? ''}
                    onChange={(v) => trail.setText(step.id, `${o.id}:${f.id}`, v)}
                  />
                ))}
            </div>
          )
        })}
      </div>
      {step.perOption && !writing && (
        <button type="button" className="btn btn-small btn-soft" onClick={() => setWriting(true)}>
          <IconPencil size={18} />
          <span>רוצים לרשום {step.perOption.map((f) => f.label).join(' ו')}?</span>
        </button>
      )}
      {full && <p className="muted small">כדי לבחור כרטיס אחר, בטלו קודם בחירה.</p>}
    </div>
  )
}

function Categorize({ trail, step, r }: StepProps<CategorizeStep>) {
  return (
    <ul className="categorize">
      {step.cards.map((card) => {
        const picked = r.assign?.[card.id]
        const right = step.categories.find((c) => c.id === card.answer)
        return (
          <li key={card.id}>
            <p className="cat-card" id={`${step.id}-${card.id}`}>
              {card.label}
            </p>
            <div className="segmented" role="group" aria-labelledby={`${step.id}-${card.id}`}>
              {step.categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={picked === c.id}
                  className={picked === c.id ? 'seg-on' : ''}
                  onClick={() => trail.respond(step.id, (prev) => ({ ...prev, assign: { ...prev.assign, [card.id]: c.id } }))}
                >
                  {c.label}
                </button>
              ))}
            </div>
            {r.solved && right && (
              <p className="small cat-solution">
                {picked === card.answer && <IconCheck size={16} />}
                בפתרון: {right.label}
              </p>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function Order({ trail, step, r }: StepProps<OrderStep>) {
  const [announce, setAnnounce] = useState('')
  const order = r.order?.length === step.cards.length ? r.order : step.start
  const label = (id: string) => step.cards.find((c) => c.id === id)?.label ?? id
  const move = (index: number, delta: number) => {
    const to = index + delta
    if (to < 0 || to >= order.length) return
    const next = [...order]
    ;[next[index], next[to]] = [next[to], next[index]]
    trail.respond(step.id, { order: next })
    setAnnounce(`${label(order[index])} עבר למקום ${to + 1}`)
  }
  const correct = order.every((id, i) => id === step.cards[i].id)
  const follow = step.followUp
  return (
    <div className="order">
      <ol className="order-list">
        {order.map((id, i) => (
          <li key={id}>
            <span className="order-num" aria-hidden="true">
              {i + 1}
            </span>
            <span className="order-label">{label(id)}</span>
            <span className="order-buttons">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`הזזת ${label(id)} למעלה`}>
                <span aria-hidden="true">▲</span>
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === order.length - 1}
                aria-label={`הזזת ${label(id)} למטה`}
              >
                <span aria-hidden="true">▼</span>
              </button>
            </span>
          </li>
        ))}
      </ol>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
      {follow && (r.solved || correct) && (
        <div className="followup">
          <p className="followup-q">{follow.question}</p>
          <TextField
            label="התשובה שלנו"
            numeric
            value={r.text?.followUp ?? ''}
            onChange={(v) => trail.setText(step.id, 'followUp', v)}
          />
          <Hints
            hints={follow.hints}
            shown={r.followHints ?? 0}
            onShow={() => trail.respond(step.id, { followHints: (r.followHints ?? 0) + 1 })}
          />
          <Solution
            text={`${follow.answer} שנים.`}
            shown={!!r.followSolved}
            label="הצגת התשובה"
            onShow={() => trail.respond(step.id, { followSolved: true })}
          />
        </div>
      )}
    </div>
  )
}

function PlotsIllustration() {
  return (
    <figure className="illustration">
      <svg viewBox="0 0 320 120" role="img" aria-label="איור סכמטי של שלושה מגרשים בדיוניים">
        <rect x="0" y="0" width="320" height="120" rx="12" fill="var(--sand-100)" />
        <rect x="0" y="52" width="320" height="16" fill="var(--sand-300)" />
        <rect x="216" y="8" width="96" height="40" rx="6" fill="#fff" stroke="var(--line)" />
        <circle cx="264" cy="28" r="12" fill="var(--blue-100)" stroke="var(--blue-700)" />
        <text x="264" y="98" textAnchor="middle" fontSize="13" fill="var(--ink)">
          א · ליד הכיכר
        </text>
        <rect x="216" y="74" width="96" height="40" rx="6" fill="none" stroke="var(--green-700)" strokeDasharray="5 4" />
        <rect x="112" y="74" width="96" height="40" rx="6" fill="none" stroke="var(--green-700)" strokeDasharray="5 4" />
        <text x="160" y="98" textAnchor="middle" fontSize="13" fill="var(--ink)">
          ב · רחוב שקט
        </text>
        <rect x="8" y="8" width="96" height="40" rx="6" fill="var(--green-100)" stroke="var(--green-700)" />
        <circle cx="40" cy="28" r="8" fill="var(--leaf)" />
        <circle cx="68" cy="26" r="10" fill="var(--leaf-2)" />
        <rect x="8" y="74" width="96" height="40" rx="6" fill="none" stroke="var(--green-700)" strokeDasharray="5 4" />
        <text x="56" y="98" textAnchor="middle" fontSize="13" fill="var(--ink)">
          ג · ליד הגינה
        </text>
      </svg>
      <figcaption>איור סכמטי של מגרשים בדיוניים, לא מפה אמיתית.</figcaption>
    </figure>
  )
}

function Match({ trail, step, r }: StepProps<MatchStep>) {
  return (
    <div className="match">
      {step.illustration === 'plots' && <PlotsIllustration />}
      <ul className="targets">
        {step.targets.map((t) => (
          <li key={t.id}>
            <strong>{t.label}:</strong> {t.detail}
          </li>
        ))}
      </ul>
      <ul className="match-list">
        {step.items.map((item) => (
          <li key={item.id}>
            <p id={`${step.id}-${item.id}`}>
              <strong>{item.label}</strong> <span className="muted">{item.detail}</span>
            </p>
            <div className="segmented" role="group" aria-labelledby={`${step.id}-${item.id}`}>
              {step.targets.map((t) => {
                const on = r.assign?.[item.id] === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={on}
                    className={on ? 'seg-on' : ''}
                    onClick={() => trail.respond(step.id, (prev) => ({ ...prev, assign: { ...prev.assign, [item.id]: t.id } }))}
                  >
                    {t.label}
                  </button>
                )
              })}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function randomIndex(n: number): number {
  try {
    const buf = new Uint32Array(1)
    crypto.getRandomValues(buf)
    return buf[0] % n
  } catch {
    return Math.floor(Math.random() * n)
  }
}

export function drawLottery(items: string[], targets: string[]): Record<string, string> {
  const pool = [...targets]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1)
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return Object.fromEntries(items.map((id, i) => [id, pool[i % pool.length]]))
}

function Lottery({ route, trail, step, r, responses }: StepProps<LotteryStep> & { responses: Responses }) {
  const match = findStep(route, step.from)
  if (match?.kind !== 'match') return null
  const ours = responses[match.id]?.assign ?? {}
  const { t } = useVoice()
  const label = (id?: string) => match.targets.find((t) => t.id === id)?.label ?? '—'
  const draw = () =>
    trail.respond(step.id, {
      lottery: drawLottery(
        match.items.map((i) => i.id),
        match.targets.map((t) => t.id),
      ),
    })
  return (
    <div className="lottery">
      <button type="button" className="btn btn-reveal" onClick={draw}>
        <span aria-hidden="true">🐚</span>
        <span>{r.lottery ? 'הגרלה נוספת' : 'מגרילים!'}</span>
      </button>
      {r.lottery && (
        <table className="compare" aria-live="polite">
          <caption className="sr-only">השוואה בין החלוקה שלכם להגרלה</caption>
          <thead>
            <tr>
              <th scope="col">משפחה</th>
              <th scope="col">{t('החלוקה שלנו', 'החלוקה שלי')}</th>
              <th scope="col">ההגרלה</th>
            </tr>
          </thead>
          <tbody>
            {match.items.map((item) => (
              <tr key={item.id}>
                <th scope="row">{item.label}</th>
                <td>{label(ours[item.id])}</td>
                <td>{label(r.lottery?.[item.id])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="muted small">ההגרלה רצה במכשיר, באקראי. אין תוצאה ״נכונה״.</p>
    </div>
  )
}

function Charter({ route, trail, step, r, responses }: StepProps<CharterStep> & { responses: Responses }) {
  const { solo } = useVoice()
  const s = charterSuggestions(route, responses, step)
  const values = charterValues(route, responses, step)
  const field = (key: 'team' | 'city' | 'build' | 'preserve' | 'divide', label: string, suggestion = '') => (
    <div>
      <TextField label={label} value={r.text?.[key] ?? ''} onChange={(v) => trail.setText(step.id, key, v)} />
      {suggestion && !(r.text?.[key] ?? '').trim() && <p className="muted small suggestion">מההחלטות שלכם: {suggestion}</p>}
    </div>
  )
  const principles = s.principles.filter(Boolean)
  return (
    <div className="charter">
      <div className="fields">
        {field('team', solo ? 'השם שלי' : 'שם הצוות')}
        {field('city', 'שם העיר')}
        <p className="small">
          <strong>העקרונות שבחרתם:</strong> {principles.length ? principles.join(' · ') : 'עוד לא נבחרו (שלב ב).'}
        </p>
        {field('build', 'מה נבנה', s.build)}
        {field('preserve', 'על מה נשמור', s.preserve)}
        {field('divide', 'איך נחליט על חלוקה', s.divide)}
      </div>
      <blockquote className="charter-doc" aria-label="מגילת העיר">
        {charterText(values, solo)
          .split('\n')
          .map((line) => (
            <p key={line}>{line}</p>
          ))}
      </blockquote>
    </div>
  )
}

// ---------------------------------------------------------------- wrapper

export function StepCard({
  route,
  trail,
  step,
  index,
  stationId,
  planTitle,
}: {
  route: Route
  trail: Trail
  step: Step
  index: number
  stationId: string
  planTitle: string
}) {
  const { responses, group } = trail
  const { solo, t } = useVoice()
  const light = group.level === 'light'
  const r = responses[step.id] ?? {}
  const props = { route, trail, r }
  const titleId = `${step.id}-title`
  return (
    <section className="step" aria-labelledby={titleId}>
      <h3 id={titleId} className="step-title">
        <span className="step-letter" aria-hidden="true">
          {LETTERS[index]}
        </span>
        <span>
          <span className="sr-only">שלב {LETTERS[index]}: </span>
          {step.title}
        </span>
      </h3>
      <p className="step-prompt">{stepPrompt(step, solo)}</p>
      {step.bullets && (
        <ul className="bullets">
          {step.bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      )}

      {step.kind === 'observe' && <Observe {...props} step={step} />}
      {step.kind === 'seeThink' && <SeeThink {...props} step={step} />}
      {step.kind === 'budget' && <Budget {...props} step={step} responses={responses} />}
      {step.kind === 'choice' && <Choice {...props} step={step} responses={responses} stationId={stationId} />}
      {step.kind === 'categorize' && <Categorize {...props} step={step} />}
      {step.kind === 'order' && <Order {...props} step={step} />}
      {step.kind === 'match' && <Match {...props} step={step} />}
      {step.kind === 'lottery' && <Lottery {...props} step={step} responses={responses} />}
      {step.kind === 'charter' && <Charter {...props} step={step} responses={responses} />}

      {step.fields && step.fields.length > 0 && <Fields trail={trail} step={step} r={r} fields={step.fields} />}

      {step.fallback && <p className="fallback">{step.fallback}</p>}

      {step.hints && (
        <Hints
          hints={step.hints}
          shown={Math.max(r.hints ?? 0, light ? 1 : 0)}
          onShow={() => trail.respond(step.id, { hints: Math.max(r.hints ?? 0, light ? 1 : 0) + 1 })}
        />
      )}
      {step.solution && (
        <Solution text={step.solution} shown={!!r.solved} onShow={() => trail.respond(step.id, { solved: true })} />
      )}
      {step.example && (
        <Disclosure label="דוגמה למחשבה" openLabel="הסתרת הדוגמה" icon={<IconBulb size={18} />} defaultOpen={light}>
          <p>{step.example}</p>
          <p className="muted small">זו רק דוגמה. אין תשובה אחת נכונה.</p>
        </Disclosure>
      )}

      <div className="step-foot">
        <AloudToggle
          label={step.kind === 'charter' ? t('הקראנו יחד', 'הקראתי') : t('ענינו בעל פה', 'עניתי בעל פה')}
          pressed={!!r.aloud}
          onToggle={() => trail.respond(step.id, { aloud: !r.aloud })}
        />
        {step.plan && <span className="plan-tag">נשמר ב״{planTitle}״</span>}
      </div>
    </section>
  )
}
