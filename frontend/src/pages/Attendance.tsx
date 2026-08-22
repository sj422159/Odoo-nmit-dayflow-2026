import { useCallback, useMemo, useState } from 'react'
import {
  ArrowUpDown,
  Calendar,
  Clock,
  Filter,
  Search,
  UserCheck,
} from 'lucide-react'
import { api } from '@/api/client'
import type { AttendanceSummary } from '@/api/types'
import { useLiveRefresh } from '@/context/RealtimeContext'
import { useAsync } from '@/hooks/useAsync'
import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'
import {
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  Input,
  Pill,
  Select,
  Skeleton,
} from '@/components/ui/Primitives'
import { fmtDate, fmtDuration, fmtTime, isoDate, STATUS_LABEL, STATUS_TONE } from '@/lib/format'

type SortField = 'work_date' | 'check_in' | 'worked_minutes' | 'status'
type SortOrder = 'asc' | 'desc'

export default function Attendance() {
  // Date range filters (default to current month)
  const today = new Date()
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  
  const [fromDate, setFromDate] = useState<string>(isoDate(firstDayOfMonth))
  const [toDate, setToDate] = useState<string>(isoDate(today))
  const [preset, setPreset] = useState<string>('THIS_MONTH')

  // Datatable state
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [sortField, setSortField] = useState<SortField>('work_date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [page, setPage] = useState(1)
  const pageSize = 15

  const load = useCallback(
    () =>
      api.get<AttendanceSummary>('/attendance/me', {
        start: fromDate,
        end: toDate,
      }),
    [fromDate, toDate],
  )

  const { data, loading, error, reload } = useAsync(load, [fromDate, toDate])
  useLiveRefresh(['attendance.checked_in', 'attendance.checked_out', 'attendance.updated', 'leave.approved'], reload)

  const applyPreset = (p: string) => {
    setPreset(p)
    setPage(1)
    const now = new Date()
    if (p === 'THIS_MONTH') {
      setFromDate(isoDate(new Date(now.getFullYear(), now.getMonth(), 1)))
      setToDate(isoDate(now))
    } else if (p === 'LAST_MONTH') {
      const firstLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
      setFromDate(isoDate(firstLastMonth))
      setToDate(isoDate(lastLastMonth))
    } else if (p === 'LAST_7_DAYS') {
      const d = new Date()
      d.setDate(d.getDate() - 7)
      setFromDate(isoDate(d))
      setToDate(isoDate(now))
    } else if (p === 'LAST_30_DAYS') {
      const d = new Date()
      d.setDate(d.getDate() - 30)
      setFromDate(isoDate(d))
      setToDate(isoDate(now))
    }
  }

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  // Filter items
  const days = data?.days ?? []
  const filteredDays = useMemo(() => {
    return days.filter((day) => {
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'WEEKEND' && day.status !== null) return false
        if (statusFilter !== 'WEEKEND' && day.status !== statusFilter) return false
      }
      if (search.trim()) {
        const q = search.toLowerCase()
        const dateStr = fmtDate(day.work_date, 'EEE d MMM yyyy').toLowerCase()
        const statusStr = day.status ? STATUS_LABEL[day.status].toLowerCase() : 'weekend'
        const checkInStr = day.check_in ? fmtTime(day.check_in).toLowerCase() : ''
        const checkOutStr = day.check_out ? fmtTime(day.check_out).toLowerCase() : ''
        const noteStr = day.note?.toLowerCase() ?? ''
        return (
          dateStr.includes(q) ||
          statusStr.includes(q) ||
          checkInStr.includes(q) ||
          checkOutStr.includes(q) ||
          noteStr.includes(q)
        )
      }
      return true
    })
  }, [days, statusFilter, search])

  // Sort items
  const sortedDays = useMemo(() => {
    return [...filteredDays].sort((a, b) => {
      let cmp = 0
      if (sortField === 'work_date') {
        cmp = new Date(a.work_date).getTime() - new Date(b.work_date).getTime()
      } else if (sortField === 'check_in') {
        const tA = a.check_in ? new Date(a.check_in).getTime() : 0
        const tB = b.check_in ? new Date(b.check_in).getTime() : 0
        cmp = tA - tB
      } else if (sortField === 'worked_minutes') {
        cmp = (a.worked_minutes ?? 0) - (b.worked_minutes ?? 0)
      } else if (sortField === 'status') {
        cmp = (a.status ?? 'WEEKEND').localeCompare(b.status ?? 'WEEKEND')
      }
      return sortOrder === 'asc' ? cmp : -cmp
    })
  }, [filteredDays, sortField, sortOrder])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedDays.length / pageSize))
  const paginatedDays = sortedDays.slice((page - 1) * pageSize, page * pageSize)

  return (
    <>
      <PageHeader
        title="Attendance Records"
        description="View your daily check-in times, worked duration, and presence history."
      />

      {/* Top Stat Cards */}
      {data && (
        <div className="mb-6 grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Present Days"
            value={data.present}
            tone="present"
            hint="Full days worked"
          />
          <StatCard
            label="Half Days"
            value={data.half_day}
            tone="pending"
            hint="Partial attendance"
          />
          <StatCard
            label="Absent Days"
            value={data.absent}
            tone="absent"
            hint="Unexcused absence"
          />
          <StatCard
            label="Total Hours Present"
            value={data.total_hours}
            unit="h"
            tone="flow"
            hint={`${data.attendance_rate}% attendance rate`}
          />
        </div>
      )}

      {loading && !data && (
        <div className="grid gap-4">
          <Skeleton className="h-14" />
          <Skeleton className="h-96" />
        </div>
      )}

      {error && <ErrorState message={error} onRetry={reload} />}

      {data && (
        <Card className="flex flex-col">
          <CardHeader
            title="Attendance Logs"
            subtitle={`Showing records from ${fmtDate(fromDate, 'd MMM yyyy')} to ${fmtDate(toDate, 'd MMM yyyy')}`}
          />

          {/* Date & Search Filters Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-150 p-4 bg-slate-50/50">
            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="flex items-center gap-1 text-xs font-semibold text-away mr-1">
                <Calendar className="h-3.5 w-3.5" /> Range:
              </div>
              {[
                { id: 'THIS_MONTH', label: 'This Month' },
                { id: 'LAST_MONTH', label: 'Last Month' },
                { id: 'LAST_30_DAYS', label: 'Last 30 Days' },
                { id: 'LAST_7_DAYS', label: 'Last 7 Days' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.id)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    preset === p.id
                      ? 'bg-flow-600 text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-ink-600 hover:bg-slate-100'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Date Pickers */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-away">From:</span>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value)
                  setPreset('CUSTOM')
                  setPage(1)
                }}
                className="py-1 text-xs font-medium max-w-[140px]"
              />
              <span className="text-xs font-semibold text-away">To:</span>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value)
                  setPreset('CUSTOM')
                  setPage(1)
                }}
                className="py-1 text-xs font-medium max-w-[140px]"
              />
            </div>
          </div>

          {/* Search & Status Filter Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-150 p-4 bg-white">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-away" />
              <input
                type="text"
                placeholder="Search by date, status, check-in time, or note..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-ink outline-none transition focus:border-flow-500 focus:ring-2 focus:ring-flow-500/20"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-xs font-semibold text-away">
                <Filter className="h-3.5 w-3.5" /> Status:
              </div>
              <Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setPage(1)
                }}
                className="py-1.5 text-xs font-semibold"
              >
                <option value="ALL">All Statuses</option>
                <option value="PRESENT">Present</option>
                <option value="HALF_DAY">Half Day</option>
                <option value="ABSENT">Absent</option>
                <option value="LEAVE">On Leave</option>
                <option value="WEEKEND">Weekend</option>
              </Select>
            </div>
          </div>

          {/* Datatable Body */}
          {paginatedDays.length === 0 ? (
            <EmptyState
              title="No attendance records found"
              description={search || statusFilter !== 'ALL' ? 'Try adjusting your search query or status filter.' : 'No attendance logs recorded in this date range.'}
              icon={<Clock className="h-7 w-7" />}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-150 bg-slate-100/70 text-xs uppercase font-semibold text-away">
                  <tr>
                    <th className="px-5 py-3.5 cursor-pointer select-none hover:text-ink" onClick={() => toggleSort('work_date')}>
                      <div className="flex items-center gap-1.5">
                        Date
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="px-5 py-3.5 cursor-pointer select-none hover:text-ink" onClick={() => toggleSort('check_in')}>
                      <div className="flex items-center gap-1.5">
                        Check-In
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="px-5 py-3.5">Check-Out</th>
                    <th className="px-5 py-3.5 cursor-pointer select-none hover:text-ink" onClick={() => toggleSort('worked_minutes')}>
                      <div className="flex items-center gap-1.5">
                        Time Present
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="px-5 py-3.5 cursor-pointer select-none hover:text-ink" onClick={() => toggleSort('status')}>
                      <div className="flex items-center gap-1.5">
                        Status
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="px-5 py-3.5">Notes & Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {paginatedDays.map((day) => (
                    <tr key={day.work_date} className="hover:bg-slate-50/80 transition">
                      <td className="px-5 py-4 font-semibold text-ink whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-away shrink-0" />
                          <span>{fmtDate(day.work_date, 'EEE, d MMM yyyy')}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-ink-600 font-medium tabular">
                        {day.check_in ? (
                          <div className="flex items-center gap-1.5 text-present">
                            <UserCheck className="h-3.5 w-3.5 shrink-0" />
                            {fmtTime(day.check_in)}
                          </div>
                        ) : (
                          <span className="text-away italic">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-ink-600 font-medium tabular">
                        {day.check_out ? (
                          <div className="flex items-center gap-1.5 text-ink">
                            <Clock className="h-3.5 w-3.5 text-away shrink-0" />
                            {fmtTime(day.check_out)}
                          </div>
                        ) : day.check_in ? (
                          <span className="text-xs font-semibold text-flow-600">Active Shift</span>
                        ) : (
                          <span className="text-away italic">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap font-bold text-ink tabular">
                        {day.worked_minutes ? (
                          <span>{fmtDuration(day.worked_minutes)}</span>
                        ) : (
                          <span className="text-away font-normal italic">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {day.status ? (
                          <Pill tone={STATUS_TONE[day.status].chip}>
                            {STATUS_LABEL[day.status]}
                          </Pill>
                        ) : (
                          <Pill tone="bg-slate-150 text-away">Weekend</Pill>
                        )}
                      </td>
                      <td className="px-5 py-4 text-ink-600 max-w-xs truncate">
                        {day.note ? (
                          <span>{day.note}</span>
                        ) : (
                          <span className="text-away italic">No notes</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Datatable Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-150 px-5 py-3 text-xs text-away">
              <div>
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, sortedDays.length)} of {sortedDays.length} records
              </div>
              <div className="flex items-center gap-1">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-ink-600 hover:bg-slate-150 disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="px-2 font-bold text-ink">{page} / {totalPages}</span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-ink-600 hover:bg-slate-150 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </Card>
      )}
    </>
  )
}
