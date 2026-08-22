import { useCallback, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { type ColumnDef } from '@tanstack/react-table'
import { Icon } from '@iconify/react'
import { api } from '@/api/client'
import type { AttendanceDay, AttendanceSummary, MyPayroll, Payslip } from '@/api/types'
import { useLiveRefresh } from '@/context/RealtimeContext'
import { useAsync } from '@/hooks/useAsync'
import { PageHeader } from '@/components/PageHeader'
import {
  Button,
  ErrorState,
  Input,
  Skeleton,
} from '@/components/ui/Primitives'
import { DataTable } from '@/components/ui/DataTable'
import { fmtDate, fmtDuration, fmtMoney, fmtTime, monthName, STATUS_LABEL, STATUS_TONE } from '@/lib/format'

export default function Reports() {
  const location = useLocation()
  const isPayslip = location.pathname.includes('payslip')

  const [search, setSearch] = useState('')
  const [selectedSlip, setSelectedSlip] = useState<Payslip | null>(null)

  // Load employee payroll history and attendance records
  const load = useCallback(
    () =>
      Promise.all([
        api.get<MyPayroll>('/payroll/me'),
        api.get<AttendanceSummary>('/attendance/me/week'),
      ]),
    [],
  )

  const { data, loading, error, reload } = useAsync(load, [])
  useLiveRefresh(
    ['attendance.checked_in', 'attendance.checked_out', 'attendance.updated', 'payroll.run_completed'],
    reload,
  )

  const payroll = data?.[0]
  const attendance = data?.[1]

  const payslips = payroll?.payslips ?? []

  // Filtered Payslips for Report Table
  const filteredPayslips = useMemo(() => {
    return payslips.filter((slip) => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      const p = `${monthName(slip.period_month)} ${slip.period_year}`.toLowerCase()
      return p.includes(q)
    })
  }, [payslips, search])

  // Filtered Daily Records for Report Table
  const filteredDaily = useMemo(() => {
    return (attendance?.days ?? []).filter((day) => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      const dateStr = fmtDate(day.work_date, 'EEE d MMM yyyy').toLowerCase()
      const statusStr = day.status ? STATUS_LABEL[day.status].toLowerCase() : 'weekend'
      return dateStr.includes(q) || statusStr.includes(q)
    })
  }, [attendance?.days, search])

  // TanStack Columns for Payslip Report Table
  const payslipColumns = useMemo<ColumnDef<Payslip>[]>(
    () => [
      {
        id: 'period',
        header: 'Period / Month',
        accessorFn: (row) => `${monthName(row.period_month)} ${row.period_year}`,
        cell: ({ row }) => (
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-flow-50 text-flow-700 border border-flow-100">
              <Icon icon="mdi:file-document-outline" className="h-4 w-4" />
            </span>
            <div>
              <p className="font-semibold text-xs text-ink">
                {monthName(row.original.period_month)} {row.original.period_year}
              </p>
              <p className="text-[11px] text-away">Statement #{row.original.id}</p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'working_days',
        header: 'Work Days',
        cell: ({ row }) => (
          <span className="text-xs font-semibold text-ink tabular">
            {row.original.working_days} Days
          </span>
        ),
      },
      {
        accessorKey: 'paid_days',
        header: 'Paid Days',
        cell: ({ row }) => (
          <span className="text-xs font-semibold text-emerald-700 tabular bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
            {row.original.paid_days} Paid
          </span>
        ),
      },
      {
        accessorKey: 'lop_days',
        header: 'LOP / Unpaid',
        cell: ({ row }) => {
          const lop = Number(row.original.lop_days || 0)
          return lop > 0 ? (
            <span className="text-xs font-bold text-rose-600 tabular bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
              {lop} LOP
            </span>
          ) : (
            <span className="text-xs text-away tabular">0</span>
          )
        },
      },
      {
        accessorKey: 'gross',
        header: 'Gross Salary',
        cell: ({ row }) => (
          <span className="text-xs font-semibold text-slate-700 tabular">
            {fmtMoney(row.original.gross, row.original.currency)}
          </span>
        ),
      },
      {
        accessorKey: 'deductions',
        header: 'Deductions & Taxes',
        cell: ({ row }) => (
          <span className="text-xs font-semibold text-rose-600 tabular">
            -{fmtMoney(row.original.deductions, row.original.currency)}
          </span>
        ),
      },
      {
        accessorKey: 'net_pay',
        header: 'Net Take-Home',
        cell: ({ row }) => (
          <span className="inline-block font-bold text-xs text-emerald-700 tabular bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/80">
            {fmtMoney(row.original.net_pay, row.original.currency)}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: () => (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200/80">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
            Disbursed
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="text-right">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSelectedSlip(row.original)}
              className="inline-flex items-center gap-1 text-xs font-semibold"
            >
              <Icon icon="mdi:receipt-text-outline" className="h-3.5 w-3.5" />
              <span>Details</span>
            </Button>
          </div>
        ),
        enableSorting: false,
      },
    ],
    [],
  )

  // TanStack Columns for Attendance Report Table
  const attendanceColumns = useMemo<ColumnDef<AttendanceDay>[]>(
    () => [
      {
        accessorKey: 'work_date',
        header: 'Date & Day',
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
        id: 'shift',
        header: 'Shift Schedule',
        cell: () => (
          <span className="text-xs text-away tabular font-mono">
            09:00 – 18:00 (9h)
          </span>
        ),
      },
      {
        accessorKey: 'check_in',
        header: 'Check In',
        cell: ({ row }) => {
          const checkIn = row.original.check_in
          return checkIn ? (
            <span className="text-xs font-semibold text-slate-700 tabular bg-slate-100 px-2 py-1 rounded-md">
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
              <span className="text-xs font-semibold text-slate-700 tabular bg-slate-100 px-2 py-1 rounded-md">
                {fmtTime(check_out)}
              </span>
            )
          }
          if (check_in) {
            return (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active Shift
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
        header: 'Attendance Status',
        cell: ({ row }) => {
          const st = row.original.status
          if (!st) {
            return (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-500 border border-slate-200">
                Weekend
              </span>
            )
          }
          if (st === 'PRESENT') {
            return (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                Present
              </span>
            )
          }
          if (st === 'ABSENT') {
            return (
              <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700 border border-rose-200">
                Absent
              </span>
            )
          }
          return (
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border ${STATUS_TONE[st].chip}`}>
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
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <PageHeader
            title={isPayslip ? 'Payslip Report' : 'Attendance Report'}
            description={
              isPayslip
                ? 'Itemized tabular statement report of your monthly compensation, deductions, and net payouts.'
                : 'Detailed tabular report of your daily attendance, shift timings, and logged working hours.'
            }
          />
        </div>

        {/* Total Records Badge */}
        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 border border-slate-200 self-start sm:self-auto">
          Total: {isPayslip ? payslips.length : attendance?.days.length ?? 0} Records
        </span>
      </div>

      {/* Search Bar Controls */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-ink">
            {isPayslip ? 'Salary Statements Log' : 'Daily Shift Log'}
          </span>
        </div>

        <div className="relative w-full sm:w-64 md:w-72">
          <Icon
            icon="mdi:magnify"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-away"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isPayslip ? 'Search month or period...' : 'Search date or status...'}
            className="pl-10 text-xs py-2"
          />
        </div>
      </div>

      {/* Loading Skeletons */}
      {loading && !data && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            {[0, 1, 2, 3, 4].map((n) => (
              <Skeleton key={n} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        </div>
      )}

      {/* Error state */}
      {error && <ErrorState message={error} onRetry={reload} />}

      {/* ======================================================== */}
      {/* 1. ATTENDANCE REPORT TABULAR DATA TABLE                  */}
      {/* ======================================================== */}
      {!isPayslip && data && (
        <DataTable
          columns={attendanceColumns}
          data={filteredDaily}
          totalCount={attendance?.days.length ?? 0}
          emptyMessage="No attendance records found for this report period."
        />
      )}

      {/* ======================================================== */}
      {/* 2. PAYSLIP REPORT TABULAR DATA TABLE                     */}
      {/* ======================================================== */}
      {isPayslip && data && (
        <DataTable
          columns={payslipColumns}
          data={filteredPayslips}
          totalCount={payslips.length}
          emptyMessage="No payslip statement reports on file."
        />
      )}

      {/* ======================================================== */}
      {/* Payslip Details Modal                                    */}
      {/* ======================================================== */}
      {selectedSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div
            className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-2xl border border-slate-150"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-flow-50 text-flow-600 border border-flow-100">
                  <Icon icon="mdi:receipt-text-outline" className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-ink">Statement Breakdown</h3>
                  <p className="text-xs text-away">
                    {monthName(selectedSlip.period_month)} {selectedSlip.period_year} Report
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSlip(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <Icon icon="mdi:close" className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4">
              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200/80 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Period:</span>
                  <span className="font-bold text-ink">
                    {monthName(selectedSlip.period_month)} {selectedSlip.period_year}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Total Working Days:</span>
                  <span className="font-bold text-ink">{selectedSlip.working_days}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Credited Paid Days:</span>
                  <span className="font-bold text-emerald-700">{selectedSlip.paid_days}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Loss of Pay (LOP) Days:</span>
                  <span className="font-bold text-rose-600">{selectedSlip.lop_days}</span>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="font-medium text-slate-600">Gross Salary:</span>
                  <span className="font-semibold text-ink tabular">
                    {fmtMoney(selectedSlip.gross, selectedSlip.currency)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="font-medium text-slate-600">Statutory & Other Deductions:</span>
                  <span className="font-semibold text-rose-600 tabular">
                    -{fmtMoney(selectedSlip.deductions, selectedSlip.currency)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 bg-emerald-50/70 px-3 rounded-xl border border-emerald-200/80">
                  <span className="font-bold text-emerald-900">Net Take-Home Pay:</span>
                  <span className="font-extrabold text-base text-emerald-700 tabular">
                    {fmtMoney(selectedSlip.net_pay, selectedSlip.currency)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <Button
                  variant="secondary"
                  onClick={() => setSelectedSlip(null)}
                  className="text-xs"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
