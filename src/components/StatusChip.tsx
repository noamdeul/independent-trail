import type { StationStatus } from '../lib/progress'
import { statusText } from '../lib/summary'
import { IconCheck, IconSkip } from './Icons'

export function StatusChip({ status }: { status: StationStatus }) {
  return (
    <span className={`chip chip-${status}`}>
      {status === 'done' && <IconCheck size={16} />}
      {status === 'skipped' && <IconSkip size={16} />}
      {statusText(status)}
    </span>
  )
}
