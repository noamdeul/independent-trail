import type { Screen } from '../lib/router'
import { hrefFor } from '../lib/router'
import { IconFlag, IconInfo, IconList } from './Icons'

const items = [
  { screen: { name: 'stations' } as Screen, label: 'תחנות', Icon: IconList },
  { screen: { name: 'finish' } as Screen, label: 'סיום', Icon: IconFlag },
  { screen: { name: 'about' } as Screen, label: 'מידע', Icon: IconInfo },
]

export function Header({ title, current }: { title: string; current: Screen['name'] }) {
  return (
    <header className="topbar">
      <a className="brand" href={hrefFor({ name: 'welcome' })} aria-label={`${title}, למסך הפתיחה`}>
        <span className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22">
            <path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0113 0c0 5-6.5 11-6.5 11z" fill="currentColor" />
            <circle cx="12" cy="10" r="2.4" fill="var(--sand-50)" />
          </svg>
        </span>
        <span className="brand-text">{title}</span>
      </a>
      <nav aria-label="ניווט ראשי">
        <ul className="topnav">
          {items.map(({ screen, label, Icon }) => (
            <li key={screen.name}>
              <a href={hrefFor(screen)} aria-current={current === screen.name ? 'page' : undefined}>
                <Icon size={22} />
                <span>{label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
