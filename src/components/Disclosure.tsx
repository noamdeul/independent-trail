import { useId, useState, type ReactNode } from 'react'

/** Accessible show/hide block. Content is not rendered until opened. */
export function Disclosure({
  label,
  openLabel,
  icon,
  tone = 'plain',
  children,
}: {
  label: string
  openLabel?: string
  icon?: ReactNode
  tone?: 'plain' | 'reveal'
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <div className={`disclosure disclosure-${tone}`}>
      <button
        type="button"
        className="disclosure-button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
      >
        {icon}
        <span>{open ? (openLabel ?? label) : label}</span>
        <svg className="disclosure-chevron" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
          <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div id={id} className="disclosure-panel" hidden={!open}>
        {open ? children : null}
      </div>
    </div>
  )
}
