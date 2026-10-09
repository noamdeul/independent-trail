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
        <span className="disclosure-chevron" aria-hidden="true" />
      </button>
      <div id={id} className="disclosure-panel" hidden={!open}>
        {open ? children : null}
      </div>
    </div>
  )
}
