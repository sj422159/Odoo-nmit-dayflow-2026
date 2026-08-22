import { useCallback, useMemo, useState } from 'react'
import { addDays, startOfWeek, subDays } from 'date-fns'
import { type ColumnDef } from '@tanstack/react-table'
import { Icon } from '@iconify/react'
import { api } from '@/api/client'
import type { AttendanceDay, AttendanceSummary } from '@/api/types'
import { useLiveRefresh } from '@/context/RealtimeContext'
import { useAsync } from '@/hooks/useAsync'
import { PageHeader } from '@/components/PageHeader'
import {
  Button,
  ErrorState,
  Input,
  Select,
  Skeleton,
} from '@/components/ui/Primitives'
import { DataTable } from '@/components/ui/DataTable'
import { fmtDate, fmtDuration, fmtTime, isoDate, STATUS_LABEL, STATUS_TONE } from '@/lib/format'

type View = 'week' | 'month'

export default function Attendance() {
  const [view, setView] = useState<View>('week')
  const [anchor, setAnchor] = useState(new Date())
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  const { start, end } = useMemo(() => {
    if (view === 'week') {
      const monday = startOfWeek(anchor, { weekStartsOn: 1 })
      return { start: monday, end: addDays(monday, 6) }
    }
    return { start: subDays(anchor, 29), end: anchor }
  }, [view, anchor])

  const load = useCallback(async () => {
    try {
      const res = await api.get<AttendanceSummary>('/attendance/me', {
        start: isoDate(start),
        end: isoDate(end),
      })
      localStorage.setItem('dayflow.cache.attendance', JSON.stringify(res))
      return res
    } catch (err) {
      const cached = localStorage.getItem('dayflow.cache.attendance')
      if (cached) {
        return JSON.parse(cached) as AttendanceSummary
      }
      throw err
    }
  }, [start, end])

  const { data, loading, error, reload } = useAsync(load, [isoDate(start), isoDate(end)])

  useLiveRefresh(['attendance.checked_in', 'attendance.checked_out', 'attendance.updated', 'leave.approved'], reload)

  const shift = (direction: -1 | 1) =>
    setAnchor((current) => addDays(current, direction * (view === 'week' ? 7 : 30)))

  // Filtered attendance days
  const filteredDays = useMemo(() => {
    return (data?.days ?? []).filter((day) => {
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'WEEKEND' && day.status !== null) return false
        if (statusFilter !== 'WEEKEND' && day.status !== statusFilter) return false
      }
      if (!search.trim()) return true
      const q = search.toLowerCase()
      const dateStr = fmtDate(day.work_date, 'EEE d MMM yyyy').toLowerCase()
      const statusStr = day.status ? STATUS_LABEL[day.status].toLowerCase() : 'weekend'
      return dateStr.includes(q) || statusStr.includes(q)
    })
  }, [data?.days, statusFilter, search])

  // TanStack DataTable Columns
  const columns = useMemo<ColumnDef<AttendanceDay>[]>(
    () => [
      {
        accessorKey: 'work_date',
        header: 'Date',
        cell: ({ row }) => {
          const date = row.original.work_date
          return (
            <div>
              <p className="font-semibold text-ink text-xs">{fmtDate(date, 'EEE, d MMM yyyy')}</p>
              <p className="text-[11px] text-away">{fmtDate(date, 'yyyy-MM-dd')}</p>
            </div>
          )
        },
      },
      {
        accessorKey: 'check_in',
        header: 'Check In',
        cell: ({ row }) => {
          const checkIn = row.original.check_in
          return checkIn ? (
            <span className="text-xs font-semibold text-slate-700 tabular bg-slate-100/80 px-2 py-1 rounded-md">
              {fmtTime(checkIn)}
            </span>
          ) : (
            <span className="text-xs text-away">—</span>
          )
        },
      },
      {
        accessorKey: 'check_out',
        header: 'Check Out',
        cell: ({ row }) => {
          const { check_in, check_out } = row.original
          if (check_out) {
            return (
              <span className="text-xs font-semibold text-slate-700 tabular bg-slate-100/80 px-2 py-1 rounded-md">
                {fmtTime(check_out)}
              </span>
            )
          }
          if (check_in) {
            return (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </span>
            )
          }
          return <span className="text-xs text-away">—</span>
        },
      },
      {
        accessorKey: 'worked_minutes',
        header: 'Hours Worked',
        cell: ({ row }) => {
          const minutes = row.original.worked_minutes
          return (
            <span className="text-xs font-bold text-ink tabular">
              {minutes ? fmtDuration(minutes) : '0h 00m'}
            </span>
          )
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const st = row.original.status
          if (!st) {
            return (
              <span className="inline-flex items-center justify-center rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500 border border-slate-200/80 shadow-xs">
                Weekend / Off
              </span>
            )
          }
          if (st === 'PRESENT') {
            return (
              <span className="inline-flex items-center justify-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200/80 shadow-xs">
                Present
              </span>
            )
          }
          if (st === 'ABSENT') {
            return (
              <span className="inline-flex items-center justify-center rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 border border-rose-200/80 shadow-xs">
                Absent
              </span>
            )
          }
          return (
            <span className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-bold border shadow-xs ${STATUS_TONE[st].chip}`}>
              {STATUS_LABEL[st]}
            </span>
          )
        },
      },
    ],
    [],
  )

  return (
    <div className="space-y-6">
      {/* Header & Date Range Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader title="Your Attendance" />

        {/* View Mode & Date Range Controls */}
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {/* Week / Month Toggle */}
          <div className="inline-flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/60">
            <button
              type="button"
              onClick={() => {
                setView('week')
                setAnchor(new Date())
              }}
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                view === 'week' ? 'bg-white text-ink shadow-xs' : 'text-away hover:text-ink'
              }`}
            >
              <Icon icon="mdi:calendar-week-outline" className="h-3.5 w-3.5" />
              <span>Weekly</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setView('month')
                setAnchor(new Date())
              }}
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                view === 'month' ? 'bg-white text-ink shadow-xs' : 'text-away hover:text-ink'
              }`}
            >
              <Icon icon="mdi:calendar-month-outline" className="h-3.5 w-3.5" />
              <span>Monthly</span>
            </button>
          </div>

          {/* Date Shift Navigator */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-1 shadow-xs">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => shift(-1)}
              className="p-1 h-7 w-7"
              aria-label="Earlier period"
            >
              <Icon icon="mdi:chevron-left" className="h-4 w-4" />
            </Button>
            <p className="min-w-[10.5rem] text-center text-xs font-bold text-ink tabular px-1">
              {fmtDate(isoDate(start), 'd MMM')} – {fmtDate(isoDate(end), 'd MMM yyyy')}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => shift(1)}
              disabled={end >= new Date()}
              className="p-1 h-7 w-7"
              aria-label="Later period"
            >
              <Icon icon="mdi:chevron-right" className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Compact Bento Status Cards */}
      {data && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          {/* Present Card */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setStatusFilter('PRESENT')}
            className={`relative flex flex-col justify-between overflow-hidden rounded-xl border p-3.5 sm:p-4 transition-all cursor-pointer ${
              statusFilter === 'PRESENT'
                ? 'border-emerald-500 bg-emerald-50/20 ring-2 ring-emerald-500/20 shadow-xs'
                : 'border-slate-200/80 bg-white hover:border-emerald-200 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Present</span>
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
                <Icon icon="mdi:account-check-outline" className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-emerald-700">
                {data.present}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                Days Logged
              </span>
            </div>
          </div>

          {/* Half Days Card */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setStatusFilter('HALF_DAY')}
            className={`relative flex flex-col justify-between overflow-hidden rounded-xl border p-3.5 sm:p-4 transition-all cursor-pointer ${
              statusFilter === 'HALF_DAY'
                ? 'border-amber-500 bg-amber-50/20 ring-2 ring-amber-500/20 shadow-xs'
                : 'border-slate-200/80 bg-white hover:border-amber-200 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Half Days</span>
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-100 text-amber-700">
                <Icon icon="mdi:clock-alert-outline" className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-amber-700">
                {data.half_day}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600">
                Partial
              </span>
            </div>
          </div>

          {/* Absent Card */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setStatusFilter('ABSENT')}
            className={`relative flex flex-col justify-between overflow-hidden rounded-xl border p-3.5 sm:p-4 transition-all cursor-pointer ${
              statusFilter === 'ABSENT'
                ? 'border-rose-500 bg-rose-50/20 ring-2 ring-rose-500/20 shadow-xs'
                : 'border-slate-200/80 bg-white hover:border-rose-200 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Absent</span>
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-rose-100 text-rose-700">
                <Icon icon="mdi:account-remove-outline" className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-rose-700">
                {data.absent}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600">
                Off Duty
              </span>
            </div>
          </div>

          {/* Total Hours Card */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setStatusFilter('ALL')}
            className={`relative flex flex-col justify-between overflow-hidden rounded-xl border p-3.5 sm:p-4 transition-all cursor-pointer ${
              statusFilter === 'ALL'
                ? 'border-flow-500 bg-white ring-2 ring-flow-500/20 shadow-xs'
                : 'border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Hours Logged
              </span>
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-slate-700">
                <Icon icon="mdi:timer-outline" className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-ink">
                {data.total_hours}h
              </span>
              <span className="text-[11px] font-semibold text-flow-600">
                {data.attendance_rate}% Rate
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Controls Bar: Status Filter on Left, Search on Right */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        {/* Left Side: Status Filter */}
        <div className="flex items-center gap-2">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full text-xs font-medium sm:w-40"
          >
            <option value="ALL">All Statuses</option>
            <option value="PRESENT">Present Only</option>
            <option value="HALF_DAY">Half Day Only</option>
            <option value="ABSENT">Absent Only</option>
            <option value="WEEKEND">Weekends / Off</option>
          </Select>
        </div>

        {/* Right Side: Search Input */}
        <div className="relative w-full sm:w-64 md:w-72">
          <Icon
            icon="mdi:magnify"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-away"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search dates or status..."
            className="pl-10 text-xs py-2"
          />
        </div>
      </div>

      {/* Loading Skeletons */}
      {loading && !data && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            {[0, 1, 2, 3].map((n) => (
              <Skeleton key={n} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        </div>
      )}

      {/* Error state */}
      {error && <ErrorState message={error} onRetry={reload} />}

      {/* TanStack Data Table */}
      {data && (
        <DataTable
          columns={columns}
          data={filteredDays}
          totalCount={data.days.length}
          emptyMessage="No attendance records found for this period."
        />
      )}
    </div>
  )
}
