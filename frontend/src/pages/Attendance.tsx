import { useCallback, useMemo, useState } from 'react'
import { addDays, startOfWeek, subDays } from 'date-fns'
import { CalendarRange, ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react'
import { api } from '@/api/client'
import type { AttendanceSummary } from '@/api/types'
import { useLiveRefresh } from '@/context/RealtimeContext'
import { useAsync } from '@/hooks/useAsync'
import { DayRibbon } from '@/components/DayRibbon'
import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'
import { Button, Card, CardHeader, ErrorState, Pill, Skeleton, cx } from '@/components/ui/Primitives'
import { fmtDate, fmtDuration, fmtTime, isoDate, STATUS_LABEL, STATUS_TONE } from '@/lib/format'

type View = 'week' | 'month'

export default function Attendance() {
  const [view, setView] = useState<View>('week')
  const [anchor, setAnchor] = useState(new Date())

  const { start, end } = useMemo(() => {
    if (view === 'week') {
      const monday = startOfWeek(anchor, { weekStartsOn: 1 })
      return { start: monday, end: addDays(monday, 6) }
    }
    return { start: subDays(anchor, 29), end: anchor }
  }, [view, anchor])

  const load = useCallback(
    () =>
      api.get<AttendanceSummary>('/attendance/me', {
        start: isoDate(start),
        end: isoDate(end),
      }),
    [start, end],
  )

  const { data, loading, error, reload } = useAsync(load, [isoDate(start), isoDate(end)])
  useLiveRefresh(['attendance.checked_in', 'attendance.checked_out', 'attendance.updated', 'leave.approved'], reload)

  const shift = (direction: -1 | 1) =>
    setAnchor((current) => addDays(current, direction * (view === 'week' ? 7 : 30)))

  return (
    <>
      <PageHeader
        title="Your attendance"
        description="Every day you have worked, with the hours drawn where they happened."
        actions={
          <div className="flex rounded-xl border border-slate-150 bg-white p-1">
            {(['week', 'month'] as View[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setView(option)
                  setAnchor(new Date())
                }}
                className={cx(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors',
                  view === option ? 'bg-flow-500 text-white' : 'text-ink-600 hover:bg-slate-150',
                )}
              >
                {option === 'week' ? <CalendarRange className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
                {option === 'week' ? 'Weekly' : 'Monthly'}
              </button>
            ))}
          </div>
        }
      />

      <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-slate-150 bg-white px-3 py-2.5 shadow-card">
        <Button variant="ghost" size="sm" onClick={() => shift(-1)} icon={<ChevronLeft className="h-4 w-4" />}>
          Earlier
        </Button>
        <p className="text-sm font-semibold text-ink tabular">
          {fmtDate(isoDate(start), 'd MMM')} – {fmtDate(isoDate(end), 'd MMM yyyy')}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => shift(1)}
          disabled={end >= new Date()}
        >
          Later
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {loading && !data && (
        <div className="grid gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-96" />
        </div>
      )}
      {error && <ErrorState message={error} onRetry={reload} />}

      {data && (
        <>
          <div className="mb-5 grid gap-4 grid-cols-2 lg:grid-cols-4">
            <StatCard label="Present" value={data.present} tone="present" />
            <StatCard label="Half days" value={data.half_day} tone="pending" />
            <StatCard label="Absent" value={data.absent} tone="absent" />
            <StatCard label="Hours logged" value={data.total_hours} unit="h" hint={`${data.attendance_rate}% attendance`} />
          </div>

          <Card>
            <CardHeader
              title={view === 'week' ? 'Day by day' : 'Last 30 days'}
              subtitle="The band spans 07:00 to 20:00. The hairline marks the 09:00 start."
            />
            <ul className="divide-y divide-slate-150">
              {data.days.map((day) => (
                <li key={day.work_date} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
                  <div className="w-24 shrink-0">
                    <p className="text-sm font-semibold text-ink">{fmtDate(day.work_date, 'EEE d')}</p>
                    <p className="text-xs text-away">{fmtDate(day.work_date, 'MMM')}</p>
                  </div>

                  <div className="order-last w-full min-w-0 flex-1 sm:order-none sm:w-auto">
                    <DayRibbon
                      checkIn={day.check_in}
                      checkOut={day.check_out}
                      status={day.status}
                      workedMinutes={day.worked_minutes}
                      live
                    />
                  </div>

                  <div className="ml-auto flex shrink-0 items-center gap-3">
                    <span className="hidden text-sm text-away tabular sm:inline">
                      {day.check_in ? `${fmtTime(day.check_in)}–${day.check_out ? fmtTime(day.check_out) : '…'}` : '—'}
                    </span>
                    <span className="w-16 text-right text-sm font-semibold text-ink tabular">
                      {day.worked_minutes ? fmtDuration(day.worked_minutes) : '—'}
                    </span>
                    {day.status ? (
                      <Pill tone={STATUS_TONE[day.status].chip}>{STATUS_LABEL[day.status]}</Pill>
                    ) : (
                      <Pill tone="bg-slate-150 text-away">Weekend</Pill>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </>
  )
}
