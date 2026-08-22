import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { type ColumnDef } from '@tanstack/react-table'
import { Icon } from '@iconify/react'
import { api } from '@/api/client'
import type {
  ActivityEvent,
  Department,
  EmployeeActivityRow,
  PaginatedActivityHistory,
} from '@/api/types'
import { useAsync } from '@/hooks/useAsync'
import { PageHeader } from '@/components/PageHeader'
import {
  Button,
  EmptyState,
  ErrorState,
  Input,
  Pill,
  Select,
  Skeleton,
} from '@/components/ui/Primitives'
import { DataTable } from '@/components/ui/DataTable'
import { fmtDate, fmtTime, titleCase } from '@/lib/format'

export default function ActivityHistory() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [department, setDepartment] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [departments, setDepartments] = useState<Department[]>([])

  // Modal State for inspecting specific employee activity
  const [inspectEmployee, setInspectEmployee] = useState<EmployeeActivityRow | null>(null)
  const [detailEvents, setDetailEvents] = useState<ActivityEvent[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    api.get<Department[]>('/employees/departments').then(setDepartments).catch(() => setDepartments([]))
  }, [])

  const loadHistory = useCallback(
    () =>
      api.get<PaginatedActivityHistory>('/analytics/activity-history', {
        target_date: selectedDate,
        department: department || undefined,
        search: debouncedSearch || undefined,
        page,
        page_size: 50,
      }),
    [selectedDate, department, debouncedSearch, page],
  )

  const { data, loading, error, reload } = useAsync(loadHistory, [
    selectedDate,
    department,
    debouncedSearch,
    page,
  ])

  // Open modal & load detailed events for selected employee
  const openDetail = async (empRow: EmployeeActivityRow) => {
    setInspectEmployee(empRow)
    setLoadingEvents(true)
    try {
      const events = await api.get<ActivityEvent[]>(`/analytics/activity-history/${empRow.employee_id}`, {
        target_date: selectedDate,
      })
      setDetailEvents(events)
    } catch {
      setDetailEvents([])
    } finally {
      setLoadingEvents(false)
    }
  }

  // Column definitions for TanStack DataTable
  const columns = useMemo<ColumnDef<EmployeeActivityRow>[]>(
    () => [
      {
        accessorKey: 'full_name',
        header: 'Employee',
        cell: ({ row }) => {
          const emp = row.original
          return (
            <div className="flex items-center gap-3 min-w-0">
              {emp.avatar_url ? (
                <img
                  src={emp.avatar_url}
                  alt={emp.full_name}
                  className="h-8 w-8 rounded-full object-cover ring-2 ring-slate-100"
                />
              ) : (
                <span className="grid h-8 w-8 place-items-center rounded-full bg-flow-50 text-xs font-bold text-flow-700 ring-2 ring-slate-100">
                  {emp.full_name.charAt(0)}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">{emp.full_name}</p>
                <p className="truncate text-xs text-away">{emp.email}</p>
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: 'employee_code',
        header: 'Employee ID',
        cell: ({ row }) => (
          <span className="inline-block rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-mono font-bold text-slate-700">
            {row.original.employee_code || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'department',
        header: 'Department',
        cell: ({ row }) => (
          <div className="text-xs">
            <p className="font-semibold text-ink">{titleCase(row.original.department || 'Unassigned')}</p>
            <p className="text-away">{row.original.designation || 'Associate'}</p>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Date Status',
        cell: ({ row }) => {
          const status = row.original.status
          if (status === 'PRESENT') {
            return <Pill tone="bg-emerald-50 text-emerald-700">Present</Pill>
          }
          if (status === 'HALF_DAY') {
            return <Pill tone="bg-amber-50 text-amber-700">Half Day</Pill>
          }
          if (status === 'LEAVE') {
            return <Pill tone="bg-sky-50 text-sky-700">On Leave</Pill>
          }
          return <Pill tone="bg-rose-50 text-rose-700">Absent / No Check-in</Pill>
        },
      },
      {
        id: 'timestamps',
        header: 'Check In / Out',
        cell: ({ row }) => {
          const { check_in, check_out } = row.original
          if (!check_in && !check_out) {
            return <span className="text-xs text-away font-medium">—</span>
          }
          return (
            <div className="text-xs font-medium text-slate-700">
              <span>{check_in ? fmtTime(check_in) : '—'}</span>
              <span className="mx-1 text-slate-300">→</span>
              <span>{check_out ? fmtTime(check_out) : 'Pending'}</span>
            </div>
          )
        },
      },
      {
        accessorKey: 'activity_count',
        header: 'Logged Actions',
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700">
            <Icon icon="mdi:history" className="h-3.5 w-3.5 text-away" />
            {row.original.activity_count} activity logs
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="text-right">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => openDetail(row.original)}
              className="inline-flex items-center gap-1.5 text-xs"
            >
              <Icon icon="mdi:eye-outline" className="h-4 w-4 text-flow-600" />
              <span>View Activities</span>
            </Button>
          </div>
        ),
      },
    ],
    [],
  )

  const items = data?.items ?? []
  const totalEmployees = data?.total ?? 0
  const presentCount = items.filter((i) => i.status === 'PRESENT' || i.status === 'HALF_DAY').length
  const leaveCount = items.filter((i) => i.status === 'LEAVE').length

  return (
    <div className="space-y-6">
      {/* Header & Back Link */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            to="/admin/employees"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-flow-600 transition-colors mb-2"
          >
            <Icon icon="mdi:arrow-left" className="h-4 w-4" />
            <span>Back to Employees</span>
          </Link>
          <PageHeader
            title="Employee Activity History"
            description="Filter activities by date and department to view full employee audit trails."
          />
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Picker */}
          <div className="flex items-center gap-2">
            <label htmlFor="history-date" className="text-xs font-bold text-slate-600 whitespace-nowrap">
              Date:
            </label>
            <Input
              id="history-date"
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value)
                setPage(1)
              }}
              className="w-40 text-xs py-1.5"
            />
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="history-dept" className="text-xs font-bold text-slate-600 whitespace-nowrap">
              Department:
            </label>
            <Select
              id="history-dept"
              value={department}
              onChange={(e) => {
                setDepartment(e.target.value)
                setPage(1)
              }}
              className="w-44 text-xs font-medium py-1.5"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.name}>
                  {titleCase(dept.name)}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Icon
            icon="mdi:magnify"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-away"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee..."
            className="pl-9 text-xs py-1.5"
          />
        </div>
      </div>

      {/* Bento Summary Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Filtered Members</p>
          <p className="mt-1 text-2xl font-bold text-ink">{loading ? '—' : totalEmployees}</p>
          <p className="text-[11px] text-away mt-0.5">Selected date: {fmtDate(selectedDate, 'd MMMM yyyy')}</p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Checked In / Present</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{loading ? '—' : presentCount}</p>
          <p className="text-[11px] text-emerald-600 mt-0.5">Recorded arrival on date</p>
        </div>

        <div className="rounded-xl border border-sky-200 bg-sky-50/30 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-sky-700">On Approved Leave</p>
          <p className="mt-1 text-2xl font-bold text-sky-700">{loading ? '—' : leaveCount}</p>
          <p className="text-[11px] text-sky-600 mt-0.5">Official leave status on date</p>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && !data && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="space-y-3">
            {[0, 1, 2, 3, 4].map((n) => (
              <Skeleton key={n} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        </div>
      )}

      {/* Error state */}
      {error && <ErrorState message={error} onRetry={reload} />}

      {/* TanStack DataTable */}
      {data && (
        <DataTable
          columns={columns}
          data={items}
          totalCount={data.total}
          emptyMessage={`No employee activity found for ${fmtDate(selectedDate, 'd MMMM yyyy')}.`}
        />
      )}

      {/* Employee Activity Detail Modal */}
      {inspectEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-up">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-150 px-6 py-4 bg-slate-50/50">
              <div className="flex items-center gap-3">
                {inspectEmployee.avatar_url ? (
                  <img
                    src={inspectEmployee.avatar_url}
                    alt={inspectEmployee.full_name}
                    className="h-10 w-10 rounded-full object-cover ring-2 ring-flow-100"
                  />
                ) : (
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-flow-50 text-sm font-bold text-flow-700 ring-2 ring-flow-100">
                    {inspectEmployee.full_name.charAt(0)}
                  </span>
                )}
                <div>
                  <h3 className="font-bold text-ink text-base">{inspectEmployee.full_name}</h3>
                  <p className="text-xs text-away">
                    {inspectEmployee.employee_code || 'No Code'} · {inspectEmployee.designation} ({titleCase(inspectEmployee.department)})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectEmployee(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
              >
                <Icon icon="mdi:close" className="h-5 w-5" />
              </button>
            </div>

            {/* Date Summary Card */}
            <div className="border-b border-slate-150 px-6 py-3 bg-slate-50/30 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">
                Activity Date: {fmtDate(selectedDate, 'EEEE, d MMMM yyyy')}
              </span>
              <Pill tone="bg-slate-100 text-slate-700">
                {inspectEmployee.status || 'No Attendance Record'}
              </Pill>
            </div>

            {/* Event Timeline Content */}
            <div className="max-h-[26rem] overflow-y-auto p-6 space-y-4">
              {loadingEvents ? (
                <div className="space-y-3 py-4">
                  <Skeleton className="h-12 w-full rounded-xl" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                </div>
              ) : detailEvents.length === 0 ? (
                <EmptyState
                  title="No detailed events logged"
                  description="No check-ins, check-outs, or leave applications were recorded for this date."
                />
              ) : (
                <ol className="relative border-l border-slate-200 ml-3 space-y-6">
                  {detailEvents.map((evt) => (
                    <li key={evt.id} className="ml-6">
                      <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-white ring-4 ring-white border border-slate-200">
                        <Icon
                          icon={
                            evt.category === 'check_in'
                              ? 'mdi:login'
                              : evt.category === 'check_out'
                              ? 'mdi:logout'
                              : 'mdi:calendar-text'
                          }
                          className="h-3.5 w-3.5 text-flow-600"
                        />
                      </span>
                      <div className="rounded-xl border border-slate-150 p-3 bg-slate-50/40">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-ink">{evt.title}</p>
                          <span className="text-[10px] font-semibold text-away">
                            {fmtTime(evt.timestamp)}
                          </span>
                        </div>
                        {evt.description && (
                          <p className="mt-1 text-xs text-slate-600">{evt.description}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end border-t border-slate-150 px-6 py-3 bg-slate-50/50">
              <Button variant="secondary" size="sm" onClick={() => setInspectEmployee(null)}>
                Close History
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
