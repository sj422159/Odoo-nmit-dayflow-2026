import { useCallback, useEffect, useMemo, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Icon } from '@iconify/react'
import { ApiError, api } from '@/api/client'
import type { AttendanceRecord, AttendanceStatus, Department } from '@/api/types'
import { useLiveRefresh } from '@/context/RealtimeContext'
import { useAsync } from '@/hooks/useAsync'
import { PageHeader } from '@/components/PageHeader'
import {
  Button,
  ErrorState,
  Field,
  FormBanner,
  Input,
  Select,
  Skeleton,
} from '@/components/ui/Primitives'
import { DataTable } from '@/components/ui/DataTable'
import { fmtDate, fmtDuration, fmtTime, STATUS_LABEL, STATUS_TONE, titleCase } from '@/lib/format'

export default function AttendanceBoard() {
  const [day, setDay] = useState(new Date())
  const [department, setDepartment] = useState('')
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | 'ALL'>('ALL')
  const [search, setSearch] = useState('')
  const [departments, setDepartments] = useState<Department[]>([])
  const [editing, setEditing] = useState<AttendanceRecord | null>(null)

  useEffect(() => {
    api.get<Department[]>('/employees/departments').then(setDepartments).catch(() => setDepartments([]))
  }, [])

  const isoDay = fmtDate(day.toISOString(), 'yyyy-MM-dd')

  const load = useCallback(
    () =>
      api.get<AttendanceRecord[]>('/attendance', {
        day: isoDay,
        department: department || undefined,
        attendance_status: statusFilter === 'ALL' ? undefined : statusFilter,
      }),
    [isoDay, department, statusFilter],
  )
  const { data, loading, error, reload } = useAsync(load, [isoDay, department, statusFilter])
  useLiveRefresh(['attendance.checked_in', 'attendance.checked_out', 'attendance.updated'], reload)

  // Filter items by client search
  const filteredItems = useMemo(() => {
    return (data ?? []).filter((rec) => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      const name = rec.employee_name || ''
      const code = rec.employee_code || ''
      const note = rec.note || ''
      return (
        name.toLowerCase().includes(q) ||
        code.toLowerCase().includes(q) ||
        note.toLowerCase().includes(q)
      )
    })
  }, [data, search])

  // Counts for Bento Cards
  const totalCount = data?.length ?? 0
  const presentCount = data?.filter((r) => r.status === 'PRESENT').length ?? 0
  const absentCount = data?.filter((r) => r.status === 'ABSENT').length ?? 0
  const leaveCount = data?.filter((r) => r.status === 'LEAVE' || r.status === 'HALF_DAY').length ?? 0

  // TanStack DataTable Columns
  const columns = useMemo<ColumnDef<AttendanceRecord>[]>(
    () => [
      {
        accessorKey: 'employee_name',
        header: 'Employee',
        cell: ({ row }) => {
          const rec = row.original
          return (
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink hover:text-flow-600 transition-colors">
                {rec.employee_name}
              </p>
              <p className="truncate text-xs font-mono text-away">{rec.employee_code}</p>
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
            <span className="text-xs font-semibold text-slate-700 tabular bg-slate-100/70 px-2 py-1 rounded-md">
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
              <span className="text-xs font-semibold text-slate-700 tabular bg-slate-100/70 px-2 py-1 rounded-md">
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
      {
        accessorKey: 'note',
        header: 'Note / Override',
        cell: ({ row }) => {
          const note = row.original.note
          return (
            <span className="text-xs text-slate-500 max-w-[200px] truncate block" title={note || undefined}>
              {note || '—'}
            </span>
          )
        },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="text-right">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setEditing(row.original)}
              className="inline-flex items-center gap-1 text-xs font-semibold"
            >
              <Icon icon="mdi:pencil-outline" className="h-3.5 w-3.5" />
              <span>Edit</span>
            </Button>
          </div>
        ),
        enableSorting: false,
      },
    ],
    [],
  )

  return (
    <div className="space-y-6">
      {/* Header & Date Switcher */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader title="Attendance" />

        {/* Interactive Calendar Date Picker */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <label className="relative flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer">
            <span className="grid h-6 w-6 place-items-center rounded-lg bg-flow-50 text-flow-600 border border-flow-100">
              <Icon icon="mdi:calendar-month" className="h-3.5 w-3.5" />
            </span>
            <span className="text-xs font-bold text-ink">
              {fmtDate(isoDay, 'EEE, d MMM yyyy')}
            </span>
            <Icon icon="mdi:calendar-cursor" className="h-4 w-4 text-away ml-1" />
            <input
              type="date"
              value={isoDay}
              max={fmtDate(new Date().toISOString(), 'yyyy-MM-dd')}
              onChange={(e) => {
                if (e.target.value) {
                  const [y, m, d] = e.target.value.split('-').map(Number)
                  setDay(new Date(y, m - 1, d))
                }
              }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              aria-label="Pick date from calendar"
            />
          </label>
          {isoDay !== fmtDate(new Date().toISOString(), 'yyyy-MM-dd') && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDay(new Date())}
              className="text-xs font-semibold"
            >
              Today
            </Button>
          )}
        </div>
      </div>

      {/* Compact Bento Status Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        {/* Total Records Card */}
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
              Total Logged
            </span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-slate-700">
              <Icon icon="mdi:calendar-check-outline" className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-ink">
              {loading && !data ? '—' : totalCount}
            </span>
            <span className="text-[11px] font-semibold text-away">Workforce</span>
          </div>
        </div>

        {/* Present Today Card */}
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
              {loading && !data ? '—' : presentCount}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
              On Duty
            </span>
          </div>
        </div>

        {/* Absent Today Card */}
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
              {loading && !data ? '—' : absentCount}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600">
              Off Duty
            </span>
          </div>
        </div>

        {/* Leave / Half Day Card */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setStatusFilter('LEAVE')}
          className={`relative flex flex-col justify-between overflow-hidden rounded-xl border p-3.5 sm:p-4 transition-all cursor-pointer ${
            statusFilter === 'LEAVE'
              ? 'border-amber-500 bg-amber-50/20 ring-2 ring-amber-500/20 shadow-xs'
              : 'border-slate-200/80 bg-white hover:border-amber-200 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Time Off</span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-100 text-amber-700">
              <Icon icon="mdi:calendar-clock-outline" className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-amber-700">
              {loading && !data ? '—' : leaveCount}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600">
              On Leave / Half Day
            </span>
          </div>
        </div>
      </div>

      {/* Controls Bar: Filters on Left, Search on Right */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        {/* Left Side: Department & Status Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full text-xs font-medium sm:w-44"
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.name}>
                {titleCase(dept.name)}
              </option>
            ))}
          </Select>

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AttendanceStatus | 'ALL')}
            className="w-full text-xs font-medium sm:w-36"
          >
            <option value="ALL">All Status</option>
            <option value="PRESENT">Present</option>
            <option value="ABSENT">Absent</option>
            <option value="HALF_DAY">Half Day</option>
            <option value="LEAVE">On Leave</option>
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
            placeholder="Search employee or code..."
            className="pl-10 text-xs py-2"
          />
        </div>
      </div>

      {/* Loading Skeleton */}
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

      {/* TanStack Data Table View */}
      {data && (
        <DataTable
          columns={columns}
          data={filteredItems}
          totalCount={data.length}
          emptyMessage="No attendance logs found for this day."
        />
      )}

      {/* Manual Attendance Override Modal */}
      {editing && (
        <CorrectionModal
          record={editing}
          workDate={isoDay}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            reload()
          }}
        />
      )}
    </div>
  )
}

function CorrectionModal({
  record,
  workDate,
  onClose,
  onSaved,
}: {
  record: AttendanceRecord
  workDate: string
  onClose: () => void
  onSaved: () => void
}) {
  const [status, setStatus] = useState<AttendanceStatus>(record.status)
  const [checkIn, setCheckIn] = useState(record.check_in ? record.check_in.slice(0, 16) : '')
  const [checkOut, setCheckOut] = useState(record.check_out ? record.check_out.slice(0, 16) : '')
  const [note, setNote] = useState(record.note ?? '')
  const [banner, setBanner] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    setBanner(null)
    try {
      await api.put('/attendance/record', {
        employee_id: record.employee_id,
        work_date: workDate,
        status,
        check_in: checkIn ? new Date(checkIn).toISOString() : null,
        check_out: checkOut ? new Date(checkOut).toISOString() : null,
        note: note || null,
      })
      onSaved()
    } catch (err) {
      setBanner(err instanceof ApiError ? err.message : 'Could not save that correction.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-md rounded-2xl border border-slate-150 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-flow-50 text-flow-600 border border-flow-100">
              <Icon icon="mdi:calendar-edit" className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-ink">Correct Record</h3>
              <p className="text-xs text-away">{record.employee_name} ({record.employee_code})</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <Icon icon="mdi:close" className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <FormBanner message={banner} />

          <Field label="Status" htmlFor="c-status">
            <Select
              id="c-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
              className="text-sm"
            >
              <option value="PRESENT">Present</option>
              <option value="HALF_DAY">Half Day</option>
              <option value="ABSENT">Absent</option>
              <option value="LEAVE">On Leave</option>
            </Select>
          </Field>

          <Field label="Check In" htmlFor="c-in">
            <Input
              id="c-in"
              type="datetime-local"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="text-sm"
            />
          </Field>

          <Field label="Check Out" htmlFor="c-out">
            <Input
              id="c-out"
              type="datetime-local"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="text-sm"
            />
          </Field>

          <Field label="Note / Reason" htmlFor="c-note" hint="Optional — visible in attendance logs.">
            <Input
              id="c-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={255}
              placeholder="e.g. Remote check-in approved"
              className="text-sm"
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="secondary" onClick={onClose} className="text-xs">
              Cancel
            </Button>
            <Button onClick={save} loading={saving} className="flex items-center gap-1.5 text-xs font-bold">
              <Icon icon="mdi:check" className="h-4 w-4" />
              <span>Save Correction</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
