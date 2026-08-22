import { fmtDuration, fmtTime, STATUS_TONE } from '@/lib/format'
import type { AttendanceStatus } from '@/api/types'
import { cx } from '@/components/ui/Primitives'

const DAY_START_HOUR = 7
const DAY_END_HOUR = 20
const SPAN_MINUTES = (DAY_END_HOUR - DAY_START_HOUR) * 60

function minutesFromMidnight(iso: string): number {
  const date = new Date(iso)
  return date.getHours() * 60 + date.getMinutes()
}

const clamp = (value: number) => Math.min(Math.max(value, 0), 100)

const toPercent = (minutes: number) =>
  clamp(((minutes - DAY_START_HOUR * 60) / SPAN_MINUTES) * 100)

interface Props {
  checkIn?: string | null
  checkOut?: string | null
  status?: AttendanceStatus | null
  workedMinutes?: number
  /** Draws the 09:00 expected-start marker. */
  expectedStart?: string
  showScale?: boolean
  live?: boolean
  className?: string
}

/**
 * The day as a single band: 07:00 on the left, 20:00 on the right, with the
 * worked interval drawn in place. It is the one visual that repeats across the
 * dashboard, the weekly calendar and the admin board, so a day's shape is
 * readable at a glance without reading any numbers.
 */
export function DayRibbon({
  checkIn,
  checkOut,
  status,
  workedMinutes = 0,
  expectedStart = '09:00',
  showScale = false,
  live = false,
  className,
}: Props) {
  const [expectedHour, expectedMinute] = expectedStart.split(':').map(Number)
  const expectedPercent = toPercent(expectedHour * 60 + expectedMinute)

  const startMinutes = checkIn ? minutesFromMidnight(checkIn) : null
  const endMinutes = checkOut
    ? minutesFromMidnight(checkOut)
    : startMinutes !== null && live
      ? new Date().getHours() * 60 + new Date().getMinutes()
      : null

  const left = startMinutes !== null ? toPercent(startMinutes) : 0
  const right = endMinutes !== null ? toPercent(endMinutes) : left
  const width = Math.max(right - left, startMinutes !== null ? 1.5 : 0)

  const tone = status ? STATUS_TONE[status] : null
  const label = checkIn
    ? `${fmtTime(checkIn)} to ${checkOut ? fmtTime(checkOut) : 'now'}, ${fmtDuration(workedMinutes)}`
    : status === 'LEAVE'
      ? 'On leave'
      : status === 'ABSENT'
        ? 'No hours recorded'
        : 'Nothing recorded yet'

  return (
    <div className={cx('w-full', className)}>
      <div
        role="img"
        aria-label={label}
        className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-150"
      >
        {/* Expected start marker */}
        <span
          className="absolute top-0 h-full w-px bg-ink/25"
          style={{ left: `${expectedPercent}%` }}
          aria-hidden
        />
        {status === 'LEAVE' && !checkIn && (
          <span
            className="absolute inset-y-0 left-0 w-full bg-flow-200"
            style={{
              backgroundImage:
                'repeating-linear-gradient(135deg, transparent 0 6px, rgba(59,76,224,.35) 6px 12px)',
            }}
            aria-hidden
          />
        )}
        {startMinutes !== null && (
          <span
            className={cx(
              'absolute inset-y-0 origin-left rounded-full animate-ribbon-in',
              tone?.bar ?? 'bg-flow-400',
            )}
            style={{ left: `${left}%`, width: `${width}%` }}
            aria-hidden
          />
        )}
        {live && startMinutes !== null && !checkOut && (
          <span
            className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-present ring-2 ring-white"
            style={{ left: `calc(${right}% - 4px)` }}
            aria-hidden
          />
        )}
      </div>
      {showScale && (
        <div className="mt-1.5 flex justify-between text-[10px] font-medium tracking-wide text-away">
          {[7, 10, 13, 16, 20].map((hour) => (
            <span key={hour} className="tabular">
              {String(hour).padStart(2, '0')}:00
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
