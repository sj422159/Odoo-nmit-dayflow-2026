import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { type ColumnDef } from '@tanstack/react-table'
import { Icon } from '@iconify/react'
import { ApiError, api } from '@/api/client'
import type { Payslip, StructureRow } from '@/api/types'
import { useLiveRefresh } from '@/context/RealtimeContext'
import { useAsync } from '@/hooks/useAsync'
import { PageHeader } from '@/components/PageHeader'
import {
  Button,
  ErrorState,
  FormBanner,
  Input,
  Skeleton,
} from '@/components/ui/Primitives'
import { DataTable } from '@/components/ui/DataTable'
import { CorporatePayslipModal } from '@/components/CorporatePayslipModal'
import { fmtMoney, monthName, titleCase } from '@/lib/format'

const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

export default function PayrollAdmin() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [activeTab, setActiveTab] = useState<'PAYSLIPS' | 'STRUCTURES'>('PAYSLIPS')
  const [search, setSearch] = useState('')
  const [runBanner, setRunBanner] = useState<string | null>(null)
  const [runOk, setRunOk] = useState<string | null>(null)
  const [running, setRunning] = useState(false)

  // Modal for viewing payslip breakdown
  const [selectedSlip, setSelectedSlip] = useState<Payslip | null>(null)

  const loadStructures = useCallback(() => api.get<StructureRow[]>('/payroll/structures'), [])
  const {
    data: structures,
    loading: sLoading,
    error: sError,
    reload: reloadStructures,
  } = useAsync(loadStructures, [])

  const loadPayslips = useCallback(
    () => api.get<Payslip[]>('/payroll/payslips', { year, month }),
    [year, month],
  )
  const {
    data: payslips,
    loading: pLoading,
    error: pError,
    reload: reloadPayslips,
  } = useAsync(loadPayslips, [year, month])

  useLiveRefresh(['payroll.structure_updated', 'payroll.run_completed'], () => {
    reloadStructures()
    reloadPayslips()
  })

  const runPayroll = async () => {
    setRunBanner(null)
    setRunOk(null)
    setRunning(true)
    try {
      const result = await api.post<{
        payslips_created: number
        payslips_updated: number
        total_net: string
        currency: string
      }>('/payroll/run', { year, month })
      setRunOk(
        `Payroll computed — ${result.payslips_created} created, ${result.payslips_updated} updated. Total Net: ${fmtMoney(result.total_net, result.currency)}.`,
      )
      await reloadPayslips()
    } catch (err) {
      setRunBanner(err instanceof ApiError ? err.message : 'Could not run payroll for that period.')
    } finally {
      setRunning(false)
    }
  }

  // Filtered Payslips
  const filteredPayslips = useMemo(() => {
    return (payslips ?? []).filter((slip) => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      const name = slip.employee_name || ''
      const code = slip.employee_code || ''
      return name.toLowerCase().includes(q) || code.toLowerCase().includes(q)
    })
  }, [payslips, search])

  // Filtered Structures
  const filteredStructures = useMemo(() => {
    return (structures ?? []).filter((row) => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      const name = row.full_name || ''
      const code = row.employee_code || ''
      const dept = row.department || ''
      const des = row.designation || ''
      return (
        name.toLowerCase().includes(q) ||
        code.toLowerCase().includes(q) ||
        dept.toLowerCase().includes(q) ||
        des.toLowerCase().includes(q)
      )
    })
  }, [structures, search])

  // Bento Calculations
  const currency = payslips?.[0]?.currency || structures?.[0]?.salary?.currency || 'INR'
  const totalNet = useMemo(() => {
    return (payslips ?? []).reduce((acc, slip) => acc + Number(slip.net_pay || 0), 0)
  }, [payslips])
  const payslipsCount = payslips?.length ?? 0
  const structuresCount = structures?.length ?? 0
  const avgNet = payslipsCount > 0 ? totalNet / payslipsCount : 0

  // TanStack Columns for Payslips
  const payslipColumns = useMemo<ColumnDef<Payslip>[]>(
    () => [
      {
        accessorKey: 'employee_name',
        header: 'Employee',
        cell: ({ row }) => {
          const slip = row.original
          return (
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink hover:text-flow-600 transition-colors">
                {slip.employee_name}
              </p>
              <p className="truncate text-xs font-mono text-away">{slip.employee_code}</p>
            </div>
          )
        },
      },
      {
        id: 'period',
        header: 'Period',
        accessorFn: (row) => `${monthName(row.period_month)} ${row.period_year}`,
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
            <Icon icon="mdi:calendar-month-outline" className="h-3.5 w-3.5 text-slate-500" />
            {monthName(row.original.period_month)} {row.original.period_year}
          </span>
        ),
      },
      {
        id: 'attendance_days',
        header: 'Work Days',
        accessorFn: (row) => row.working_days,
        cell: ({ row }) => {
          const slip = row.original
          return (
            <div className="text-xs">
              <p className="font-semibold text-ink tabular">{slip.working_days} total days</p>
              <p className="text-[11px] text-away tabular">
                <span className="font-bold text-emerald-600">{slip.paid_days} paid</span> ·{' '}
                <span className="text-rose-600">{slip.lop_days} LOP</span>
              </p>
            </div>
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
        header: 'Deductions',
        cell: ({ row }) => (
          <span className="text-xs font-semibold text-rose-600 tabular">
            -{fmtMoney(row.original.deductions, row.original.currency)}
          </span>
        ),
      },
      {
        accessorKey: 'net_pay',
        header: 'Net Payable',
        cell: ({ row }) => (
          <span className="inline-block font-bold text-sm text-emerald-700 tabular bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/80">
            {fmtMoney(row.original.net_pay, row.original.currency)}
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
              <Icon icon="mdi:eye-outline" className="h-3.5 w-3.5" />
              <span>Details</span>
            </Button>
          </div>
        ),
        enableSorting: false,
      },
    ],
    [],
  )

  // TanStack Columns for Salary Structures
  const structureColumns = useMemo<ColumnDef<StructureRow>[]>(
    () => [
      {
        accessorKey: 'full_name',
        header: 'Employee',
        cell: ({ row }) => {
          const r = row.original
          return (
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink hover:text-flow-600 transition-colors">
                {r.full_name}
              </p>
              <p className="truncate text-xs text-away">
                {r.employee_code} · {r.designation} · {titleCase(r.department)}
              </p>
            </div>
          )
        },
      },
      {
        id: 'basic',
        header: 'Basic Pay',
        accessorFn: (row) => row.salary?.basic,
        cell: ({ row }) => {
          const sal = row.original.salary
          return (
            <span className="text-xs font-medium text-slate-700 tabular">
              {sal ? fmtMoney(sal.basic, sal.currency) : '—'}
            </span>
          )
        },
      },
      {
        id: 'hra',
        header: 'HRA',
        accessorFn: (row) => row.salary?.hra,
        cell: ({ row }) => {
          const sal = row.original.salary
          return (
            <span className="text-xs font-medium text-slate-700 tabular">
              {sal ? fmtMoney(sal.hra, sal.currency) : '—'}
            </span>
          )
        },
      },
      {
        id: 'allowances',
        header: 'Allowances',
        accessorFn: (row) => row.salary?.allowances,
        cell: ({ row }) => {
          const sal = row.original.salary
          return (
            <span className="text-xs font-medium text-slate-700 tabular">
              {sal ? fmtMoney(sal.allowances, sal.currency) : '—'}
            </span>
          )
        },
      },
      {
        id: 'deductions',
        header: 'Deductions',
        accessorFn: (row) => row.salary?.deductions,
        cell: ({ row }) => {
          const sal = row.original.salary
          return (
            <span className="text-xs font-medium text-rose-600 tabular">
              {sal ? `-${fmtMoney(sal.deductions, sal.currency)}` : '—'}
            </span>
          )
        },
      },
      {
        id: 'net_monthly',
        header: 'Net Monthly',
        accessorFn: (row) => row.salary?.net_monthly,
        cell: ({ row }) => {
          const sal = row.original.salary
          return sal ? (
            <span className="inline-block font-bold text-xs text-flow-700 tabular bg-flow-50 px-2.5 py-1 rounded-lg border border-flow-200/80">
              {fmtMoney(sal.net_monthly, sal.currency)} / mo
            </span>
          ) : (
            <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
              Not Configured
            </span>
          )
        },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="text-right">
            <Link
              to={`/admin/employees/${row.original.employee_id}`}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:border-slate-300 hover:bg-slate-50 transition-colors"
            >
              <Icon icon="mdi:pencil-outline" className="h-3.5 w-3.5" />
              <span>Edit</span>
            </Link>
          </div>
        ),
        enableSorting: false,
      },
    ],
    [],
  )

  return (
    <div className="space-y-6">
      {/* Header & Run Payroll Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader title="Payroll" />

        {/* Period Selector & Run Action Button (Strictly 1 Line) */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <select
            id="run-month"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-ink shadow-xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-flow-500/20 cursor-pointer"
          >
            {MONTHS.map((m) => (
              <option key={m} value={m}>
                {monthName(m)}
              </option>
            ))}
          </select>

          <select
            id="run-year"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-ink shadow-xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-flow-500/20 cursor-pointer"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <Button
            onClick={runPayroll}
            loading={running}
            className="flex items-center gap-1.5 text-xs font-bold shadow-xs whitespace-nowrap"
          >
            <Icon icon="mdi:play-circle-outline" className="h-4 w-4" />
            <span>Run Payroll</span>
          </Button>
        </div>
      </div>

      {/* Notifications / Banners */}
      <FormBanner message={runBanner} />
      {runOk && (
        <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 border border-emerald-200">
          <div className="flex items-center gap-2">
            <Icon icon="mdi:check-circle" className="h-4 w-4 text-emerald-600" />
            <span>{runOk}</span>
          </div>
          <button
            type="button"
            onClick={() => setRunOk(null)}
            className="text-emerald-600 hover:text-emerald-800"
          >
            <Icon icon="mdi:close" className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Compact Bento Status Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        {/* Total Net Disbursed Card */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setActiveTab('PAYSLIPS')}
          className={`relative flex flex-col justify-between overflow-hidden rounded-xl border p-3.5 sm:p-4 transition-all cursor-pointer ${
            activeTab === 'PAYSLIPS'
              ? 'border-emerald-500 bg-emerald-50/20 ring-2 ring-emerald-500/20 shadow-xs'
              : 'border-slate-200/80 bg-white hover:border-emerald-200 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Total Net Payout
            </span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
              <Icon icon="mdi:currency-usd" className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-emerald-700">
              {pLoading ? '—' : fmtMoney(totalNet, currency)}
            </span>
            <span className="text-[11px] font-semibold text-emerald-600">
              {monthName(month)}
            </span>
          </div>
        </div>

        {/* Payslips Generated Card */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setActiveTab('PAYSLIPS')}
          className={`relative flex flex-col justify-between overflow-hidden rounded-xl border p-3.5 sm:p-4 transition-all cursor-pointer ${
            activeTab === 'PAYSLIPS'
              ? 'border-flow-500 bg-white ring-2 ring-flow-500/20 shadow-xs'
              : 'border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Payslips Generated
            </span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-slate-700">
              <Icon icon="mdi:file-document-outline" className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-ink">
              {pLoading ? '—' : payslipsCount}
            </span>
            <span className="text-[11px] font-semibold text-away">Statements</span>
          </div>
        </div>

        {/* Salary Structures Enrolled Card */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setActiveTab('STRUCTURES')}
          className={`relative flex flex-col justify-between overflow-hidden rounded-xl border p-3.5 sm:p-4 transition-all cursor-pointer ${
            activeTab === 'STRUCTURES'
              ? 'border-flow-500 bg-flow-50/20 ring-2 ring-flow-500/20 shadow-xs'
              : 'border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Salary Structures
            </span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-slate-700">
              <Icon icon="mdi:cash-multiple" className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-slate-700">
              {sLoading ? '—' : structuresCount}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-away">
              Configured
            </span>
          </div>
        </div>

        {/* Average Net Pay Card */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Average Net Pay
            </span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-slate-700">
              <Icon icon="mdi:chart-timeline-variant-shimmer" className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-ink">
              {pLoading ? '—' : fmtMoney(avgNet, currency)}
            </span>
            <span className="text-[11px] font-semibold text-away">Per Employee</span>
          </div>
        </div>
      </div>

      {/* Controls Bar: View Toggle on Left, Search on Right */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        {/* Left Side: View Mode Tabs */}
        <div className="inline-flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/60 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('PAYSLIPS')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
              activeTab === 'PAYSLIPS'
                ? 'bg-white text-ink shadow-xs'
                : 'text-away hover:text-ink'
            }`}
          >
            <Icon icon="mdi:file-document-outline" className="h-3.5 w-3.5" />
            <span>Payslips ({payslipsCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('STRUCTURES')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
              activeTab === 'STRUCTURES'
                ? 'bg-white text-ink shadow-xs'
                : 'text-away hover:text-ink'
            }`}
          >
            <Icon icon="mdi:cash-multiple" className="h-3.5 w-3.5" />
            <span>Salary Structures ({structuresCount})</span>
          </button>
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

      {/* Loading Skeletons */}
      {activeTab === 'PAYSLIPS' && pLoading && !payslips && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            {[0, 1, 2, 3].map((n) => (
              <Skeleton key={n} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        </div>
      )}

      {activeTab === 'STRUCTURES' && sLoading && !structures && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            {[0, 1, 2, 3].map((n) => (
              <Skeleton key={n} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        </div>
      )}

      {/* Errors */}
      {activeTab === 'PAYSLIPS' && pError && (
        <ErrorState message={pError} onRetry={reloadPayslips} />
      )}
      {activeTab === 'STRUCTURES' && sError && (
        <ErrorState message={sError} onRetry={reloadStructures} />
      )}

      {/* Tab 1: Payslips Data Table */}
      {activeTab === 'PAYSLIPS' && !pLoading && !pError && (
        <DataTable
          columns={payslipColumns}
          data={filteredPayslips}
          totalCount={payslips?.length ?? 0}
          emptyMessage={`No payslips generated for ${monthName(month)} ${year}. Click "Run Payroll" above to compute statements.`}
        />
      )}

      {/* Tab 2: Salary Structures Data Table */}
      {activeTab === 'STRUCTURES' && !sLoading && !sError && (
        <DataTable
          columns={structureColumns}
          data={filteredStructures}
          totalCount={structures?.length ?? 0}
          emptyMessage="No salary structures found."
        />
      )}

      {/* Corporate Payslip Modal */}
      {selectedSlip && (
        <CorporatePayslipModal
          slip={selectedSlip}
          onClose={() => setSelectedSlip(null)}
        />
      )}
    </div>
  )
}
